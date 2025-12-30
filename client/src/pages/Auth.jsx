import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useToast } from "@/hooks/useToast";
import { Calendar, Loader2, Eye, EyeOff, Mail, AlertCircle } from "lucide-react";
import { z } from "zod";
import API from "@/lib/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/* ======================
   VALIDATION SCHEMAS
====================== */
const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters");

const Auth = () => {
  const {
    user,
    role,
    institutionId,
    isSetupComplete,
    emailVerified,
    signIn,
    signUp,
    refreshUserData,
    loading,
  } = useAuth();

  const navigate = useNavigate();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);

  /* LOGIN */
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  /* SIGNUP */
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [signupFullName, setSignupFullName] = useState("");
  const [signupRole, setSignupRole] = useState("student");

  /* ======================
     REDIRECTION LOGIC
  ====================== */
  const getRedirectPath = () => {
    if (!role) return "/auth";

    if (role === "admin") {
      if (!institutionId || !isSetupComplete) return "/setup";
      return "/admin";
    }

    if (role === "scheduler") {
      if (!institutionId) return "/join";
      return "/builder";
    }

    if (role === "teacher" || role === "student") {
      return "/dashboard";
    }

    return "/";
  };

  useEffect(() => {
    // Check for verification success or error in URL params (only once on mount)
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get("error");
    if (error === "invalid_token" || error === "invalid_or_expired_token") {
      toast({
        title: "Verification Failed",
        description: "The verification link is invalid or has expired.",
        variant: "destructive",
      });
      // Clean up URL
      window.history.replaceState({}, "", "/auth");
    }
  }, []); // Only run once on mount

  useEffect(() => {
    // Handle redirects for authenticated users
    // Note: Unverified users can still access the app (backward compatibility)
    // They'll see a warning banner but can proceed
    if (user && !loading && role) {
      // Allow unverified users to stay on auth page to see verification message
      // But if they're verified, redirect them away from auth page
      if (emailVerified) {
        navigate(getRedirectPath(), { replace: true });
      }
      // If not verified, let ProtectedRoute handle the redirect logic
      // This allows existing users to continue working
    }
  }, [user, loading, role, institutionId, isSetupComplete, emailVerified, navigate]);

  /* ======================
     LOGIN HANDLER
  ====================== */
  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      emailSchema.parse(loginEmail);
      passwordSchema.parse(loginPassword);
    } catch (err) {
      toast({
        title: "Validation Error",
        description: err.errors?.[0]?.message,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsSubmitting(false);

    if (error) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid email or password.",
        variant: "destructive",
      });
    } else {
      // Check if email is verified after successful login
      await refreshUserData();
    }
  };

  /* ======================
     SIGNUP HANDLER
  ====================== */
  const handleSignup = async (e) => {
    e.preventDefault();

    try {
      emailSchema.parse(signupEmail);
      passwordSchema.parse(signupPassword);
    } catch (err) {
      toast({
        title: "Validation Error",
        description: err.errors?.[0]?.message,
        variant: "destructive",
      });
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      toast({
        title: "Validation Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (!signupFullName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter your full name",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    const { error } = await signUp(
      signupEmail,
      signupPassword,
      signupFullName,
      signupRole
    );
    setIsSubmitting(false);

    if (error) {
      toast({
        title: "Sign Up Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setShowVerificationMessage(true);
      toast({
        title: "Account Created",
        description: "Please verify your email to activate your account.",
      });
    }
  };

  /* ======================
     RESEND VERIFICATION EMAIL
  ====================== */
  const handleResendVerification = async () => {
    const emailToResend = user?.email || loginEmail || signupEmail;
    
    if (!emailToResend) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    try {
      emailSchema.parse(emailToResend);
    } catch {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setResendingVerification(true);
    try {
      await API.post("/auth/resend-verification", { email: emailToResend });
      toast({
        title: "Verification Email Sent",
        description: "Please check your inbox for the verification link.",
      });
    } catch (error) {
      toast({
        title: "Email Sent",
        description: "If an account exists, a verification email has been sent.",
      });
    } finally {
      setResendingVerification(false);
    }
  };

  /* ======================
     LOADING STATE
  ====================== */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" role="status" aria-label="Loading authentication">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
      </div>
    );
  }

  /* ======================
     UI
  ====================== */
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <Card className="w-full max-w-md shadow-card" role="main">
        <CardHeader className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center" aria-hidden="true">
              <Calendar className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">
              TimetablePro
            </span>
          </div>
          <CardTitle className="text-2xl">Welcome</CardTitle>
          <CardDescription>
            Sign in to your account or create a new one
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid grid-cols-2 mb-6" role="tablist">
              <TabsTrigger value="login" aria-label="Login tab">Login</TabsTrigger>
              <TabsTrigger value="signup" aria-label="Sign up tab">Sign Up</TabsTrigger>
            </TabsList>

            {/* LOGIN */}
            <TabsContent value="login">
              {user && !emailVerified && (
                <Alert className="mb-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertTitle className="text-yellow-800 dark:text-yellow-200">Email Not Verified</AlertTitle>
                  <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                    Please verify your email address to access all features.{" "}
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={resendingVerification}
                      className="underline font-medium hover:no-underline"
                    >
                      {resendingVerification ? "Sending..." : "Resend verification email"}
                    </button>
                  </AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    autoComplete="email"
                    aria-required="true"
                    aria-invalid={loginEmail ? !emailSchema.safeParse(loginEmail).success : false}
                  />
                </div>

                <div>
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      aria-required="true"
                      aria-invalid={loginPassword && loginPassword.length < 6}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  className="w-full"
                  disabled={isSubmitting}
                  aria-busy={isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? "Signing in..." : "Sign In"}
                </Button>
                
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => navigate("/auth/forgot-password")}
                    className="text-sm text-muted-foreground hover:text-primary underline"
                  >
                    Forgot password?
                  </button>
                </div>
              </form>
            </TabsContent>

            {/* SIGNUP */}
            <TabsContent value="signup">
              {showVerificationMessage && (
                <Alert className="mb-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20">
                  <Mail className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-800 dark:text-blue-200">Verification Email Sent</AlertTitle>
                  <AlertDescription className="text-blue-700 dark:text-blue-300">
                    Please check your email and click the verification link to activate your account.{" "}
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={resendingVerification}
                      className="underline font-medium hover:no-underline"
                    >
                      {resendingVerification ? "Sending..." : "Resend email"}
                    </button>
                  </AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleSignup} className="space-y-4" noValidate>
                <div>
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    placeholder="Full Name"
                    value={signupFullName}
                    onChange={(e) => setSignupFullName(e.target.value)}
                    required
                    autoComplete="name"
                    aria-required="true"
                  />
                </div>

                <div>
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                    autoComplete="email"
                    aria-required="true"
                    aria-invalid={signupEmail ? !emailSchema.safeParse(signupEmail).success : false}
                  />
                </div>

                <div>
                  <Label htmlFor="signup-role">Role</Label>
                  <Select value={signupRole} onValueChange={setSignupRole}>
                    <SelectTrigger id="signup-role" aria-label="Select your role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="scheduler">Scheduler</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    aria-required="true"
                    aria-invalid={signupPassword && signupPassword.length < 6}
                    aria-describedby="password-hint"
                  />
                  <p id="password-hint" className="text-xs text-muted-foreground mt-1">
                    Password must be at least 6 characters
                  </p>
                </div>

                <div>
                  <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                  <Input
                    id="signup-confirm-password"
                    type="password"
                    placeholder="Confirm Password"
                    value={signupConfirmPassword}
                    onChange={(e) =>
                      setSignupConfirmPassword(e.target.value)
                    }
                    required
                    autoComplete="new-password"
                    aria-required="true"
                    aria-invalid={signupConfirmPassword && signupPassword !== signupConfirmPassword}
                  />
                </div>

                <Button
                  className="w-full"
                  disabled={isSubmitting}
                  aria-busy={isSubmitting}
                  type="submit"
                >
                  {isSubmitting
                    ? "Creating account..."
                    : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
