import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { UserMenu } from "@/components/auth/UserMenu";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar, Clock, Construction } from "lucide-react";

const UserDashboard = () => {
  const { user, role } = useAuth();

  const getRoleTitle = () => {
    switch (role) {
      case "teacher":
        return "Teacher Dashboard";
      case "student":
        return "Student Dashboard";
      default:
        return "Dashboard";
    }
  };

  const getRoleDescription = () => {
    switch (role) {
      case "teacher":
        return "View your teaching schedule and class assignments";
      case "student":
        return "View your class timetable and schedule";
      default:
        return "Your personal dashboard";
    }
  };

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
                  {getRoleTitle()}
                </h1>
                <p className="text-xs text-muted-foreground capitalize">
                  {role}
                </p>
              </div>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full text-center">
            <CardHeader>
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Construction className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Coming Soon</CardTitle>
              <CardDescription className="text-base">
                {getRoleDescription()}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                We're building something amazing for you! Your personalized
                dashboard will be available soon.
              </p>

              <div className="flex items-center justify-center gap-4 pt-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Stay tuned</span>
                </div>
              </div>

              {user?.email && (
                <p className="text-xs text-muted-foreground pt-4 border-t border-border">
                  Logged in as: {user.email}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default UserDashboard;
