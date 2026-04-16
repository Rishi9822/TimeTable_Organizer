import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserMenu } from '@/components/auth/UserMenu';
import NotificationBell from '@/components/notifications/NotificationBell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GraduationCap, Calendar, ClipboardCheck, Bell, FileText, BookOpen } from 'lucide-react';
import TeacherTimetableView from '@/components/teacher/TeacherTimetableView';
import TeacherAttendanceMarker from '@/components/teacher/TeacherAttendanceMarker';
import TeacherLeaveRequests from '@/components/teacher/TeacherLeaveRequests';
import TeacherAssignments from '@/components/teacher/TeacherAssignments';
import AnnouncementsList from '@/components/shared/AnnouncementsList';

const TeacherDashboard = () => {
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
                                <GraduationCap className="h-5 w-5 text-primary-foreground" />
                            </div>
                            <div>
                                <h1 className="text-lg font-semibold text-foreground">Teacher Dashboard</h1>
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
                <Tabs defaultValue="timetable" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
                        <TabsTrigger value="timetable" className="gap-2">
                            <Calendar className="h-4 w-4" />
                            <span className="hidden sm:inline">Timetable</span>
                        </TabsTrigger>
                        <TabsTrigger value="attendance" className="gap-2">
                            <ClipboardCheck className="h-4 w-4" />
                            <span className="hidden sm:inline">Attendance</span>
                        </TabsTrigger>
                        <TabsTrigger value="assignments" className="gap-2">
                            <BookOpen className="h-4 w-4" />
                            <span className="hidden sm:inline">Homework</span>
                        </TabsTrigger>
                        <TabsTrigger value="leave" className="gap-2">
                            <FileText className="h-4 w-4" />
                            <span className="hidden sm:inline">Leave</span>
                        </TabsTrigger>
                        <TabsTrigger value="announcements" className="gap-2">
                            <Bell className="h-4 w-4" />
                            <span className="hidden sm:inline">Notices</span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="timetable">
                        <TeacherTimetableView />
                    </TabsContent>
                    <TabsContent value="attendance">
                        <TeacherAttendanceMarker />
                    </TabsContent>
                    <TabsContent value="assignments">
                        <TeacherAssignments />
                    </TabsContent>
                    <TabsContent value="leave">
                        <TeacherLeaveRequests />
                    </TabsContent>
                    <TabsContent value="announcements">
                        <AnnouncementsList />
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
};

export default TeacherDashboard;
