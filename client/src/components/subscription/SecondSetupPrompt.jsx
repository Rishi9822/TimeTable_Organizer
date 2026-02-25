import React from "react";
import { Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { GraduationCap, School, Sparkles } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";

export const SecondSetupPrompt = () => {
    const { plan, schoolSetupComplete, collegeSetupComplete } = useSubscription();

    if (plan !== "flex") return null;

    const needsSecondSetup = (schoolSetupComplete && !collegeSetupComplete) || (!schoolSetupComplete && collegeSetupComplete);
    const missingMode = schoolSetupComplete ? "college" : "school";

    if (!needsSecondSetup) return null;

    return (
        <Alert className="border-primary/50 bg-primary/5 mb-6 animate-pulse-subtle">
            <Sparkles className="h-4 w-4 text-primary" />
            <AlertTitle>Master Your Multi-Mode Setup!</AlertTitle>
            <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                        {missingMode === "college" ? <GraduationCap className="h-5 w-5 text-primary" /> : <School className="h-5 w-5 text-primary" />}
                    </div>
                    <p className="text-sm">
                        You've completed the {schoolSetupComplete ? "School" : "College"} setup.
                        Now, finish the <strong>{missingMode}</strong> setup to enable seamless switching.
                    </p>
                </div>
                <Button asChild size="sm" className="gradient-primary border-none shadow-sm shadow-primary/20 shrink-0">
                    <Link to={`/setup?mode=${missingMode}`}>Complete {missingMode} Setup</Link>
                </Button>
            </AlertDescription>
        </Alert>
    );
};
