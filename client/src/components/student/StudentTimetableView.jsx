import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, BookOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { useInstitutionContext } from '@/contexts/InstitutionContext';

const StudentTimetableView = () => {
    const { user } = useAuth();
    const { config } = useInstitutionContext();

    const { data: student, isLoading: studentLoading } = useQuery({
        queryKey: ['my-student', user?.id],
        queryFn: async () => {
            const { data } = await api.get('/students/me');
            return data;
        },
        enabled: !!user,
        retry: false,
    });

    const classId = student?.classId || student?.class_id;
    const classObj = typeof student?.classId === 'object' ? student.classId : null;

    const { data: entries, isLoading: entriesLoading } = useQuery({
        queryKey: ['student-timetable-entries', classId],
        queryFn: async () => {
            const cId = typeof classId === 'object' ? (classId._id || classId.id) : classId;
            const { data } = await api.get(`/timetables/class/${cId}`);
            return data || [];
        },
        enabled: !!classId,
    });

    if (studentLoading || entriesLoading) {
        return <Skeleton className="h-64" />;
    }

    if (!student) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium text-foreground">No Student Profile Found</p>
                    <p className="text-sm text-muted-foreground">
                        Your account is not linked to a student profile yet. Contact your admin.
                    </p>
                </CardContent>
            </Card>
        );
    }

    const workingDays = config.workingDays?.length ? config.workingDays : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const periodsPerDay = config.periodsPerDay || 8;
    const periods = Array.from({ length: periodsPerDay }, (_, i) => i + 1);

    // Build lookup: day -> period -> entry
    const grid = {};
    workingDays.forEach(day => { grid[day] = {}; });
    entries?.forEach((entry) => {
        const dayKey = entry.day_of_week || entry.dayOfWeek;
        const periodKey = entry.period_number || entry.periodNumber;
        if (grid[dayKey]) {
            grid[dayKey][periodKey] = entry;
        }
    });

    const hasEntries = (entries?.length || 0) > 0;

    const getSubject = (entry) => entry.subjects || entry.subject || (typeof entry.subjectId === 'object' ? entry.subjectId : null);
    const getTeacher = (entry) => entry.teachers || entry.teacher || (typeof entry.teacherId === 'object' ? entry.teacherId : null);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold text-foreground">My Timetable</h2>
                </div>
                <span className="text-sm text-muted-foreground">
                    Class: {classObj?.name || ''}{' '}
                    {classObj?.section && `- ${classObj.section}`}
                </span>
            </div>

            {!hasEntries ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium text-foreground">No Timetable Available</p>
                        <p className="text-sm text-muted-foreground">Your class timetable hasn't been created yet.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr>
                                <th className="border border-border bg-muted/50 px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                                    Day / Period
                                </th>
                                {periods.map(p => (
                                    <th key={p} className="border border-border bg-muted/50 px-3 py-2 text-center text-xs font-medium text-muted-foreground min-w-[100px]">
                                        P{p}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {workingDays.map(day => (
                                <tr key={day}>
                                    <td className="border border-border bg-muted/30 px-3 py-2 font-medium text-foreground text-xs whitespace-nowrap">
                                        {day}
                                    </td>
                                    {periods.map(p => {
                                        const entry = grid[day]?.[p];
                                        const subj = entry ? getSubject(entry) : null;
                                        const teach = entry ? getTeacher(entry) : null;
                                        return (
                                            <td key={p} className="border border-border px-2 py-1.5 text-center">
                                                {entry ? (
                                                    <div className="space-y-0.5">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <div
                                                                className="h-2 w-2 rounded-full shrink-0"
                                                                style={{ backgroundColor: subj?.color || 'hsl(var(--primary))' }}
                                                            />
                                                            <span className="text-xs font-medium text-foreground truncate">
                                                                {subj?.code || subj?.name || ''}
                                                            </span>
                                                        </div>
                                                        <p className="text-[10px] text-muted-foreground truncate">
                                                            {teach?.name || 'TBA'}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground/40">—</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default StudentTimetableView;
