import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import API from "@/lib/api";

/**
 * EmailVerificationProcessing
 *
 * Frontend route for /auth/verify-email that:
 * - Reads the token from the query string
 * - Redirects the browser to the backend verification endpoint
 *   (/api/auth/verify-email?token=...)
 * - Shows a friendly loading / error UI instead of a 404
 */
const EmailVerificationProcessing = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");

    if (!token) {
      setError("This verification link is invalid or incomplete. Please use the link from your email or request a new one.");
      return;
    }

    try {
      // Derive API base URL from the axios instance to avoid hardcoding
      const apiBase = (API.defaults.baseURL || "").replace(/\/$/, "");
      const redirectUrl = `${apiBase}/auth/verify-email?token=${encodeURIComponent(token)}`;

      // Full-page redirect so Express can perform verification and redirect
      window.location.replace(redirectUrl);
    } catch (e) {
      console.error("Failed to redirect for email verification:", e);
      setError("Something went wrong while processing your verification link. Please try again.");
    }
  }, [location.search]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
        <Card className="w-full max-w-md shadow-card">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <AlertCircle className="h-6 w-6 text-destructive" />
              Email Verification
            </CardTitle>
            <CardDescription>We couldn't process this verification link.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">{error}</p>
            <div className="flex flex-col gap-2">
              <Button className="w-full" onClick={() => navigate("/auth")}>Back to Login</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <Card className="w-full max-w-md shadow-card" role="status" aria-label="Verifying email">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl">Verifying your email…</CardTitle>
          <CardDescription>
            Please wait while we confirm your email address.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 py-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
          <p className="text-sm text-muted-foreground text-center">
            If this takes too long, you can safely close this page and try the link again from your email.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailVerificationProcessing;
