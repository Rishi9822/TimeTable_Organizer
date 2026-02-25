import React from "react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Button } from "@/components/ui/button";
import { GraduationCap, School, ArrowLeftRight } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { useQueryClient } from "@tanstack/react-query";

export const ModeSwitcher = () => {
    const {
        plan,
        activeMode,
        switchMode,
        canSwitchMode,
        schoolSetupComplete,
        collegeSetupComplete
    } = useSubscription();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    if (plan !== "flex") return null;

    const handleSwitch = async (newMode) => {
        if (newMode === activeMode) return;
        try {
            await switchMode(newMode);

            // Invalidate ALL queries to ensure data isolation (new mode data loads)
            await queryClient.invalidateQueries();

            toast({
                title: `Switched to ${newMode === "school" ? "School" : "College"} mode`,
                description: "Your dashboard has been updated with the selected mode's data.",
            });
        } catch (error) {
            toast({
                title: "Switch failed",
                description: error.response?.data?.message || "Could not switch mode",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="flex items-center bg-muted rounded-lg p-1 gap-1">
            <Button
                variant={activeMode === "school" ? "default" : "ghost"}
                size="sm"
                className="gap-2"
                onClick={() => handleSwitch("school")}
                disabled={!schoolSetupComplete}
                title={!schoolSetupComplete ? "Complete school setup first" : ""}
            >
                <School className="h-4 w-4" />
                School
            </Button>
            <div className="text-muted-foreground/30 px-1">
                <ArrowLeftRight className="h-3 w-3" />
            </div>
            <Button
                variant={activeMode === "college" ? "default" : "ghost"}
                size="sm"
                className="gap-2"
                onClick={() => handleSwitch("college")}
                disabled={!collegeSetupComplete}
                title={!collegeSetupComplete ? "Complete college setup first" : ""}
            >
                <GraduationCap className="h-4 w-4" />
                College
            </Button>
        </div>
    );
};
