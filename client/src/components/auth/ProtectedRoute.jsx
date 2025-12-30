import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export const ProtectedRoute = ({ children, requiredRoles }) => {
  const {
    user,
    role,
    institutionId,
    isSetupComplete,
    emailVerified,
    loading,
    hasRole,
  } = useAuth();

  const location = useLocation();
  const currentPath = location.pathname;

  // ⛔️ DO NOTHING until auth is fully resolved
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" role="status" aria-label="Loading">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
      </div>
    );
  }

  // ⛔️ WAIT until institutionId is known for admins
  if (role === "admin" && user && institutionId === undefined) {
    return null;
  }

  // If user is not authenticated, redirect to auth page (except for public routes)
  if (!user && currentPath !== "/auth" && currentPath !== "/") {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  // If user is authenticated and tries to access /auth, redirect to appropriate dashboard
  // BUT: Allow unverified users to stay on /auth to see verification message
  // This is for backward compatibility - existing users can still use the app
  if (user && currentPath === "/auth" && emailVerified) {
    if (role === "admin") {
      if (!institutionId || !isSetupComplete) {
        return <Navigate to="/setup" replace />;
      }
      return <Navigate to="/admin" replace />;
    }
    if (role === "scheduler") {
      if (!institutionId) {
        return <Navigate to="/join" replace />;
      }
      return <Navigate to="/builder" replace />;
    }
    if (role === "teacher" || role === "student") {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }
  // If user is not verified but authenticated, allow them to access /auth
  // They'll see the verification warning banner

  // 3️⃣ ADMIN FLOW
  if (role === "admin") {
    // No institution yet → force setup
    if (!institutionId && currentPath !== "/setup") {
      return <Navigate to="/setup" replace />;
    }

    // Institution exists but setup incomplete → force setup
    if (institutionId && !isSetupComplete && currentPath !== "/setup") {
      return <Navigate to="/setup" replace />;
    }

    // Setup complete → block setup page
    if (institutionId && isSetupComplete && currentPath === "/setup") {
      return <Navigate to="/admin" replace />;
    }
  }

  // Check role-based access before other checks
  if (requiredRoles && !hasRole(requiredRoles)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4" role="alert">
        <h1 className="text-2xl font-semibold text-foreground">
          Access Denied
        </h1>
        <p className="text-muted-foreground">
          You don't have permission to access this page.
        </p>
        <p className="text-sm text-muted-foreground">
          Your role:{" "}
          <span className="font-medium capitalize">{role || "none"}</span>
        </p>
      </div>
    );
  }

  // 4️⃣ SCHEDULER FLOW
  // Scheduler without institution → must join via invite
  if (
    role === "scheduler" &&
    !institutionId &&
    currentPath !== "/join"
  ) {
    return <Navigate to="/join" replace />;
  }

  // 5️⃣ TEACHER / STUDENT FLOW
  // They are restricted to dashboard for now (unless accessing public routes)
  if (
    (role === "teacher" || role === "student") &&
    currentPath !== "/dashboard" &&
    currentPath !== "/"
  ) {
    return <Navigate to="/dashboard" replace />;
  }

  // 6️⃣ All checks passed
  return children;
};
