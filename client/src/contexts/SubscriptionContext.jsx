import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import API from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const SubscriptionContext = createContext(null);

export const useSubscription = () => {
    const ctx = useContext(SubscriptionContext);
    if (!ctx) throw new Error("useSubscription must be used within SubscriptionProvider");
    return ctx;
};

export const SubscriptionProvider = ({ children }) => {
    const { user, role } = useAuth();

    const [plan, setPlan] = useState(null);
    const [status, setStatus] = useState(null);
    const [trialDaysRemaining, setTrialDaysRemaining] = useState(null);
    const [isTrialExpired, setIsTrialExpired] = useState(false);
    const [activeMode, setActiveMode] = useState(null);
    const [canSwitchMode, setCanSwitchMode] = useState(false);
    const [schoolSetupComplete, setSchoolSetupComplete] = useState(false);
    const [collegeSetupComplete, setCollegeSetupComplete] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchSubscription = useCallback(async () => {
        // Super admin and unauthenticated users don't have a subscription
        if (!user || role === "super_admin" || !user.institutionId) {
            setLoading(false);
            return;
        }

        try {
            const { data } = await API.get("/institutions/info");
            setPlan(data.plan || null);
            setStatus(data.status || null);
            setTrialDaysRemaining(data.trialDaysRemaining ?? null);
            setIsTrialExpired(
                data.plan === "trial" && (data.trialDaysRemaining ?? 1) <= 0
            );
            setActiveMode(data.activeMode || null);
            setCanSwitchMode(data.canSwitchMode || false);
            setSchoolSetupComplete(data.schoolSetupComplete || false);
            setCollegeSetupComplete(data.collegeSetupComplete || false);
        } catch (err) {
            // 402 means trial expired — flag it
            if (err.response?.status === 402) {
                setIsTrialExpired(true);
            }
            console.error("[SubscriptionContext]", err.message);
        } finally {
            setLoading(false);
        }
    }, [user, role]);

    useEffect(() => {
        fetchSubscription();
    }, [fetchSubscription]);

    /**
     * Switch active mode (Flex plan only).
     * Server validates that both school + college are setup.
     */
    const switchMode = async (mode) => {
        const { data } = await API.post("/institutions/switch-mode", { mode });
        setActiveMode(mode);
        return data;
    };

    const refreshSubscription = () => fetchSubscription();

    return (
        <SubscriptionContext.Provider
            value={{
                plan,
                status,
                trialDaysRemaining,
                isTrialExpired,
                activeMode,
                canSwitchMode,
                schoolSetupComplete,
                collegeSetupComplete,
                loading,
                switchMode,
                refreshSubscription,
            }}
        >
            {children}
        </SubscriptionContext.Provider>
    );
};
