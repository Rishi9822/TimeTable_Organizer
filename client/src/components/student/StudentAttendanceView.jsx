import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck, Check, X, Clock, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

const StudentAttendanceView = ({ compact = false }) => {
    const { user } = useAuth();

    // Get student record
    const { data: student } = useQuery({
        queryKey: ['my-student', user?.id],
        queryFn: async () => {
            const { data } = await api.get('/students/me');
            return data;
        },
        enabled: !!user,
        retry: false,
    });

    const studentId = student?._id || student?.id;

    // Get attendance records for this student
    const { data: records, isLoading } = useQuery({
        queryKey: ['my-attendance', studentId],
        queryFn: async () => {
            const { data } = await api.get(`/attendance/student/${studentId}`);
            return data || [];
        },
        enabled: !!studentId,
    });

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-24" />
                <Skeleton className="h-40" />
            </div>
        );
    }

    if (!student) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <ClipboardCheck className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium text-foreground">No Student Profile</p>
                    <p className="text-sm text-muted-foreground">Contact your admin to link your account.</p>
                </CardContent>
            </Card>
        );
    }

    const totalRecords = records?.length || 0;
    const presentCount = records?.filter(r => r.status === 'present').length || 0;
    const absentCount = records?.filter(r => r.status === 'absent').length || 0;
    const lateCount = records?.filter(r => r.status === 'late').length || 0;
    const attendanceRate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">My Attendance</h2>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground">Attendance Rate</p>
                                <p className="text-2xl font-bold text-foreground">{attendanceRate}%</p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-primary" />
                        </div>
                        <Progress value={attendanceRate} className="mt-3 h-2" />
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-xs text-muted-foreground">Present</p>
                        <p className="text-2xl font-bold text-green-600">{presentCount}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-xs text-muted-foreground">Absent</p>
                        <p className="text-2xl font-bold text-destructive">{absentCount}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-xs text-muted-foreground">Late</p>
                        <p className="text-2xl font-bold text-amber-600">{lateCount}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Records */}
            {!compact && (
                <Card>
                    <CardContent className="pt-6">
                        <h3 className="font-semibold text-foreground mb-4">Recent Attendance</h3>
                        {!records?.length ? (
                            <p className="text-sm text-muted-foreground text-center py-8">No attendance records yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {records.slice(0, 20).map((record) => {
                                    const att = record.attendance || record.attendanceId || {};
                                    const subj = att.subjects || att.subject || (typeof att.subjectId === 'object' ? att.subjectId : null);
                                    const recordId = record._id || record.id;

                                    return (
                                        <div key={recordId} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50">
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm text-muted-foreground">
                                                    {att.date || 'N/A'}
                                                </span>
                                                {subj?.name && (
                                                    <div className="flex items-center gap-1.5">
                                                        <div
                                                            className="h-2.5 w-2.5 rounded-full"
                                                            style={{ backgroundColor: subj.color || 'hsl(var(--primary))' }}
                                                        />
                                                        <span className="text-sm text-foreground">{subj.name}</span>
                                                    </div>
                                                )}
                                                {att.period && (
                                                    <span className="text-xs text-muted-foreground">P{att.period}</span>
                                                )}
                                            </div>
                                            <Badge
                                                className={
                                                    record.status === 'present'
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                        : record.status === 'absent'
                                                            ? 'bg-destructive text-destructive-foreground'
                                                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                                                }
                                            >
                                                {record.status === 'present' && <Check className="h-3 w-3 mr-1" />}
                                                {record.status === 'absent' && <X className="h-3 w-3 mr-1" />}
                                                {record.status === 'late' && <Clock className="h-3 w-3 mr-1" />}
                                                {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                                            </Badge>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default StudentAttendanceView;
