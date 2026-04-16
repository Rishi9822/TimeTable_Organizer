import React from 'react';
import { Link } from 'react-router-dom';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { School, GraduationCap, ArrowRight, Check } from 'lucide-react';

export const SecondSetupPrompt = () => {
    const {
        plan,
        activeMode,
        schoolSetupComplete,
        collegeSetupComplete,
        canSwitchMode
    } = useSubscription();

    // Only show for Flex users who haven't completed both setups
    if (plan !== 'flex' || canSwitchMode) {
        return null;
    }

    const missingSetup = !schoolSetupComplete ? 'school' : 'college';
    const completedSetup = schoolSetupComplete ? 'school' : 'college';

    return (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
                <div className="flex items-center gap-3">
                    {missingSetup === 'school' ? (
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                            <School className="h-6 w-6 text-blue-500" />
                        </div>
                    ) : (
                        <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                            <GraduationCap className="h-6 w-6 text-purple-500" />
                        </div>
                    )}
                    <div>
                        <CardTitle className="text-lg">
                            Complete Your {missingSetup === 'school' ? 'School' : 'College'} Setup
                        </CardTitle>
                        <CardDescription>
                            Enable mode switching by setting up your second institution type
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <Check className="h-4 w-4" />
                        <span className="capitalize">{completedSetup} setup complete</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <div className="h-4 w-4 rounded-full border-2 border-current" />
                        <span className="capitalize">{missingSetup} setup pending</span>
                    </div>
                </div>

                <p className="text-sm text-muted-foreground">
                    With the Flex plan, you can manage both School and College timetables
                    from a single account. Complete the {missingSetup} setup to unlock
                    the mode switcher and seamlessly switch between institution types.
                </p>

                <Link to={`/setup?mode=${missingSetup}`}>
                    <Button className="w-full gap-2">
                        Start {missingSetup === 'school' ? 'School' : 'College'} Setup
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                </Link>
            </CardContent>
        </Card>
    );
};
