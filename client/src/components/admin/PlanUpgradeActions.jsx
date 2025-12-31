import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CreditCard } from "lucide-react";
import API from "@/lib/api";
import { useToast } from "@/hooks/useToast";

/**
 * PlanUpgradeActions
 *
 * Admin-only card that lets a verified admin start a Stripe checkout
 * to upgrade from trial → standard or flex. All enforcement still
 * happens server-side; this component is just a thin UX layer.
 */
export const PlanUpgradeActions = () => {
  const { toast } = useToast();

  const { data: institutionInfo, isLoading } = useQuery({
    queryKey: ["institutionInfo"],
    queryFn: async () => {
      const { data } = await API.get("/institutions/info");
      return data;
    },
    staleTime: 60000,
  });

  const upgradeMutation = useMutation({
    mutationFn: async (plan) => {
      const { data } = await API.post("/stripe/create-checkout", { plan });
      return data;
    },
    onSuccess: (data) => {
      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast({
          title: "Upgrade started",
          description: "Stripe checkout session created. Please complete payment.",
        });
      }
    },
    onError: (error, plan) => {
      const status = error?.response?.status;
      const message = error?.response?.data?.message;

      if (status === 403 && error?.response?.data?.requiresEmailVerification) {
        toast({
          title: "Verify your email",
          description:
            "Please verify your admin email before upgrading your plan. Check your inbox for the verification link.",
          variant: "destructive",
        });
        return;
      }

      if (status === 503) {
        toast({
          title: "Payments not configured",
          description:
            "Stripe is not configured for this environment. Please contact the developer or administrator.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Failed to start upgrade",
        description:
          message || `Could not start ${plan} plan checkout. Please try again.`,
        variant: "destructive",
      });
    },
  });

  if (isLoading || !institutionInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upgrade Plan</CardTitle>
          <CardDescription>Loading subscription details…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { plan, status } = institutionInfo;

  // Demo/trial institutions can upgrade; active paid plans may still move to flex.
  const isTrial = plan === "trial";
  const isStandard = plan === "standard";
  const isFlex = plan === "flex";

  // Suspended institutions can still attempt checkout; backend will decide.

  if (isFlex) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription
          </CardTitle>
          <CardDescription>
            You are on the <Badge variant="outline">Flex</Badge> plan. All features are enabled.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Flex plan allows switching between School and College configurations and is ideal for hybrid
            institutions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Upgrade Plan
        </CardTitle>
        <CardDescription>
          Move from <Badge variant="secondary">{plan}</Badge> to a paid plan using secure Stripe checkout.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isTrial && (
          <p className="text-sm text-muted-foreground">
            You are currently on a trial plan. Upgrade to unlock unlimited classes, teachers, and exports.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            variant="outline"
            className="w-full justify-between"
            disabled={upgradeMutation.isLoading}
            onClick={() => upgradeMutation.mutate("standard")}
          >
            <span>Upgrade to Standard</span>
            <ArrowRight className="h-4 w-4" />
          </Button>

          <Button
            variant="heroOutline"
            className="w-full justify-between"
            disabled={upgradeMutation.isLoading}
            onClick={() => upgradeMutation.mutate("flex")}
          >
            <span>Upgrade to Flex</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {isStandard && (
          <p className="text-xs text-muted-foreground">
            You are already on Standard. Use the Flex upgrade if you need to support both school and college
            configurations.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
