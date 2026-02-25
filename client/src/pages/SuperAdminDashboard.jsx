import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import API from "@/lib/api";
import { toast } from "sonner";
import {
    Shield,
    Building2,
    Users as UsersIcon,
    CreditCard,
    Bell,
    CheckCircle2,
    PauseCircle,
    PlayCircle,
    Trash2,
    Ban,
    UserCheck,
    Send,
    History,
    ChevronRight,
    TrendingUp,
    AlertCircle,
    Calendar,
    Plus
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─── API helpers ──────────────────────────────────────────────────────────────
const saApi = {
    getStats: () => API.get("/super-admin/stats").then((r) => r.data),
    getInstitutions: () => API.get("/super-admin/institutions").then((r) => r.data),
    getUsers: () => API.get("/super-admin/users").then((r) => r.data),
    getSubscriptions: () => API.get("/super-admin/subscriptions").then((r) => r.data),
    getNotifications: () => API.get("/super-admin/notifications").then((r) => r.data),

    suspendInstitution: (id) => API.patch(`/super-admin/institutions/${id}/suspend`),
    activateInstitution: (id) => API.patch(`/super-admin/institutions/${id}/activate`),
    deleteInstitution: (id) => API.delete(`/super-admin/institutions/${id}`),
    blockUser: (id) => API.patch(`/super-admin/users/${id}/block`),
    unblockUser: (id) => API.patch(`/super-admin/users/${id}/unblock`),
    changeRole: (id, role) => API.patch(`/super-admin/users/${id}/role`, { role }),
    extendTrial: (institutionId, days) => API.patch(`/super-admin/subscriptions/${institutionId}/extend-trial`, { days }),
    updatePlan: (institutionId, plan) => API.patch(`/super-admin/subscriptions/${institutionId}/update-plan`, { plan }),
    cancelSub: (institutionId) => API.patch(`/super-admin/subscriptions/${institutionId}/cancel`),
    sendNotification: (data) => API.post("/super-admin/notifications/send", data),
};

export default function SuperAdminDashboard() {
    const { role } = useAuth();
    const navigate = useNavigate();
    const qc = useQueryClient();

    // Redirect non-super-admins
    if (role && role !== "super_admin") {
        navigate("/");
        return null;
    }

    return (
        <DashboardLayout
            title="Super Admin Dashboard"
            subtitle="Platform-wide management and monitoring console"
        >
            <Tabs defaultValue="Overview" className="space-y-6">
                <TabsList className="bg-background/50 border border-border/50 p-1">
                    <TabsTrigger value="Overview" className="gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Overview
                    </TabsTrigger>
                    <TabsTrigger value="Tenants" className="gap-2">
                        <Building2 className="w-4 h-4" />
                        Tenants
                    </TabsTrigger>
                    <TabsTrigger value="Users" className="gap-2">
                        <UsersIcon className="w-4 h-4" />
                        Users
                    </TabsTrigger>
                    <TabsTrigger value="Subscriptions" className="gap-2">
                        <CreditCard className="w-4 h-4" />
                        Subscriptions
                    </TabsTrigger>
                    <TabsTrigger value="Notifications" className="gap-2">
                        <Bell className="w-4 h-4" />
                        Notifications
                    </TabsTrigger>
                </TabsList>

                <div className="mt-6">
                    <TabsContent value="Overview">
                        <OverviewTab />
                    </TabsContent>
                    <TabsContent value="Tenants">
                        <TenantsTab qc={qc} />
                    </TabsContent>
                    <TabsContent value="Users">
                        <UsersTab qc={qc} />
                    </TabsContent>
                    <TabsContent value="Subscriptions">
                        <SubsTab qc={qc} />
                    </TabsContent>
                    <TabsContent value="Notifications">
                        <NotificationsTab />
                    </TabsContent>
                </div>
            </Tabs>
        </DashboardLayout>
    );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab() {
    const { data: stats, isLoading } = useQuery({ queryKey: ["sa-stats"], queryFn: saApi.getStats });

    const cards = stats
        ? [
            { label: "Total Orgs", value: stats.total_orgs, icon: <Building2 className="w-6 h-6 text-indigo-400" />, color: "border-indigo-500/30" },
            { label: "Active", value: stats.active_orgs, icon: <CheckCircle2 className="w-6 h-6 text-emerald-400" />, color: "border-emerald-500/30" },
            { label: "Suspended", value: stats.suspended_orgs, icon: <PauseCircle className="w-6 h-6 text-amber-400" />, color: "border-amber-500/30" },
            { label: "Total Users", value: stats.total_users, icon: <UsersIcon className="w-6 h-6 text-blue-400" />, color: "border-blue-500/30" },
            { label: "Trial Plans", value: stats.trial_subs, icon: <Shield className="w-6 h-6 text-purple-400" />, color: "border-purple-500/30" },
            { label: "Standard Plans", value: stats.standard_subs, icon: <CreditCard className="w-6 h-6 text-cyan-400" />, color: "border-cyan-500/30" },
            { label: "Flex Plans", value: stats.flex_subs, icon: <TrendingUp className="w-6 h-6 text-pink-400" />, color: "border-pink-500/30" },
        ]
        : [];

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold tracking-tight text-foreground">Platform Overview</h2>
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(7)].map((_, i) => (
                        <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {cards.map((c) => (
                        <Card key={c.label} className={`bg-card/40 backdrop-blur-sm border-l-4 ${c.color} hover:bg-card/60 transition-colors cursor-default`}>
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="p-2 rounded-lg bg-background/50 border border-border/50">
                                        {c.icon}
                                    </div>
                                    <span className="text-3xl font-bold leading-none">{c.value ?? "—"}</span>
                                </div>
                                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{c.label}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Tenants Tab ──────────────────────────────────────────────────────────────
function TenantsTab({ qc }) {
    const { data: institutions, isLoading } = useQuery({ queryKey: ["sa-institutions"], queryFn: saApi.getInstitutions });

    const suspend = useMutation({
        mutationFn: (id) => saApi.suspendInstitution(id),
        onSuccess: () => {
            qc.invalidateQueries(["sa-institutions"]);
            qc.invalidateQueries(["sa-stats"]);
            toast.success("Institution suspended");
        },
    });

    const activate = useMutation({
        mutationFn: (id) => saApi.activateInstitution(id),
        onSuccess: () => {
            qc.invalidateQueries(["sa-institutions"]);
            qc.invalidateQueries(["sa-stats"]);
            toast.success("Institution activated");
        },
    });

    const archive = useMutation({
        mutationFn: (id) => saApi.deleteInstitution(id),
        onSuccess: () => {
            qc.invalidateQueries(["sa-institutions"]);
            qc.invalidateQueries(["sa-stats"]);
            toast.success("Institution archived");
        },
    });

    const getStatusBadge = (status) => {
        switch (status) {
            case "active": return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-2 py-0 border capitalize">{status}</Badge>;
            case "suspended": return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 px-2 py-0 border capitalize">{status}</Badge>;
            case "trial": return <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20 px-2 py-0 border capitalize">{status}</Badge>;
            default: return <Badge variant="outline" className="bg-muted text-muted-foreground px-2 py-0 border capitalize">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight text-foreground">All Tenants</h2>
                <Badge variant="hero" className="px-3">{institutions?.length || 0} Total</Badge>
            </div>

            <Card className="bg-card/40 backdrop-blur-sm border-border/50">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="font-semibold text-foreground">Name</TableHead>
                                <TableHead className="font-semibold text-foreground">Status</TableHead>
                                <TableHead className="font-semibold text-foreground">Plan</TableHead>
                                <TableHead className="font-semibold text-foreground">Admin</TableHead>
                                <TableHead className="font-semibold text-foreground">Created</TableHead>
                                <TableHead className="font-semibold text-foreground text-right px-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={6} className="h-16 bg-muted/10 animate-pulse" />
                                    </TableRow>
                                ))
                            ) : (institutions || []).map((inst) => (
                                <TableRow key={inst._id} className="group border-b border-border/30 hover:bg-muted/20 transition-colors">
                                    <TableCell className="font-medium text-foreground py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                                                <Building2 className="w-4 h-4" />
                                            </div>
                                            {inst.name}
                                        </div>
                                    </TableCell>
                                    <TableCell>{getStatusBadge(inst.status)}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="px-2 py-0 uppercase text-[10px] tracking-wider font-bold">
                                            {inst.plan || "—"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-xs font-mono">
                                        {inst.admin?.email || "—"}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-xs">
                                        {new Date(inst.createdAt).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right px-6">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {inst.status !== "active" && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10 hover:border-emerald-500/30 gap-1"
                                                    onClick={() => activate.mutate(inst._id)}
                                                    disabled={activate.isPending}
                                                >
                                                    <PlayCircle className="w-3.5 h-3.5" />
                                                    Activate
                                                </Button>
                                            )}
                                            {inst.status === "active" && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 border-amber-500/20 text-amber-500 hover:bg-amber-500/10 hover:border-amber-500/30 gap-1"
                                                    onClick={() => suspend.mutate(inst._id)}
                                                    disabled={suspend.isPending}
                                                >
                                                    <PauseCircle className="w-3.5 h-3.5" />
                                                    Suspend
                                                </Button>
                                            )}
                                            {inst.status !== "archived" && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive gap-1"
                                                    onClick={() => { if (window.confirm("Archive this institution?")) archive.mutate(inst._id); }}
                                                    disabled={archive.isPending}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    Archive
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────
function UsersTab({ qc }) {
    const { data: users, isLoading } = useQuery({ queryKey: ["sa-users"], queryFn: saApi.getUsers });

    const block = useMutation({
        mutationFn: (id) => saApi.blockUser(id),
        onSuccess: () => {
            qc.invalidateQueries(["sa-users"]);
            toast.success("User blocked");
        }
    });

    const unblock = useMutation({
        mutationFn: (id) => saApi.unblockUser(id),
        onSuccess: () => {
            qc.invalidateQueries(["sa-users"]);
            toast.success("User unblocked");
        }
    });

    const changeRole = useMutation({
        mutationFn: ({ id, role }) => saApi.changeRole(id, role),
        onSuccess: () => {
            qc.invalidateQueries(["sa-users"]);
            toast.success("User role updated");
        }
    });

    const ROLES = ["admin", "scheduler", "teacher", "student"];

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight text-foreground">All Users</h2>
                <Badge variant="hero" className="px-3">{users?.length || 0} Total</Badge>
            </div>

            <Card className="bg-card/40 backdrop-blur-sm border-border/50">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="font-semibold text-foreground">User</TableHead>
                                <TableHead className="font-semibold text-foreground">Role</TableHead>
                                <TableHead className="font-semibold text-foreground">Institution</TableHead>
                                <TableHead className="font-semibold text-foreground">Status</TableHead>
                                <TableHead className="font-semibold text-foreground text-right px-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={5} className="h-16 bg-muted/10 animate-pulse" />
                                    </TableRow>
                                ))
                            ) : (users || []).map((u) => (
                                <TableRow key={u._id} className="group border-b border-border/30 hover:bg-muted/20 transition-colors">
                                    <TableCell className="py-4">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-foreground flex items-center gap-2">
                                                {u.name}
                                            </span>
                                            <span className="text-muted-foreground text-xs font-mono">{u.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <select
                                            value={u.role}
                                            onChange={(e) => changeRole.mutate({ id: u._id, role: e.target.value })}
                                            className="bg-background/80 border border-border/50 rounded-lg py-1 px-3 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none transition-all cursor-pointer hover:bg-background"
                                        >
                                            {ROLES.map((r) => <option key={r} value={r} className="bg-background capitalize">{r}</option>)}
                                        </select>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Building2 className="w-3.5 h-3.5" />
                                            <span className="text-sm truncate max-w-[150px]">{u.institutionName || "—"}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={u.isBlocked
                                                ? "bg-destructive/10 text-destructive border-destructive/20"
                                                : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                            }
                                        >
                                            {u.isBlocked ? "Blocked" : "Active"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right px-6">
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            {u.isBlocked ? (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10 gap-1.5"
                                                    onClick={() => unblock.mutate(u._id)}
                                                    disabled={unblock.isPending}
                                                >
                                                    <UserCheck className="w-3.5 h-3.5" />
                                                    Unblock
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 text-destructive hover:bg-destructive/10 gap-1.5"
                                                    onClick={() => { if (window.confirm("Block this user?")) block.mutate(u._id); }}
                                                    disabled={block.isPending}
                                                >
                                                    <Ban className="w-3.5 h-3.5" />
                                                    Block
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
}

// ─── Subscriptions Tab ────────────────────────────────────────────────────────
function SubsTab({ qc }) {
    const { data: subs, isLoading } = useQuery({ queryKey: ["sa-subs"], queryFn: saApi.getSubscriptions });
    const [extendDays, setExtendDays] = useState({});

    const extendTrial = useMutation({
        mutationFn: ({ institutionId, days }) => saApi.extendTrial(institutionId, days),
        onSuccess: () => {
            qc.invalidateQueries(["sa-subs"]);
            toast.success("Trial extended successfully");
        }
    });

    const updatePlan = useMutation({
        mutationFn: ({ institutionId, plan }) => saApi.updatePlan(institutionId, plan),
        onSuccess: () => {
            qc.invalidateQueries(["sa-subs"]);
            toast.success("Subscription plan updated");
        }
    });

    const cancelSub = useMutation({
        mutationFn: (id) => saApi.cancelSub(id),
        onSuccess: () => {
            qc.invalidateQueries(["sa-subs"]);
            toast.success("Subscription cancelled");
        }
    });

    const getPlanBadge = (plan) => {
        switch (plan) {
            case "flex": return <Badge variant="outline" className="bg-pink-500/10 text-pink-500 border-pink-500/20 uppercase font-bold text-[10px] tracking-widest">{plan}</Badge>;
            case "standard": return <Badge variant="outline" className="bg-cyan-500/10 text-cyan-500 border-cyan-500/20 uppercase font-bold text-[10px] tracking-widest">{plan}</Badge>;
            default: return <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20 uppercase font-bold text-[10px] tracking-widest">{plan}</Badge>;
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-tight text-foreground">Subscriptions</h2>
                <Badge variant="hero" className="px-3">{subs?.length || 0} Total</Badge>
            </div>

            <Card className="bg-card/40 backdrop-blur-sm border-border/50">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="font-semibold text-foreground">Institution</TableHead>
                                <TableHead className="font-semibold text-foreground">Current Plan</TableHead>
                                <TableHead className="font-semibold text-foreground">Status</TableHead>
                                <TableHead className="font-semibold text-foreground">Trial Ends</TableHead>
                                <TableHead className="font-semibold text-foreground text-right px-6">Manage</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={5} className="h-16 bg-muted/10 animate-pulse" />
                                    </TableRow>
                                ))
                            ) : (subs || []).map((s) => (
                                <TableRow key={s._id} className="group border-b border-border/30 hover:bg-muted/20 transition-colors">
                                    <TableCell className="py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                                                <Building2 className="w-4 h-4" />
                                            </div>
                                            <span className="font-medium text-foreground">{s.institutionName}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <select
                                            value={s.plan}
                                            onChange={(e) => updatePlan.mutate({ institutionId: s.institutionId, plan: e.target.value })}
                                            className="bg-background/80 border border-border/50 rounded-lg py-1 px-3 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none transition-all cursor-pointer hover:bg-background"
                                        >
                                            {["trial", "standard", "flex"].map((p) => <option key={p} value={p} className="bg-background capitalize">{p}</option>)}
                                        </select>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={s.status === "active" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-muted text-muted-foreground"}>
                                            {s.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-xs">
                                        {s.trialEndsAt ? (
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {new Date(s.trialEndsAt).toLocaleDateString()}
                                            </div>
                                        ) : "—"}
                                    </TableCell>
                                    <TableCell className="text-right px-6">
                                        <div className="flex items-center justify-end gap-3">
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    placeholder="Days"
                                                    className="w-20 h-8 text-xs px-2"
                                                    value={extendDays[s._id] || ""}
                                                    onChange={(e) => setExtendDays((prev) => ({ ...prev, [s._id]: e.target.value }))}
                                                />
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 gap-1"
                                                    onClick={() => extendTrial.mutate({ institutionId: s.institutionId, days: Number(extendDays[s._id] || 7) })}
                                                    disabled={extendTrial.isPending}
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                    <span className="hidden sm:inline">Extend</span>
                                                </Button>
                                            </div>
                                            {s.status !== "cancelled" && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 text-destructive hover:bg-destructive/10"
                                                    onClick={() => { if (window.confirm("Cancel subscription?")) cancelSub.mutate(s.institutionId); }}
                                                    disabled={cancelSub.isPending}
                                                >
                                                    Cancel
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
}

// ─── Notifications Tab ────────────────────────────────────────────────────────
function NotificationsTab() {
    const qc = useQueryClient();
    const { data: history } = useQuery({ queryKey: ["sa-notifs"], queryFn: saApi.getNotifications });

    const [form, setForm] = useState({ title: "", message: "", channel: "in_app", audienceType: "all_users", audienceId: "" });
    const [sending, setSending] = useState(false);

    const send = async () => {
        if (!form.title || !form.message) return;
        setSending(true);
        try {
            await saApi.sendNotification(form);
            qc.invalidateQueries(["sa-notifs"]);
            setForm({ title: "", message: "", channel: "in_app", audienceType: "all_users", audienceId: "" });
            toast.success("Notification sent successfully");
        } catch (e) {
            toast.error(e.response?.data?.message || "Failed to send notification");
        } finally {
            setSending(false);
        }
    };

    const CHANNEL_OPTIONS = [{ val: "in_app", lbl: "In-App Dashboard" }, { val: "email", lbl: "Direct Email" }, { val: "both", lbl: "Both" }];
    const AUDIENCE_OPTIONS = [
        { val: "all_users", lbl: "All Active Users" },
        { val: "all_tenants", lbl: "All Admin Users (Tenants)" },
        { val: "institution", lbl: "Specific Institution" },
        { val: "user", lbl: "Specific User" }
    ];

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Compose */}
            <Card className="bg-card/40 backdrop-blur-sm border-border/50 h-fit">
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Send className="w-5 h-5 text-primary" />
                        Compose Notification
                    </CardTitle>
                    <CardDescription>Send targeted broadccast or direct notifications to users.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Notification Title</Label>
                        <Input
                            value={form.title}
                            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                            placeholder="e.g. Platform Maintenance Notice"
                            className="bg-background/50"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Detailed Message</Label>
                        <textarea
                            className="w-full bg-background/50 border border-border/50 rounded-lg p-3 min-h-[120px] text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none transition-all placeholder:text-muted-foreground"
                            value={form.message}
                            onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                            placeholder="Write your announcement here..."
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Delivery Channel</Label>
                            <select
                                className="w-full bg-background/50 border border-border/50 rounded-lg h-10 px-3 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none transition-all cursor-pointer"
                                value={form.channel}
                                onChange={(e) => setForm((p) => ({ ...p, channel: e.target.value }))}
                            >
                                {CHANNEL_OPTIONS.map((c) => <option key={c.val} value={c.val} className="bg-background">{c.lbl}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>Target Audience</Label>
                            <select
                                className="w-full bg-background/50 border border-border/50 rounded-lg h-10 px-3 text-sm focus:ring-2 focus:ring-primary/40 focus:outline-none transition-all cursor-pointer"
                                value={form.audienceType}
                                onChange={(e) => setForm((p) => ({ ...p, audienceType: e.target.value }))}
                            >
                                {AUDIENCE_OPTIONS.map((a) => <option key={a.val} value={a.val} className="bg-background">{a.lbl}</option>)}
                            </select>
                        </div>
                    </div>
                    {(form.audienceType === "institution" || form.audienceType === "user") && (
                        <div className="space-y-2 pt-2 animate-in slide-in-from-top-4 duration-300">
                            <Label>Recipient ID (MongoDB ObjectId)</Label>
                            <Input
                                value={form.audienceId}
                                onChange={(e) => setForm((p) => ({ ...p, audienceId: e.target.value }))}
                                placeholder="Paste the target ID here..."
                                className="bg-background/80 font-mono text-xs"
                            />
                        </div>
                    )}
                    <Button
                        className="w-full mt-4 h-11 font-bold tracking-wide"
                        variant="hero"
                        onClick={send}
                        disabled={sending || !form.title || !form.message}
                    >
                        {sending ? (
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                Processing...
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Send className="w-4 h-4" />
                                Send Notification
                            </div>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* History */}
            <Card className="bg-card/40 backdrop-blur-sm border-border/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <History className="w-5 h-5 text-indigo-400" />
                            Sent History
                        </CardTitle>
                        <CardDescription>Review recent platform announcements.</CardDescription>
                    </div>
                    <Badge variant="hero" className="rounded-lg">{history?.length || 0} Sent</Badge>
                </CardHeader>
                <CardContent className="h-[550px] overflow-y-auto pr-2 custom-scrollbar">
                    {(history || []).length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
                            <Bell className="w-12 h-12 opacity-20" />
                            <p className="text-sm">No notification history yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {(history || []).map((n) => (
                                <div key={n._id} className="group relative border border-border/30 rounded-xl p-4 bg-background/30 hover:bg-background/60 transition-all hover:border-border/60">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-semibold text-foreground text-sm leading-tight pr-4">{n.title}</h4>
                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap bg-muted/50 px-2 py-0.5 rounded uppercase font-bold">
                                            {new Date(n.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-3 mb-3 leading-relaxed">
                                        {n.message}
                                    </p>
                                    <div className="flex items-center gap-4 border-t border-border/20 pt-3">
                                        <div className="flex items-center gap-1.5">
                                            <Send className="w-3 h-3 text-indigo-400" />
                                            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">{n.channel}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <UsersIcon className="w-3 h-3 text-emerald-400" />
                                            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider truncate max-w-[120px]">
                                                {n.audienceType.replace("_", " ")}
                                                {n.recipientCount !== undefined && ` (${n.recipientCount})`}
                                            </span>
                                        </div>
                                        {n.sentBy && (
                                            <div className="ml-auto text-[10px] text-muted-foreground italic flex items-center gap-1">
                                                <UserCheck className="w-3 h-3" />
                                                {n.sentBy.name || "System"}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
