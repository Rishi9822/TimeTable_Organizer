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
import { Calendar, Loader2, Eye, EyeOff } from "lucide-react";
import { z } from "zod";

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
    signIn,
    signUp,
    loading,
  } = useAuth();

  const navigate = useNavigate();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    if (user && !loading && role) {
      navigate(getRedirectPath(), { replace: true });
    }
  }, [user, loading, role, institutionId, isSetupComplete, navigate]);

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
      toast({
        title: "Account Created",
        description: "Welcome! You are now signed in.",
      });
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
              </form>
            </TabsContent>

            {/* SIGNUP */}
            <TabsContent value="signup">
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
