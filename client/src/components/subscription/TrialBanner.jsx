import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Button } from '@/components/ui/button';
import { X, Clock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export const TrialBanner = () => {
    const { plan, trialDaysRemaining, isTrialExpired } = useSubscription();
    const [isDismissed, setIsDismissed] = useState(false);

    // Only show for trial users
    if (plan !== 'trial' || isDismissed) {
        return null;
    }

    const isUrgent = trialDaysRemaining <= 3;

    if (isTrialExpired) {
        return (
            <div className="bg-destructive text-destructive-foreground px-4 py-3">
                <div className="container mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5" />
                        <span className="font-medium">
                            Your trial has expired. Upgrade now to continue using all features.
                        </span>
                    </div>
                    <Link to="/upgrade">
                        <Button variant="secondary" size="sm" className="gap-2">
                            <Sparkles className="h-4 w-4" />
                            Upgrade Now
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div
            className={cn(
                "px-4 py-2.5 transition-colors",
                isUrgent
                    ? "bg-orange-500/10 border-b border-orange-500/20"
                    : "bg-primary/5 border-b border-primary/10"
            )}
        >
            <div className="container mx-auto flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Clock className={cn("h-4 w-4", isUrgent ? "text-orange-500" : "text-primary")} />
                    <span className={cn(
                        "text-sm",
                        isUrgent ? "text-orange-700 dark:text-orange-400 font-medium" : "text-muted-foreground"
                    )}>
                        {trialDaysRemaining === 1
                            ? "1 day remaining in your trial"
                            : `${trialDaysRemaining} days remaining in your trial`
                        }
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Link to="/upgrade">
                        <Button
                            variant={isUrgent ? "default" : "outline"}
                            size="sm"
                            className="gap-2 h-8 text-xs"
                        >
                            <Sparkles className="h-3 w-3" />
                            Upgrade
                        </Button>
                    </Link>
                    <button
                        onClick={() => setIsDismissed(true)}
                        className="text-muted-foreground hover:text-foreground p-1"
                        aria-label="Dismiss banner"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
