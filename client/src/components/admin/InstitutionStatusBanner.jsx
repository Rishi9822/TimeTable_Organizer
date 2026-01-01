import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Clock, CheckCircle, XCircle, Info } from "lucide-react";
import API from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";


export const InstitutionStatusBanner = () => {
  const { user, authReady } = useAuth();

  const { data: institutionInfo, isLoading } = useQuery({
    queryKey: ["institutionInfo"],
    queryFn: async () => {
      const { data } = await API.get("/institutions/info");
      return data;
    },
    enabled: authReady && !!user, // ✅ FIXED
    staleTime: 0,
    retry: false,
  });

  if (isLoading || !institutionInfo) {
    return null;
  }

  const { status, plan, trialDaysRemaining, institutionType } = institutionInfo;

  // Trial expiring soon (less than 3 days)
  if (status === "trial" && trialDaysRemaining !== null && trialDaysRemaining <= 3 && trialDaysRemaining > 0) {
    return (
      <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 mb-4">
        <Clock className="h-4 w-4 text-yellow-600" />
        <AlertTitle className="text-yellow-800 dark:text-yellow-200">Trial Ending Soon</AlertTitle>
        <AlertDescription className="text-yellow-700 dark:text-yellow-300">
          Your trial period ends in {trialDaysRemaining} {trialDaysRemaining === 1 ? "day" : "days"}.
          Upgrade your plan to continue using all features.
        </AlertDescription>
      </Alert>
    );
  }

  // Trial expired / Suspended
  if (status === "suspended") {
    return (
      <Alert className="border-red-500 bg-red-50 dark:bg-red-900/20 mb-4">
        <XCircle className="h-4 w-4 text-red-600" />
        <AlertTitle className="text-red-800 dark:text-red-200">Account Suspended</AlertTitle>
        <AlertDescription className="text-red-700 dark:text-red-300">
          Your account is currently suspended and in read-only mode.
          Please update your billing details to restore access.
        </AlertDescription>

      </Alert>
    );
  }

  // Active trial
  if (status === "trial" && trialDaysRemaining !== null && trialDaysRemaining > 3) {
    return (
      <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-900/20 mb-4">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800 dark:text-blue-200">Trial Account</AlertTitle>
        <AlertDescription className="text-blue-700 dark:text-blue-300">
          You're currently on a trial plan ({plan}). {trialDaysRemaining} days remaining.
          {institutionType && ` Institution type: ${institutionType}.`}
        </AlertDescription>
      </Alert>
    );
  }

  // Active paid account
  if (status === "active") {
    return (
      <Alert className="border-green-500 bg-green-50 dark:bg-green-900/20 mb-4">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800 dark:text-green-200">Active Account</AlertTitle>
        <AlertDescription className="text-green-700 dark:text-green-300">
          Plan: {plan === "standard" ? "Standard" : plan === "flex" ? "Flex" : plan}
          {institutionType && ` • Type: ${institutionType}`}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};

