import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Loader2 } from "lucide-react";

export const ProtectedRoute = ({ children, requiredRoles }) => {
  const {
    user,
    role,
    institutionId,
    isSetupComplete,
    emailVerified,
    loading: authLoading,
    hasRole,
  } = useAuth();

  const {
    plan,
    isTrialExpired,
    activeMode,
    schoolSetupComplete,
    collegeSetupComplete,
    loading: subLoading,
  } = useSubscription();

  const location = useLocation();
  const currentPath = location.pathname;

  const loading = authLoading || subLoading;

  // ⛔️ DO NOTHING until both auth and subscription are resolved
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" role="status" aria-label="Loading">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
      </div>
    );
  }

  // If user is not authenticated, redirect to auth page (except for public routes)
  if (!user && currentPath !== "/auth" && currentPath !== "/") {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  // 1️⃣ SUBSCRIPTION ENFORCEMENT
  // Block access if trial expired (unless on /upgrade or public routes)
  if (user && isTrialExpired && currentPath !== "/upgrade" && role !== "super_admin") {
    return <Navigate to="/upgrade" replace state={{ trialExpired: true }} />;
  }

  // If user is authenticated and tries to access /auth, redirect to appropriate dashboard
  if (user && currentPath === "/auth" && emailVerified) {
    if (role === "super_admin") {
      return <Navigate to="/super-admin" replace />;
    }
    if (role === "admin") {
      // Flex logic: if they completed one mode but not both, they might still need setup
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
    // CRITICAL: Block setup if email is not verified
    if (!emailVerified && currentPath === "/setup") {
      // Allow access to setup page but it will show warning and disable completion
      // Backend will enforce the restriction
    } else if (!emailVerified && currentPath !== "/auth" && currentPath !== "/") {
      // Redirect unverified admins to auth page to see verification banner
      return <Navigate to="/auth" replace />;
    }

    // No institution yet → force setup (only if verified)
    if (emailVerified && !institutionId && currentPath !== "/setup") {
      return <Navigate to="/setup" replace />;
    }

    // SaaS Logic: Handle setup completion gates for Flex vs Standard
    if (emailVerified && institutionId) {
      if (plan === "flex") {
        const urlParams = new URLSearchParams(location.search);
        const modeParam = urlParams.get("mode");
        const needsSchool = !schoolSetupComplete;
        const needsCollege = !collegeSetupComplete;
        const needsAny = needsSchool || needsCollege;

        // Allow access to /setup if specifically requesting a mode that isn't done
        if (currentPath === "/setup") {
          if (modeParam === "school" && !schoolSetupComplete) return children;
          if (modeParam === "college" && !collegeSetupComplete) return children;

          // If no specific mode param, but we need setup, check if we should allow or redirect to specific mode
          if (needsAny) return children;

          // If everything is done and they are on /setup, go to dashboard
          return <Navigate to="/admin" replace />;
        }

        // Force setup if NOTHING is done
        if (needsSchool && needsCollege && currentPath !== "/setup") {
          return <Navigate to="/setup" replace />;
        }
      } else {
        // Standard/Trial: Force setup if not complete
        if (!isSetupComplete && currentPath !== "/setup") {
          return <Navigate to="/setup" replace />;
        }
        // Block setup if already complete
        if (isSetupComplete && currentPath === "/setup") {
          return <Navigate to="/admin" replace />;
        }
      }
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
