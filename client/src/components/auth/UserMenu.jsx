import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LogOut, User, Settings, Shield } from "lucide-react";

const UserMenu = () => {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <Button variant="outline" onClick={() => navigate("/auth")}>
        Sign In
      </Button>
    );
  }

  // Get user initials from name or email
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email?.slice(0, 2).toUpperCase() || "U";

  const getRoleBadgeVariant = () => {
    switch (role) {
      case "admin":
        return "destructive";
      case "scheduler":
        return "default";
      case "teacher":
        return "secondary";
      default:
        return "outline";
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 w-10 rounded-full"
          aria-label="User menu"
          aria-haspopup="true"
        >
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-56"
        align="end"
        forceMount
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <p className="text-sm font-medium leading-none">
              {user.name || "User"}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
            {role && (
              <Badge
                variant={getRoleBadgeVariant()}
                className="w-fit capitalize"
              >
                {role}
              </Badge>
            )}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Role-based menu items */}
        {(role === "admin" || role === "scheduler") && (
          <DropdownMenuItem
            onClick={() => navigate("/builder")}
            aria-label="Open Timetable Builder"
          >
            <User className="mr-2 h-4 w-4" aria-hidden="true" />
            <span>Timetable Builder</span>
          </DropdownMenuItem>
        )}

        {role === "admin" && (
          <>
            <DropdownMenuItem
              onClick={() => navigate("/setup")}
              aria-label="Open Setup Wizard"
            >
              <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
              <span>Setup Wizard</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate("/admin")}
              aria-label="Open Admin Panel"
            >
              <Shield className="mr-2 h-4 w-4" aria-hidden="true" />
              <span>Admin Panel</span>
            </DropdownMenuItem>
          </>
        )}

        {(role === "teacher" || role === "student") && (
          <DropdownMenuItem
            onClick={() => navigate("/dashboard")}
            aria-label="Open Dashboard"
          >
            <User className="mr-2 h-4 w-4" aria-hidden="true" />
            <span>Dashboard</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-destructive"
          aria-label="Sign out"
        >
          <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export { UserMenu };
