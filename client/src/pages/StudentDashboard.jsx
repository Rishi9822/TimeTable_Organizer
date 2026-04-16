import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserMenu } from '@/components/auth/UserMenu';
import NotificationBell from '@/components/notifications/NotificationBell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Calendar, ClipboardCheck, Bell, Home, Settings, FileText } from 'lucide-react';
import StudentTimetableView from '@/components/student/StudentTimetableView';
import StudentAttendanceView from '@/components/student/StudentAttendanceView';
import DailyScheduleWidget from '@/components/student/DailyScheduleWidget';
import StudentAssignments from '@/components/student/StudentAssignments';
import StudentProfileSettings from '@/components/student/StudentProfileSettings';
import AnnouncementsList from '@/components/shared/AnnouncementsList';

const StudentDashboard = () => {
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl gradient-accent flex items-center justify-center">
                                <BookOpen className="h-5 w-5 text-accent-foreground" />
                            </div>
                            <div>
                                <h1 className="text-lg font-semibold text-foreground">Student Dashboard</h1>
                                <p className="text-xs text-muted-foreground">
                                    {user?.name || user?.email}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <NotificationBell />
                            <UserMenu />
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <Tabs defaultValue="today" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
                        <TabsTrigger value="today" className="gap-2">
                            <Home className="h-4 w-4" />
                            <span className="hidden sm:inline">Today</span>
                        </TabsTrigger>
                        <TabsTrigger value="timetable" className="gap-2">
                            <Calendar className="h-4 w-4" />
                            <span className="hidden sm:inline">Timetable</span>
                        </TabsTrigger>
                        <TabsTrigger value="attendance" className="gap-2">
                            <ClipboardCheck className="h-4 w-4" />
                            <span className="hidden sm:inline">Attendance</span>
                        </TabsTrigger>
                        <TabsTrigger value="assignments" className="gap-2">
                            <FileText className="h-4 w-4" />
                            <span className="hidden sm:inline">Homework</span>
                        </TabsTrigger>
                        <TabsTrigger value="announcements" className="gap-2">
                            <Bell className="h-4 w-4" />
                            <span className="hidden sm:inline">Notices</span>
                        </TabsTrigger>
                        <TabsTrigger value="profile" className="gap-2">
                            <Settings className="h-4 w-4" />
                            <span className="hidden sm:inline">Profile</span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="today">
                        <div className="grid gap-6 lg:grid-cols-2">
                            <DailyScheduleWidget />
                            <StudentAttendanceView compact />
                        </div>
                    </TabsContent>
                    <TabsContent value="timetable">
                        <StudentTimetableView />
                    </TabsContent>
                    <TabsContent value="attendance">
                        <StudentAttendanceView />
                    </TabsContent>
                    <TabsContent value="assignments">
                        <StudentAssignments />
                    </TabsContent>
                    <TabsContent value="announcements">
                        <AnnouncementsList />
                    </TabsContent>
                    <TabsContent value="profile">
                        <StudentProfileSettings />
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
};

export default StudentDashboard;
