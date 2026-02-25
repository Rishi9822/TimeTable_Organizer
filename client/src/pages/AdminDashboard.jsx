import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";
import API from "@/lib/api";
import { DashboardLayout } from "@/components/DashboardLayout";
import { SecondSetupPrompt } from "@/components/subscription/SecondSetupPrompt";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LayoutGrid,
  Users,
  ArrowRight,
  BookOpen,
  Settings,
  FileText
} from "lucide-react";
import InviteCodesCard from "@/components/admin/InviteCodesCard";
import InstitutionPlanCard from "@/components/admin/InstitutionPlanCard";
import PlanUpgradeActions from "@/components/admin/PlanUpgradeActions";

const AdminDashboard = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ... (useEffects for Stripe kept exactly as they are)
  useEffect(() => {
    // (Stripe handling logic)
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
    <DashboardLayout
      title={`Welcome back${user?.name ? `, ${user.name}` : ""}!`}
      subtitle="What would you like to do today?"
    >
      {/* SaaS: Multi-mode setup prompt for Flex plans */}
      <SecondSetupPrompt />

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

        {/* Subjects */}
        <Card className="opacity-75">
          <CardHeader>
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-2">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
            </div>
            <CardTitle className="text-lg">Subjects</CardTitle>
            <CardDescription>
              Configure subjects and their weekly periods
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" disabled>
              Coming Soon
            </Button>
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
              Update institution settings and schedule configuration
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

        {/* Activity Log */}
        <Card>
          <CardHeader>
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mb-2">
              <FileText className="h-5 w-5 text-secondary-foreground" />
            </div>
            <CardTitle className="text-lg">Activity Log</CardTitle>
            <CardDescription>
              View audit trail of all actions performed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/activity-log">
              <Button variant="outline" className="w-full">
                View Activity Log
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
