import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useToast } from "@/hooks/useToast";
import API from "@/lib/api";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LayoutGrid, Users, GraduationCap, ArrowRight, Settings, FileText,
  Megaphone, BarChart3, CalendarDays, RefreshCw, BookOpen, Calendar
} from "lucide-react";

// Admin sub-panels
import AdminStudentsPanel from "@/components/admin/AdminStudentsPanel";
import AdminTeachersPanel from "@/components/admin/AdminTeachersPanel";
import AdminAnnouncementsPanel from "@/components/admin/AdminAnnouncementsPanel";
import AdminLeaveManagement from "@/components/admin/AdminLeaveManagement";
import AdminAnalytics from "@/components/admin/AdminAnalytics";
import AdminAcademicCalendar from "@/components/admin/AdminAcademicCalendar";
import AdminSubstitutions from "@/components/admin/AdminSubstitutions";

// Shared components
import InviteCodesCard from "@/components/admin/InviteCodesCard";
import InstitutionPlanCard from "@/components/admin/InstitutionPlanCard";
import PlanUpgradeActions from "@/components/admin/PlanUpgradeActions";
import { SecondSetupPrompt } from "@/components/subscription/SecondSetupPrompt";
import { TrialBanner } from "@/components/subscription/TrialBanner";
import { ModeSwitcher } from "@/components/subscription/ModeSwitcher";
import NotificationBell from "@/components/notifications/NotificationBell";
import { UserMenu } from "@/components/auth/UserMenu";

const AdminDashboard = () => {
  const { user } = useAuth();
  const { plan } = useSubscription();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Stripe session verification
  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    const canceled = searchParams.get("canceled");

    if (canceled === "true") {
      toast({
        title: "Payment canceled",
        description: "Your payment was canceled. You can try again anytime.",
        variant: "default",
      });
      setSearchParams({}, { replace: true });
      return;
    }

    if (sessionId) {
      const verifySession = async () => {
        try {
          const { data } = await API.get(`/stripe/verify-session?session_id=${sessionId}`);
          if (data.success) {
            await queryClient.invalidateQueries({ queryKey: ["institutionInfo"] });
            await queryClient.refetchQueries({ queryKey: ["institutionInfo"] });
            toast({
              title: "Payment successful!",
              description: `Your plan has been upgraded to ${data.institution.plan}.`,
            });
            setTimeout(() => { window.location.reload(); }, 1500);
          }
        } catch (error) {
          console.error("Failed to verify session:", error);
          await queryClient.invalidateQueries({ queryKey: ["institutionInfo"] });
          toast({ title: "Verifying payment...", description: "Plan should update shortly." });
          setTimeout(() => { window.location.reload(); }, 2000);
        } finally {
          setSearchParams({}, { replace: true });
        }
      };
      verifySession();
    }
  }, [searchParams, queryClient, toast, setSearchParams]);

  return (
    <div className="min-h-screen bg-background">
      {/* Trial Banner */}
      <TrialBanner />

      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                <Calendar className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">Admin Dashboard</h1>
                <p className="text-xs text-muted-foreground">
                  {user?.name || user?.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ModeSwitcher />
              <NotificationBell />
              <UserMenu />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Welcome */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground">
            Welcome back{user?.name ? `, ${user.name}` : ""}!
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage your institution from one place.
          </p>
        </div>

        {/* Flex plan second-mode setup prompt */}
        <SecondSetupPrompt />

        {/* 8-Tab Interface */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1 rounded-lg">
            <TabsTrigger value="overview" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="students" className="gap-2">
              <GraduationCap className="h-4 w-4" />
              <span className="hidden sm:inline">Students</span>
            </TabsTrigger>
            <TabsTrigger value="teachers" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Teachers</span>
            </TabsTrigger>
            <TabsTrigger value="announcements" className="gap-2">
              <Megaphone className="h-4 w-4" />
              <span className="hidden sm:inline">Announcements</span>
            </TabsTrigger>
            <TabsTrigger value="leave" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Leave</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">Calendar</span>
            </TabsTrigger>
            <TabsTrigger value="substitutes" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Substitutes</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Overview */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Timetable Builder */}
              <Card className="md:col-span-2 lg:col-span-1 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-2">
                    <LayoutGrid className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <CardTitle>Timetable Builder</CardTitle>
                  <CardDescription>
                    Create and manage class schedules with drag-and-drop
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link to="/builder">
                    <Button className="w-full gap-2" size="lg">
                      Open Builder
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Teachers */}
              <Card>
                <CardHeader>
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mb-2">
                    <Users className="h-5 w-5 text-secondary-foreground" />
                  </div>
                  <CardTitle className="text-lg">Teachers</CardTitle>
                  <CardDescription>
                    Manage teachers and their subject assignments
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link to="/teachers">
                    <Button variant="outline" className="w-full">
                      Manage Teachers
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Settings */}
              <Card>
                <CardHeader>
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mb-2">
                    <Settings className="h-5 w-5 text-secondary-foreground" />
                  </div>
                  <CardTitle className="text-lg">Settings</CardTitle>
                  <CardDescription>
                    Update institution settings and schedule
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link to="/setup">
                    <Button variant="outline" className="w-full">
                      Edit Settings
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Invite Codes */}
              <InviteCodesCard />

              {/* Plan & Status */}
              <InstitutionPlanCard />

              {/* Plan Upgrade Actions */}
              <PlanUpgradeActions />
            </div>
          </TabsContent>

          {/* Tab 2: Students */}
          <TabsContent value="students">
            <AdminStudentsPanel />
          </TabsContent>

          {/* Tab 3: Teachers */}
          <TabsContent value="teachers">
            <AdminTeachersPanel />
          </TabsContent>

          {/* Tab 4: Announcements */}
          <TabsContent value="announcements">
            <AdminAnnouncementsPanel />
          </TabsContent>

          {/* Tab 5: Leave */}
          <TabsContent value="leave">
            <AdminLeaveManagement />
          </TabsContent>

          {/* Tab 6: Analytics */}
          <TabsContent value="analytics">
            <AdminAnalytics />
          </TabsContent>

          {/* Tab 7: Calendar */}
          <TabsContent value="calendar">
            <AdminAcademicCalendar />
          </TabsContent>

          {/* Tab 8: Substitutes */}
          <TabsContent value="substitutes">
            <AdminSubstitutions />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
