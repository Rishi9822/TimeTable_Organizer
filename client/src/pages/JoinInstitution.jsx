import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import API from "@/lib/api";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/useToast";

import { Calendar, Key, Loader2, ArrowRight } from "lucide-react";
import { AppRole } from "@/contexts/AuthContext";


const JoinInstitution = () => {
  

  const { user, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [inviteCode, setInviteCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  if (user?.role !== AppRole.SCHEDULER) {
    navigate("/", { replace: true });
    return null;
  }

  const handleJoin = async () => {
    if (!inviteCode.trim() || !user) return;

    setIsJoining(true);

    try {
      await API.post("/institutions/join", {
        inviteCode: inviteCode.trim().toUpperCase(),
      });

      toast({
        title: "Success!",
        description: "You have joined the institution successfully.",
      });

      // Refresh auth context (institutionId gets updated)
      await refreshUserData();

      navigate("/builder", { replace: true });
    } catch (error) {
      console.error("Join institution error:", error);

      toast({
        title: "Invalid Code",
        description:
          error.response?.data?.message ||
          "This invite code is invalid, expired, or already used.",
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <Card className="w-full max-w-md shadow-card" role="main">
        <CardHeader className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div
              className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center"
              aria-hidden="true"
            >
              <Calendar className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">
              TimetablePro
            </span>
          </div>
          <CardTitle className="text-2xl">Join an Institution</CardTitle>
          <CardDescription>
            Enter the invite code provided by your institution administrator
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleJoin();
            }}
            className="space-y-6"
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="inviteCode">Invite Code</Label>
              <div className="relative">
                <Key
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="inviteCode"
                  type="text"
                  placeholder="Enter invite code (e.g., ABC123)"
                  value={inviteCode}
                  onChange={(e) =>
                    setInviteCode(e.target.value.toUpperCase())
                  }
                  className="pl-10 uppercase tracking-widest font-mono"
                  maxLength={10}
                  disabled={isJoining}
                  required
                  aria-required="true"
                  aria-describedby="invite-code-hint"
                />
              </div>
              <p
                id="invite-code-hint"
                className="text-xs text-muted-foreground"
              >
                Ask your institution admin for an invite code to join.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full gap-2"
              disabled={!inviteCode.trim() || isJoining}
              aria-busy={isJoining}
            >
              {isJoining ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Joining...
                </>
              ) : (
                <>
                  Join Institution
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default JoinInstitution;
