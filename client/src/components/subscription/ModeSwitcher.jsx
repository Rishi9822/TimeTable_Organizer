import React, { useState } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { School, GraduationCap, ChevronDown, ArrowLeftRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const ModeSwitcher = () => {
    const {
        plan,
        activeMode,
        canSwitchMode,
        switchMode,
        schoolSetupComplete,
        collegeSetupComplete
    } = useSubscription();
    const { toast } = useToast();
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [pendingMode, setPendingMode] = useState(null);
    const [isSwitching, setIsSwitching] = useState(false);

    // Only show for Flex users
    if (plan !== 'flex') {
        return null;
    }

    const handleModeSelect = (mode) => {
        if (mode === activeMode) return;

        if (!canSwitchMode) {
            toast({
                title: "Cannot switch mode",
                description: "Complete both School and College setups to enable mode switching.",
                variant: "destructive",
            });
            return;
        }

        setPendingMode(mode);
        setIsConfirmOpen(true);
    };

    const handleConfirmSwitch = async () => {
        if (!pendingMode) return;

        setIsSwitching(true);
        try {
            await switchMode(pendingMode);
            toast({
                title: "Mode switched",
                description: `Now viewing ${pendingMode === 'school' ? 'School' : 'College'} timetables.`,
            });
        } catch (error) {
            toast({
                title: "Switch failed",
                description: error instanceof Error ? error.message : "Failed to switch mode",
                variant: "destructive",
            });
        } finally {
            setIsSwitching(false);
            setIsConfirmOpen(false);
            setPendingMode(null);
        }
    };

    const getModeIcon = (mode) => {
        return mode === 'school'
            ? <School className="h-4 w-4" />
            : <GraduationCap className="h-4 w-4" />;
    };

    const getModeLabel = (mode) => {
        return mode === 'school' ? 'School' : 'College';
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                        {getModeIcon(activeMode)}
                        <span className="hidden sm:inline">{getModeLabel(activeMode)}</span>
                        <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                        onClick={() => handleModeSelect('school')}
                        disabled={!schoolSetupComplete}
                        className="gap-2"
                    >
                        <School className="h-4 w-4" />
                        <span>School Mode</span>
                        {activeMode === 'school' && (
                            <span className="ml-auto text-xs text-primary">Active</span>
                        )}
                        {!schoolSetupComplete && (
                            <span className="ml-auto text-xs text-muted-foreground">Not setup</span>
                        )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => handleModeSelect('college')}
                        disabled={!collegeSetupComplete}
                        className="gap-2"
                    >
                        <GraduationCap className="h-4 w-4" />
                        <span>College Mode</span>
                        {activeMode === 'college' && (
                            <span className="ml-auto text-xs text-primary">Active</span>
                        )}
                        {!collegeSetupComplete && (
                            <span className="ml-auto text-xs text-muted-foreground">Not setup</span>
                        )}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <ArrowLeftRight className="h-5 w-5" />
                            Switch to {pendingMode && getModeLabel(pendingMode)} Mode?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                            <p>
                                You are about to switch from <strong>{getModeLabel(activeMode)}</strong> to{' '}
                                <strong>{pendingMode && getModeLabel(pendingMode)}</strong> mode.
                            </p>
                            <p className="text-sm">
                                This will change the context of the timetable builder, showing different
                                classes, subjects, and teachers. Your {getModeLabel(activeMode)} data
                                will remain intact and accessible when you switch back.
                            </p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSwitching}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmSwitch} disabled={isSwitching}>
                            {isSwitching ? "Switching..." : "Switch Mode"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};
