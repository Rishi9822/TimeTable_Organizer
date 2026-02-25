import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { TrialBanner } from "@/components/subscription/TrialBanner";
import { ModeSwitcher } from "@/components/subscription/ModeSwitcher";
import { UserMenu } from "@/components/auth/UserMenu";
import NotificationBell from "@/components/notifications/NotificationBell";
import { Calendar } from "lucide-react";

export const DashboardLayout = ({ children, title, subtitle, showModeSwitcher = true, headerActions }) => {
    const { user, role } = useAuth();
    const { plan } = useSubscription();

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* SaaS Trial Banner (Sticky at the very top) */}
            <TrialBanner />

            {/* Main Header */}
            <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-4">
                            <Link to={role === "super_admin" ? "/super-admin" : "/admin"}>
                                <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
                                    <Calendar className="h-5 w-5 text-primary-foreground" />
                                </div>
                            </Link>
                            <div className="hidden sm:block">
                                <h1 className="text-lg font-semibold text-foreground leading-tight">
                                    {title || "Dashboard"}
                                </h1>
                                {subtitle && (
                                    <p className="text-xs text-muted-foreground">
                                        {subtitle}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Flex Mode Switcher */}
                            {showModeSwitcher && <ModeSwitcher />}

                            <div className="flex items-center gap-2">
                                {headerActions}
                                <div className="h-6 w-[1px] bg-border mx-1 hidden md:block" />
                                <NotificationBell />
                                <UserMenu />
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {children}
            </main>

            {/* Footer / Branding */}
            <footer className="py-6 border-t border-border/40 mt-auto">
                <div className="container mx-auto px-4 text-center">
                    <p className="text-xs text-muted-foreground">
                        &copy; {new Date().getFullYear()} TimeTable Organizer. Powered by Lovable Architecture.
                    </p>
                </div>
            </footer>
        </div>
    );
};
