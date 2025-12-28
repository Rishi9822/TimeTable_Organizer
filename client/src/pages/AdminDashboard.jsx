import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserMenu } from "@/components/auth/UserMenu";
import { useAuth } from "@/contexts/AuthContext";
import InviteCodesCard from "@/components/admin/InviteCodesCard";
import {
  Calendar,
  Users,
  Settings,
  BookOpen,
  LayoutGrid,
  ArrowRight,
} from "lucide-react";

const AdminDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">
                  Admin Dashboard
                </h1>
                <p className="text-xs text-muted-foreground">
                  Manage your institution
                </p>
              </div>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">
            Welcome back{user?.name ? `, ${user.name}` : ""}!
          </h2>
          <p className="text-muted-foreground mt-1">
            What would you like to do today?
          </p>
        </div>

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
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
