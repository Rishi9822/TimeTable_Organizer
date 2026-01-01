import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Shuffle, AlertTriangle } from "lucide-react";
import API from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/contexts/AuthContext";


export const InstitutionModeCard = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, authReady } = useAuth();


  const { data: institutionInfo, isLoading } = useQuery({
    queryKey: ["institutionInfo"],
    queryFn: async () => {
      const { data } = await API.get("/institutions/info");
      return data;
    },
    enabled: authReady && !!user, // ✅ REQUIRED
  });

  const switchMode = useMutation({
    mutationFn: async (mode) => {
      const { data } = await API.post("/institutions/switch-mode", { mode });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["institutionInfo"] });
      queryClient.invalidateQueries({ queryKey: ["institution_settings"] });
      toast({
        title: "Mode switched",
        description: "Institution mode has been updated.",
      });
    },
    onError: (error) => {
      const message = error?.response?.data?.message;
      toast({
        title: "Unable to switch mode",
        description: message || "Please complete both School and College setups and try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading || !institutionInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Institution Mode</CardTitle>
          <CardDescription>Loading current mode…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const {
    plan,
    status,
    institutionType,
    activeMode,
    schoolSetupComplete,
    collegeSetupComplete,
  } = institutionInfo;

  const isFlex = plan === "flex";
  const currentMode = activeMode || institutionType || "not set";

  const canSwitch =
    isFlex && schoolSetupComplete && collegeSetupComplete && status !== "archived";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Institution Mode</span>
          <Badge variant="outline" className="capitalize">
            {currentMode}
          </Badge>
        </CardTitle>
        <CardDescription>
          Active School / College configuration for this institution.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isFlex && (
          <p className="text-sm text-muted-foreground">
            Mode switching is available only on the Flex plan. Current type is
            {" "}
            <span className="font-medium capitalize">
              {institutionType || "not set"}
            </span>
            .
          </p>
        )}

        {isFlex && (
          <>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                <span className="font-medium">School setup:</span>{" "}
                {schoolSetupComplete ? (
                  <Badge variant="outline" className="ml-1">
                    Complete
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="ml-1">
                    Pending
                  </Badge>
                )}
              </p>
              <p>
                <span className="font-medium">College setup:</span>{" "}
                {collegeSetupComplete ? (
                  <Badge variant="outline" className="ml-1">
                    Complete
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="ml-1">
                    Pending
                  </Badge>
                )}
              </p>
            </div>

            {!canSwitch && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground mt-1">
                <AlertTriangle className="h-3 w-3 mt-0.5" />
                <span>
                  Complete both School and College configurations in the setup page
                  before switching modes.
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!canSwitch || switchMode.isLoading}
                onClick={() => switchMode.mutate("school")}
              >
                <Shuffle className="h-4 w-4 mr-1" />
                School
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!canSwitch || switchMode.isLoading}
                onClick={() => switchMode.mutate("college")}
              >
                <Shuffle className="h-4 w-4 mr-1" />
                College
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
