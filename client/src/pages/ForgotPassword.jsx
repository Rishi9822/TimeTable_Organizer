import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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
import { useToast } from "@/hooks/useToast";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import { z } from "zod";
import API from "@/lib/api";

const emailSchema = z.string().email("Please enter a valid email address");

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      emailSchema.parse(email);
    } catch (err) {
      toast({
        title: "Validation Error",
        description: err.errors?.[0]?.message,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await API.post("/auth/forgot-password", { email });
      setEmailSent(true);
      toast({
        title: "Email Sent",
        description: "If an account exists, a password reset email has been sent.",
      });
    } catch (error) {
      // Still show success to prevent user enumeration
      setEmailSent(true);
      toast({
        title: "Email Sent",
        description: "If an account exists, a password reset email has been sent.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl">Forgot Password</CardTitle>
          <CardDescription>
            {emailSent
              ? "Check your email for password reset instructions"
              : "Enter your email address and we'll send you a reset link"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {emailSent ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center p-6">
                <div className="rounded-full bg-primary/10 p-4">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
              </div>
              <p className="text-center text-muted-foreground">
                If an account with <strong>{email}</strong> exists, you'll receive a password reset link shortly.
              </p>
              <p className="text-center text-sm text-muted-foreground">
                The link will expire in 1 hour.
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => navigate("/auth")}
                  variant="outline"
                  className="w-full"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Button>
                <Button
                  onClick={() => {
                    setEmailSent(false);
                    setEmail("");
                  }}
                  variant="ghost"
                  className="w-full"
                >
                  Send Another Email
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  required
                  autoComplete="email"
                  aria-required="true"
                />
              </div>

              <Button
                className="w-full"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
                type="submit"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>

              <div className="text-center">
                <Link
                  to="/auth"
                  className="text-sm text-muted-foreground hover:text-primary underline"
                >
                  Back to Login
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;









