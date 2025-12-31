import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Building2, Clock, Package } from "lucide-react";
import API from "@/lib/api";

export const InstitutionPlanCard = () => {
  const { data: institutionInfo, isLoading } = useQuery({
    queryKey: ["institutionInfo"],
    queryFn: async () => {
      const { data } = await API.get("/institutions/info");
      return data;
    },
    staleTime: 60000,
  });

  if (isLoading || !institutionInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Plan & Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  const { status, plan, trialDaysRemaining, institutionType, name } = institutionInfo;

  const getPlanBadgeVariant = () => {
    if (status === "suspended") return "destructive";
    if (status === "trial") return "secondary";
    if (plan === "flex") return "default";
    return "outline";
  };

  const getStatusBadgeVariant = () => {
    if (status === "active") return "default";
    if (status === "suspended") return "destructive";
    if (status === "trial") return "secondary";
    return "outline";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Plan & Status</span>
          <div className="flex gap-2">
            <Badge variant={getPlanBadgeVariant()}>{plan === "standard" ? "Standard" : plan === "flex" ? "Flex" : "Trial"}</Badge>
            <Badge variant={getStatusBadgeVariant()}>{status}</Badge>
          </div>
        </CardTitle>
        <CardDescription>Your institution subscription details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Building2 className="h-4 w-4" />
            Institution
          </div>
          <p className="font-medium">{name}</p>
        </div>

        {institutionType && (
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Package className="h-4 w-4" />
              Type
            </div>
            <p className="font-medium capitalize">{institutionType}</p>
          </div>
        )}

        {status === "trial" && trialDaysRemaining !== null && (
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              Trial Days Remaining
            </div>
            <p className="font-medium text-lg">{trialDaysRemaining} days</p>
          </div>
        )}

        {plan === "flex" && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              Flex plan allows switching between School and College modes.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};









