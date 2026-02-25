import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Building2, Clock, Package, School, GraduationCap } from "lucide-react";
import { useInstitutionInfo, useSwitchMode } from "@/hooks/useTeachers";
import { useToast } from "@/hooks/useToast";

const InstitutionPlanCard = () => {
  const { data: institutionInfo, isLoading } = useInstitutionInfo();
  const switchMode = useSwitchMode();
  const { toast } = useToast();

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

  const {
    status,
    plan,
    trialDaysRemaining,
    institutionType,
    name,
    activeMode,
    canSwitchMode,
    schoolSetupComplete,
    collegeSetupComplete,
  } = institutionInfo;

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

        {(institutionType || (plan === "flex" && activeMode)) && (
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Package className="h-4 w-4" />
              {plan === "flex" ? "Active mode" : "Type"}
            </div>
            <p className="font-medium capitalize">{plan === "flex" ? activeMode : institutionType}</p>
          </div>
        )}

        {plan === "flex" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Setup</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge variant={schoolSetupComplete ? "default" : "secondary"} className="gap-1">
                <School className="h-3 w-3" />
                School {schoolSetupComplete ? "✓" : ""}
              </Badge>
              <Badge variant={collegeSetupComplete ? "default" : "secondary"} className="gap-1">
                <GraduationCap className="h-3 w-3" />
                College {collegeSetupComplete ? "✓" : ""}
              </Badge>
            </div>
            {canSwitchMode && (
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant={activeMode === "school" ? "default" : "outline"}
                  disabled={switchMode.isPending}
                  onClick={() => switchMode.mutate("school", { onSuccess: () => toast({ title: "Switched to School mode" }), onError: (e) => toast({ title: "Failed to switch", description: e?.response?.data?.message, variant: "destructive" }) })}
                >
                  School
                </Button>
                <Button
                  size="sm"
                  variant={activeMode === "college" ? "default" : "outline"}
                  disabled={switchMode.isPending}
                  onClick={() => switchMode.mutate("college", { onSuccess: () => toast({ title: "Switched to College mode" }), onError: (e) => toast({ title: "Failed to switch", description: e?.response?.data?.message, variant: "destructive" }) })}
                >
                  College
                </Button>
              </div>
            )}
            {!canSwitchMode && (
              <p className="text-xs text-muted-foreground">Complete setup for both modes to switch.</p>
            )}
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

      </CardContent>
    </Card>
  );

};

export default InstitutionPlanCard;









