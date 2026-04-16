import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, BookOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { useInstitutionContext } from '@/contexts/InstitutionContext';
import { Badge } from '@/components/ui/badge';

const TeacherTimetableView = () => {
    const { user } = useAuth();
    const { config } = useInstitutionContext();

    const { data: teacher, isLoading: teacherLoading } = useQuery({
        queryKey: ['my-teacher', user?.id],
        queryFn: async () => {
            const { data } = await api.get('/teachers/me');
            return data;
        },
        enabled: !!user,
        retry: false,
    });

    // Fetch all timetable entries for this teacher
    const { data: entries, isLoading: entriesLoading } = useQuery({
        queryKey: ['teacher-timetable-entries', teacher?.id || teacher?._id],
        queryFn: async () => {
            const teacherId = teacher?._id || teacher?.id;
            const { data } = await api.get(`/timetables/teacher/${teacherId}`);
            return data || [];
        },
        enabled: !!(teacher?.id || teacher?._id),
    });

    if (teacherLoading || entriesLoading) {
        return <Skeleton className="h-64" />;
    }

    if (!teacher) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium text-foreground">No Teacher Profile Found</p>
                    <p className="text-sm text-muted-foreground">
                        Your account is not linked to a teacher profile yet. Contact your admin.
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
    const totalPeriods = entries?.length || 0;
    const uniqueClasses = new Set(entries?.map((e) => e.class_id || e.classId)).size;

    const getSubject = (entry) => entry.subjects || entry.subject || entry.subjectId;
    const getClass = (entry) => entry.classes || entry.class || entry.classId;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold text-foreground">My Teaching Schedule</h2>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline">{totalPeriods} periods/week</Badge>
                    <Badge variant="outline">{uniqueClasses} classes</Badge>
                </div>
            </div>

            {!hasEntries ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium text-foreground">No Schedule Available</p>
                        <p className="text-sm text-muted-foreground">Your teaching schedule hasn't been created yet.</p>
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
                                    <th key={p} className="border border-border bg-muted/50 px-3 py-2 text-center text-xs font-medium text-muted-foreground min-w-[110px]">
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
                                        const cls = entry ? getClass(entry) : null;
                                        return (
                                            <td key={p} className="border border-border px-2 py-1.5 text-center">
                                                {entry ? (
                                                    <div className="space-y-0.5">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <div
                                                                className="h-2 w-2 rounded-full shrink-0"
                                                                style={{ backgroundColor: (typeof subj === 'object' ? subj?.color : null) || 'hsl(var(--primary))' }}
                                                            />
                                                            <span className="text-xs font-medium text-foreground truncate">
                                                                {typeof subj === 'object' ? (subj?.code || subj?.name) : ''}
                                                            </span>
                                                        </div>
                                                        <p className="text-[10px] text-muted-foreground truncate">
                                                            {typeof cls === 'object' ? `${cls?.name || ''}${cls?.section ? ` ${cls.section}` : ''}` : ''}
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

            <Card className="bg-primary/5 border-primary/20">
                <CardContent className="py-4">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Periods/Week</p>
                            <p className="text-2xl font-bold text-foreground">{totalPeriods}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Classes</p>
                            <p className="text-2xl font-bold text-foreground">{uniqueClasses}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Max Periods/Day</p>
                            <p className="text-2xl font-bold text-foreground">{teacher.max_periods_per_day || 6}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default TeacherTimetableView;
