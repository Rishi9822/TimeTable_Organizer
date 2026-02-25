import React from "react";
import { Link } from "react-router-dom";
import { Clock, Zap } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Button } from "@/components/ui/button";

export const TrialBanner = () => {
    const { plan, trialDaysRemaining, isTrialExpired } = useSubscription();

    if (plan !== "trial" || isTrialExpired) return null;

    const isLow = trialDaysRemaining <= 3;

    return (
        <div className={`w-full py-2 px-4 flex items-center justify-between transition-colors ${isLow ? "bg-destructive/10 text-destructive border-b border-destructive/20" : "bg-primary/10 text-primary border-b border-primary/20"
            }`}>
            <div className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4" />
                <span>
                    {isLow
                        ? `Trial ending soon! Only ${trialDaysRemaining} ${trialDaysRemaining === 1 ? 'day' : 'days'} left.`
                        : `You're on a free trial. ${trialDaysRemaining} days remaining.`}
                </span>
            </div>
            <Button asChild variant="link" size="sm" className={`h-auto p-0 font-bold underline gap-1 ${isLow ? "text-destructive hover:text-destructive/80" : "text-primary hover:text-primary/80"
                }`}>
                <Link to="/upgrade">
                    Upgrade Now
                    <Zap className="h-3 w-3 fill-current" />
                </Link>
            </Button>
        </div>
    );
};
