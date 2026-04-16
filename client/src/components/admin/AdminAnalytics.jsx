import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Users, TrendingUp, Calendar } from 'lucide-react';
import { useInstitutionAttendance } from '@/hooks/useAttendance';
import { useStudents } from '@/hooks/useStudents';
import { useModeAwareTeachers, useModeAwareClasses } from '@/hooks/useModeAwareData';
import { useAllLeaveRequests } from '@/hooks/useLeaveRequests';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { Progress } from '@/components/ui/progress';

function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
}

const AdminAnalytics = () => {
    const thirtyDaysAgo = daysAgo(30);
    const today = new Date().toISOString().split('T')[0];

    const { data: attendance, isLoading: attLoading } = useInstitutionAttendance(thirtyDaysAgo, today);
    const { data: students } = useStudents();
    const { data: teachers } = useModeAwareTeachers();
    const { data: classes } = useModeAwareClasses();
    const { data: leaveRequests } = useAllLeaveRequests();
    const { data: announcements } = useAnnouncements();

    // Calculate attendance stats
    let totalPresent = 0, totalAbsent = 0, totalLate = 0;
    attendance?.forEach(att => {
        att.attendance_records?.forEach(rec => {
            if (rec.status === 'present') totalPresent++;
            else if (rec.status === 'absent') totalAbsent++;
            else if (rec.status === 'late') totalLate++;
        });
    });
    const totalEntries = totalPresent + totalAbsent + totalLate;
    const attendanceRate = totalEntries > 0 ? Math.round((totalPresent / totalEntries) * 100) : 0;

    const pendingLeaves = leaveRequests?.filter(l => l.status === 'pending').length || 0;

    if (attLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />)}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Analytics Overview</h3>
                <Badge variant="secondary">Last 30 days</Badge>
            </div>

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
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground">Total Students</p>
                                <p className="text-2xl font-bold text-foreground">{students?.length || 0}</p>
                            </div>
                            <Users className="h-8 w-8 text-muted-foreground" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground">Total Teachers</p>
                                <p className="text-2xl font-bold text-foreground">{teachers?.length || 0}</p>
                            </div>
                            <Users className="h-8 w-8 text-muted-foreground" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground">Total Classes</p>
                                <p className="text-2xl font-bold text-foreground">{classes?.length || 0}</p>
                            </div>
                            <Calendar className="h-8 w-8 text-muted-foreground" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardContent className="pt-6">
                        <h4 className="font-semibold text-foreground mb-4">Attendance Breakdown</h4>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Sessions Marked</span>
                                <span className="font-semibold text-foreground">{attendance?.length || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full bg-green-500" />
                                    <span className="text-sm text-muted-foreground">Present</span>
                                </div>
                                <span className="font-semibold text-foreground">{totalPresent}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full bg-destructive" />
                                    <span className="text-sm text-muted-foreground">Absent</span>
                                </div>
                                <span className="font-semibold text-foreground">{totalAbsent}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full bg-amber-500" />
                                    <span className="text-sm text-muted-foreground">Late</span>
                                </div>
                                <span className="font-semibold text-foreground">{totalLate}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <h4 className="font-semibold text-foreground mb-4">Quick Summary</h4>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Active Announcements</span>
                                <span className="font-semibold text-foreground">{announcements?.length || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Pending Leave Requests</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-foreground">{pendingLeaves}</span>
                                    {pendingLeaves > 0 && <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 text-xs">Action needed</Badge>}
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Total Leave Requests</span>
                                <span className="font-semibold text-foreground">{leaveRequests?.length || 0}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AdminAnalytics;
