import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, Timer, CalendarDays } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { useInstitutionContext } from '@/contexts/InstitutionContext';
import { useAcademicCalendar } from '@/hooks/useAcademicCalendar';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DailyScheduleWidget = () => {
    const { user } = useAuth();
    const { config } = useInstitutionContext();

    const today = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
    const todayDate = new Date().toISOString().split('T')[0];

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

    const classId = student?.classId || student?.class_id;

    // Get today's timetable entries
    const { data: todayEntries, isLoading } = useQuery({
        queryKey: ['today-schedule', classId, today],
        queryFn: async () => {
            const { data } = await api.get(`/timetables/class/${classId}?day=${today}`);
            return data || [];
        },
        enabled: !!classId,
    });

    // Check for holidays via academic calendar
    const { data: calendarEvents } = useAcademicCalendar();

    const todayHoliday = useMemo(() => {
        if (!calendarEvents?.length) return null;
        return calendarEvents.find(ev => {
            const start = new Date(ev.startDate || ev.start_date);
            const end = new Date(ev.endDate || ev.end_date);
            const now = new Date(todayDate);
            return now >= start && now <= end && ev.blocksTimetable;
        });
    }, [calendarEvents, todayDate]);

    // Calculate current period based on time
    const currentPeriodInfo = useMemo(() => {
        if (!config.startTime || !config.periodDuration) return null;

        const now = new Date();
        const [startH, startM] = config.startTime.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        let elapsed = currentMinutes - startMinutes;
        if (elapsed < 0) return { status: 'before', nextPeriod: 1, minutesUntil: -elapsed };

        let accum = 0;
        const breaks = config.breaks || [];

        for (let i = 1; i <= config.periodsPerDay; i++) {
            const periodStart = accum;
            const periodEnd = accum + config.periodDuration;

            if (elapsed >= periodStart && elapsed < periodEnd) {
                const remaining = periodEnd - elapsed;
                return { status: 'in_class', currentPeriod: i, minutesRemaining: remaining };
            }

            accum = periodEnd;

            const breakAfter = breaks.find(b => b.afterPeriod === i);
            if (breakAfter) {
                const breakEnd = accum + breakAfter.duration;
                if (elapsed >= accum && elapsed < breakEnd) {
                    return { status: 'break', breakLabel: breakAfter.label, nextPeriod: i + 1, minutesUntil: breakEnd - elapsed };
                }
                accum = breakEnd;
            }
        }

        return { status: 'after' };
    }, [config]);

    if (isLoading) {
        return <Skeleton className="h-48" />;
    }

    const isHoliday = !!todayHoliday;
    const isWeekend = !config.workingDays?.includes(today);

    if (!student) return null;

    const getSubject = (entry) => entry.subjects || entry.subject || (typeof entry.subjectId === 'object' ? entry.subjectId : null);
    const getTeacher = (entry) => entry.teachers || entry.teacher || (typeof entry.teacherId === 'object' ? entry.teacherId : null);

    return (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CalendarDays className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold text-foreground">Today's Schedule</h3>
                    </div>
                    <Badge variant="outline" className="text-xs">{today}</Badge>
                </div>

                {isHoliday ? (
                    <div className="text-center py-6">
                        <p className="text-lg font-medium text-foreground">🎉 Holiday Today!</p>
                        <p className="text-sm text-muted-foreground">{todayHoliday?.title}</p>
                    </div>
                ) : isWeekend ? (
                    <div className="text-center py-6">
                        <p className="text-lg font-medium text-foreground">📅 No Classes Today</p>
                        <p className="text-sm text-muted-foreground">Enjoy your weekend!</p>
                    </div>
                ) : !todayEntries?.length ? (
                    <div className="text-center py-6">
                        <p className="text-sm text-muted-foreground">No timetable set for today</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {currentPeriodInfo?.status === 'in_class' && (
                            <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm">
                                <Timer className="h-4 w-4 text-primary animate-pulse" />
                                <span className="text-primary font-medium">
                                    Period {currentPeriodInfo.currentPeriod} — {currentPeriodInfo.minutesRemaining} min remaining
                                </span>
                            </div>
                        )}
                        {currentPeriodInfo?.status === 'break' && (
                            <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">
                                    {currentPeriodInfo.breakLabel} — {currentPeriodInfo.minutesUntil} min until next class
                                </span>
                            </div>
                        )}

                        {todayEntries.map((entry) => {
                            const periodNum = entry.period_number || entry.periodNumber;
                            const isCurrent = currentPeriodInfo?.status === 'in_class' && currentPeriodInfo.currentPeriod === periodNum;
                            const subj = getSubject(entry);
                            const teach = getTeacher(entry);

                            return (
                                <div
                                    key={entry._id || entry.id}
                                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${isCurrent ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/50'}`}
                                >
                                    <span className="text-xs font-mono text-muted-foreground w-6">P{periodNum}</span>
                                    <div
                                        className="h-3 w-3 rounded-full shrink-0"
                                        style={{ backgroundColor: subj?.color || 'hsl(var(--primary))' }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">{subj?.name || 'Subject'}</p>
                                        <p className="text-xs text-muted-foreground">{teach?.name || 'TBA'}</p>
                                    </div>
                                    {isCurrent && (
                                        <Badge className="bg-primary text-primary-foreground text-[10px]">Now</Badge>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default DailyScheduleWidget;
