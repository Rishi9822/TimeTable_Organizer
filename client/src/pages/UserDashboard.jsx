import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

/**
 * Smart redirect — sends user to their role-specific dashboard.
 * This replaces the old "Coming Soon" placeholder.
 */
const UserDashboard = () => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  switch (role) {
    case "super_admin":
      return <Navigate to="/super-admin" replace />;
    case "admin":
      return <Navigate to="/admin" replace />;
    case "scheduler":
      return <Navigate to="/builder" replace />;
    case "teacher":
      return <Navigate to="/teacher" replace />;
    case "student":
      return <Navigate to="/student" replace />;
    default:
      return <Navigate to="/" replace />;
  }
};

export default UserDashboard;
