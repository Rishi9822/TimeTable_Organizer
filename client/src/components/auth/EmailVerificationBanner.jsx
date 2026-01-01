import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Mail, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import API from "@/lib/api";
import { useToast } from "@/hooks/useToast";

export const EmailVerificationBanner = () => {
  const { user, emailVerified, refreshUserData } = useAuth();
  const { toast } = useToast();
  const [isResending, setIsResending] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Don't show if verified, no user, or dismissed
  if (!user || emailVerified || dismissed) {
    return null;
  }

  const handleResend = async () => {
    if (!user?.email) return;

    setIsResending(true);
    try {
      await API.post("/auth/resend-verification", { email: user.email });
      toast({
        title: "Verification Email Sent",
        description: "Please check your inbox for the verification link.",
      });
      // Refresh user data after a delay to check if they verified
      setTimeout(() => {
        refreshUserData();
      }, 2000);
    } catch (error) {
      toast({
        title: "Email Sent",
        description: "If an account exists, a verification email has been sent.",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 mb-4 relative">
      <AlertCircle className="h-4 w-4 text-yellow-600" />
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-6 w-6"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss verification banner"
      >
        <X className="h-4 w-4" />
      </Button>
      <AlertTitle className="text-yellow-800 dark:text-yellow-200 pr-8">
        Email Not Verified
      </AlertTitle>
      <AlertDescription className="text-yellow-700 dark:text-yellow-300">
        Please verify your email address to access all features and ensure account security.{" "}
        <button
          type="button"
          onClick={handleResend}
          disabled={isResending}
          className="underline font-medium hover:no-underline disabled:opacity-50"
        >
          {isResending ? (
            <>
              <Mail className="inline h-3 w-3 mr-1" />
              Sending...
            </>
          ) : (
            "Resend verification email"
          )}
        </button>
      </AlertDescription>
    </Alert>
  );
};












