import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import API from "@/lib/api";
import { useToast } from "@/hooks/useToast";

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

const TABS = ["Overview", "Tenants", "Users", "Subscriptions", "Notifications"];

export default function SuperAdminDashboard() {
    const { role } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("Overview");
    const qc = useQueryClient();
    const { toast } = useToast();

    // Redirect non-super-admins
    if (role && role !== "super_admin") {
        navigate("/");
        return null;
    }

    return (
        <div style={{ minHeight: "100vh", background: "#0f1117", color: "#e2e8f0", fontFamily: "Inter, sans-serif" }}>
            {/* Header */}
            <div style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)", padding: "24px 40px", borderBottom: "1px solid rgba(99,102,241,0.3)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🛡️</div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#c7d2fe" }}>Super Admin Dashboard</h1>
                        <p style={{ margin: 0, fontSize: 13, color: "#818cf8" }}>Platform-wide management console</p>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ display: "flex", gap: 4, marginTop: 24 }}>
                    {TABS.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14, transition: "all 0.15s",
                                background: activeTab === tab ? "rgba(99,102,241,0.3)" : "transparent",
                                color: activeTab === tab ? "#a5b4fc" : "#64748b",
                                borderBottom: activeTab === tab ? "2px solid #6366f1" : "2px solid transparent",
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div style={{ padding: "32px 40px" }}>
                {activeTab === "Overview" && <OverviewTab />}
                {activeTab === "Tenants" && <TenantsTab qc={qc} />}
                {activeTab === "Users" && <UsersTab qc={qc} />}
                {activeTab === "Subscriptions" && <SubsTab qc={qc} />}
                {activeTab === "Notifications" && <NotificationsTab />}
            </div>
        </div>
    );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab() {
    const { data: stats, isLoading } = useQuery({ queryKey: ["sa-stats"], queryFn: saApi.getStats });

    const cards = stats
        ? [
            { label: "Total Orgs", value: stats.total_orgs, icon: "🏛️", color: "#6366f1" },
            { label: "Active", value: stats.active_orgs, icon: "✅", color: "#10b981" },
            { label: "Suspended", value: stats.suspended_orgs, icon: "⏸️", color: "#f59e0b" },
            { label: "Total Users", value: stats.total_users, icon: "👥", color: "#3b82f6" },
            { label: "Trial Plans", value: stats.trial_subs, icon: "🔬", color: "#8b5cf6" },
            { label: "Standard Plans", value: stats.standard_subs, icon: "⭐", color: "#06b6d4" },
            { label: "Flex Plans", value: stats.flex_subs, icon: "🔄", color: "#ec4899" },
        ]
        : [];

    return (
        <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: "#c7d2fe" }}>Platform Overview</h2>
            {isLoading ? (
                <p style={{ color: "#64748b" }}>Loading stats…</p>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
                    {cards.map((c) => (
                        <div key={c.label} style={{ background: "rgba(30,27,75,0.6)", border: `1px solid ${c.color}40`, borderRadius: 12, padding: "20px", textAlign: "center" }}>
                            <div style={{ fontSize: 28, marginBottom: 8 }}>{c.icon}</div>
                            <div style={{ fontSize: 32, fontWeight: 800, color: c.color }}>{c.value ?? "—"}</div>
                            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>{c.label}</div>
                        </div>
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
        onSuccess: () => { qc.invalidateQueries(["sa-institutions"]); qc.invalidateQueries(["sa-stats"]); },
    });
    const activate = useMutation({
        mutationFn: (id) => saApi.activateInstitution(id),
        onSuccess: () => { qc.invalidateQueries(["sa-institutions"]); qc.invalidateQueries(["sa-stats"]); },
    });
    const archive = useMutation({
        mutationFn: (id) => saApi.deleteInstitution(id),
        onSuccess: () => { qc.invalidateQueries(["sa-institutions"]); qc.invalidateQueries(["sa-stats"]); },
    });

    const STATUS_COLORS = { active: "#10b981", suspended: "#f59e0b", trial: "#8b5cf6", archived: "#64748b" };

    return (
        <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: "#c7d2fe" }}>All Tenants</h2>
            {isLoading ? <p style={{ color: "#64748b" }}>Loading…</p> : (
                <TableWrapper>
                    <thead>
                        <tr style={{ borderBottom: "1px solid rgba(99,102,241,0.2)" }}>
                            {["Name", "Status", "Plan", "Admin", "Created", "Actions"].map((h) => <Th key={h}>{h}</Th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {(institutions || []).map((inst) => (
                            <tr key={inst._id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                <Td>{inst.name}</Td>
                                <Td><Badge color={STATUS_COLORS[inst.status] || "#64748b"}>{inst.status}</Badge></Td>
                                <Td><Badge color="#6366f1">{inst.plan || "—"}</Badge></Td>
                                <Td style={{ fontSize: 12 }}>{inst.admin?.email || "—"}</Td>
                                <Td style={{ fontSize: 12 }}>{new Date(inst.createdAt).toLocaleDateString()}</Td>
                                <Td>
                                    <div style={{ display: "flex", gap: 6 }}>
                                        {inst.status !== "active" && <ActionBtn color="#10b981" onClick={() => activate.mutate(inst._id)}>Activate</ActionBtn>}
                                        {inst.status === "active" && <ActionBtn color="#f59e0b" onClick={() => suspend.mutate(inst._id)}>Suspend</ActionBtn>}
                                        {inst.status !== "archived" && <ActionBtn color="#ef4444" onClick={() => { if (window.confirm("Archive this institution?")) archive.mutate(inst._id); }}>Archive</ActionBtn>}
                                    </div>
                                </Td>
                            </tr>
                        ))}
                    </tbody>
                </TableWrapper>
            )}
        </div>
    );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────
function UsersTab({ qc }) {
    const { data: users, isLoading } = useQuery({ queryKey: ["sa-users"], queryFn: saApi.getUsers });

    const block = useMutation({ mutationFn: (id) => saApi.blockUser(id), onSuccess: () => qc.invalidateQueries(["sa-users"]) });
    const unblock = useMutation({ mutationFn: (id) => saApi.unblockUser(id), onSuccess: () => qc.invalidateQueries(["sa-users"]) });
    const changeRole = useMutation({ mutationFn: ({ id, role }) => saApi.changeRole(id, role), onSuccess: () => qc.invalidateQueries(["sa-users"]) });

    const ROLES = ["admin", "scheduler", "teacher", "student"];
    const ROLE_COLORS = { admin: "#6366f1", scheduler: "#3b82f6", teacher: "#10b981", student: "#94a3b8" };

    return (
        <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: "#c7d2fe" }}>All Users</h2>
            {isLoading ? <p style={{ color: "#64748b" }}>Loading…</p> : (
                <TableWrapper>
                    <thead>
                        <tr style={{ borderBottom: "1px solid rgba(99,102,241,0.2)" }}>
                            {["Name", "Email", "Role", "Institution", "Status", "Actions"].map((h) => <Th key={h}>{h}</Th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {(users || []).map((u) => (
                            <tr key={u._id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                <Td>{u.name}</Td>
                                <Td style={{ fontSize: 12, color: "#94a3b8" }}>{u.email}</Td>
                                <Td>
                                    <select
                                        value={u.role}
                                        onChange={(e) => changeRole.mutate({ id: u._id, role: e.target.value })}
                                        style={{ background: "#1e1b4b", color: ROLE_COLORS[u.role] || "#e2e8f0", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 6, padding: "4px 8px", fontSize: 12, cursor: "pointer" }}
                                    >
                                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </Td>
                                <Td style={{ fontSize: 12 }}>{u.institutionName || "—"}</Td>
                                <Td><Badge color={u.isBlocked ? "#ef4444" : "#10b981"}>{u.isBlocked ? "Blocked" : "Active"}</Badge></Td>
                                <Td>
                                    {u.isBlocked
                                        ? <ActionBtn color="#10b981" onClick={() => unblock.mutate(u._id)}>Unblock</ActionBtn>
                                        : <ActionBtn color="#ef4444" onClick={() => block.mutate(u._id)}>Block</ActionBtn>
                                    }
                                </Td>
                            </tr>
                        ))}
                    </tbody>
                </TableWrapper>
            )}
        </div>
    );
}

// ─── Subscriptions Tab ────────────────────────────────────────────────────────
function SubsTab({ qc }) {
    const { data: subs, isLoading } = useQuery({ queryKey: ["sa-subs"], queryFn: saApi.getSubscriptions });
    const [extendDays, setExtendDays] = useState({});

    const extendTrial = useMutation({ mutationFn: ({ institutionId, days }) => saApi.extendTrial(institutionId, days), onSuccess: () => qc.invalidateQueries(["sa-subs"]) });
    const updatePlan = useMutation({ mutationFn: ({ institutionId, plan }) => saApi.updatePlan(institutionId, plan), onSuccess: () => qc.invalidateQueries(["sa-subs"]) });
    const cancelSub = useMutation({ mutationFn: (id) => saApi.cancelSub(id), onSuccess: () => qc.invalidateQueries(["sa-subs"]) });

    const PLAN_COLORS = { trial: "#8b5cf6", standard: "#06b6d4", flex: "#ec4899" };
    const STATUS_COLORS = { active: "#10b981", expired: "#ef4444", cancelled: "#f59e0b" };

    return (
        <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: "#c7d2fe" }}>All Subscriptions</h2>
            {isLoading ? <p style={{ color: "#64748b" }}>Loading…</p> : (
                <TableWrapper>
                    <thead>
                        <tr style={{ borderBottom: "1px solid rgba(99,102,241,0.2)" }}>
                            {["Institution", "Plan", "Status", "Trial Ends", "Actions"].map((h) => <Th key={h}>{h}</Th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {(subs || []).map((s) => (
                            <tr key={s._id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                                <Td>{s.institutionName}</Td>
                                <Td>
                                    <select
                                        value={s.plan}
                                        onChange={(e) => updatePlan.mutate({ institutionId: s.institutionId, plan: e.target.value })}
                                        style={{ background: "#1e1b4b", color: PLAN_COLORS[s.plan] || "#e2e8f0", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 6, padding: "4px 8px", fontSize: 12, cursor: "pointer" }}
                                    >
                                        {["trial", "standard", "flex"].map((p) => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </Td>
                                <Td><Badge color={STATUS_COLORS[s.status] || "#64748b"}>{s.status}</Badge></Td>
                                <Td style={{ fontSize: 12 }}>{s.trialEndsAt ? new Date(s.trialEndsAt).toLocaleDateString() : "—"}</Td>
                                <Td>
                                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                        {s.plan === "trial" && (
                                            <>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    placeholder="days"
                                                    value={extendDays[s._id] || ""}
                                                    onChange={(e) => setExtendDays((prev) => ({ ...prev, [s._id]: e.target.value }))}
                                                    style={{ width: 60, background: "#1e1b4b", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 6, padding: "4px 6px", color: "#e2e8f0", fontSize: 12 }}
                                                />
                                                <ActionBtn color="#6366f1" onClick={() => extendTrial.mutate({ institutionId: s.institutionId, days: Number(extendDays[s._id] || 7) })}>+Days</ActionBtn>
                                            </>
                                        )}
                                        {s.status !== "cancelled" && (
                                            <ActionBtn color="#ef4444" onClick={() => { if (window.confirm("Cancel subscription?")) cancelSub.mutate(s.institutionId); }}>Cancel</ActionBtn>
                                        )}
                                    </div>
                                </Td>
                            </tr>
                        ))}
                    </tbody>
                </TableWrapper>
            )}
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
            toast({ title: "Notification sent", description: "All recipients have been notified.", variant: "default" });
        } catch (e) {
            toast({ title: "Error sending notification", description: e.response?.data?.message || "Something went wrong", variant: "destructive" });
        } finally {
            setSending(false);
        }
    };

    const inputStyle = { width: "100%", background: "#1e1b4b", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 8, padding: "10px 12px", color: "#e2e8f0", fontSize: 14, boxSizing: "border-box" };
    const labelStyle = { display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 6, fontWeight: 600 };
    const CHANNEL_OPTIONS = ["in_app", "email", "both"];
    const AUDIENCE_OPTIONS = ["all_users", "all_tenants", "institution", "user"];

    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
            {/* Compose */}
            <div style={{ background: "rgba(30,27,75,0.6)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 16, padding: 24 }}>
                <h3 style={{ margin: "0 0 20px 0", color: "#c7d2fe", fontSize: 16 }}>📢 Compose Notification</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                        <label style={labelStyle}>Title</label>
                        <input style={inputStyle} value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Notification title" />
                    </div>
                    <div>
                        <label style={labelStyle}>Message</label>
                        <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} placeholder="Notification message" />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                            <label style={labelStyle}>Channel</label>
                            <select style={inputStyle} value={form.channel} onChange={(e) => setForm((p) => ({ ...p, channel: e.target.value }))}>
                                {CHANNEL_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Audience Type</label>
                            <select style={inputStyle} value={form.audienceType} onChange={(e) => setForm((p) => ({ ...p, audienceType: e.target.value }))}>
                                {AUDIENCE_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                    </div>
                    {(form.audienceType === "institution" || form.audienceType === "user") && (
                        <div>
                            <label style={labelStyle}>Audience ID ({form.audienceType} MongoDB ID)</label>
                            <input style={inputStyle} value={form.audienceId} onChange={(e) => setForm((p) => ({ ...p, audienceId: e.target.value }))} placeholder="MongoDB ObjectId" />
                        </div>
                    )}
                    <button
                        onClick={send}
                        disabled={sending || !form.title || !form.message}
                        style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", border: "none", borderRadius: 8, padding: "12px", fontWeight: 700, cursor: sending ? "not-allowed" : "pointer", opacity: sending ? 0.7 : 1, fontSize: 14 }}
                    >
                        {sending ? "Sending…" : "Send Notification"}
                    </button>
                </div>
            </div>

            {/* History */}
            <div style={{ background: "rgba(30,27,75,0.6)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 16, padding: 24, overflowY: "auto", maxHeight: 600 }}>
                <h3 style={{ margin: "0 0 20px 0", color: "#c7d2fe", fontSize: 16 }}>📋 Notification History</h3>
                {(history || []).length === 0 ? (
                    <p style={{ color: "#64748b", textAlign: "center", marginTop: 40 }}>No notifications sent yet</p>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {(history || []).map((n) => (
                            <div key={n._id} style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 10, padding: 14 }}>
                                <div style={{ fontWeight: 700, fontSize: 14, color: "#c7d2fe" }}>{n.title}</div>
                                <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>{n.message}</div>
                                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                                    <Badge color="#6366f1">{n.channel}</Badge>
                                    <Badge color="#8b5cf6">{n.audienceType}</Badge>
                                    <span style={{ fontSize: 11, color: "#64748b", marginLeft: "auto" }}>{new Date(n.createdAt).toLocaleString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────
function TableWrapper({ children }) {
    return (
        <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                {children}
            </table>
        </div>
    );
}
function Th({ children }) {
    return <th style={{ textAlign: "left", padding: "10px 12px", color: "#64748b", fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>{children}</th>;
}
function Td({ children, style }) {
    return <td style={{ padding: "12px", verticalAlign: "middle", color: "#e2e8f0", ...style }}>{children}</td>;
}
function Badge({ color, children }) {
    return <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 999, background: `${color}22`, color, fontSize: 12, fontWeight: 600, border: `1px solid ${color}44` }}>{children}</span>;
}
function ActionBtn({ color, onClick, children }) {
    return (
        <button
            onClick={onClick}
            style={{ background: `${color}22`, color, border: `1px solid ${color}44`, borderRadius: 6, padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
            onMouseOver={(e) => { e.currentTarget.style.background = `${color}44`; }}
            onMouseOut={(e) => { e.currentTarget.style.background = `${color}22`; }}
        >
            {children}
        </button>
    );
}
