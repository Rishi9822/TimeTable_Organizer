import React, { useState, useRef, useEffect } from "react";
import { useNotificationContext } from "@/contexts/NotificationContext";
import { Bell, BellRing, CheckCheck, Inbox } from "lucide-react";

export default function NotificationBell() {
    const { notifications, unreadCount, markRead, markAllRead } = useNotificationContext();
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div ref={dropdownRef} style={{ position: "relative", display: "inline-block" }}>
            {/* Bell button */}
            <button
                onClick={() => setOpen((o) => !o)}
                style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    position: "relative",
                    padding: "8px",
                    borderRadius: "50%",
                    transition: "background 0.2s",
                    color: "#94a3b8",
                    fontSize: 20,
                    lineHeight: 1,
                }}
                aria-label="Notifications"
                onMouseOver={(e) => { e.currentTarget.style.background = "rgba(99,102,241,0.15)"; }}
                onMouseOut={(e) => { e.currentTarget.style.background = "none"; }}
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span
                        style={{
                            position: "absolute",
                            top: 2,
                            right: 2,
                            background: "#ef4444",
                            color: "#fff",
                            borderRadius: "999px",
                            fontSize: 10,
                            fontWeight: 700,
                            minWidth: 16,
                            height: 16,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "0 3px",
                            lineHeight: 1,
                            border: "2px solid #0f1117",
                        }}
                    >
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div
                    style={{
                        position: "absolute",
                        top: "calc(100% + 8px)",
                        right: 0,
                        width: 340,
                        maxHeight: 420,
                        background: "#1e1b4b",
                        border: "1px solid rgba(99,102,241,0.3)",
                        borderRadius: 12,
                        boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
                        zIndex: 1000,
                        overflowY: "auto",
                    }}
                >
                    {/* Header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid rgba(99,102,241,0.2)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <BellRing className="h-4 w-4 text-primary" />
                            <span style={{ fontWeight: 700, color: "#c7d2fe", fontSize: 14 }}>Notifications</span>
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                style={{ background: "none", border: "none", color: "#818cf8", fontSize: 12, cursor: "pointer", fontWeight: 600 }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                    <CheckCheck className="h-3 w-3" />
                                    Mark all read
                                </div>
                            </button>
                        )}
                    </div>

                    {/* List */}
                    {notifications.length === 0 ? (
                        <div style={{ padding: "40px 16px", textAlign: "center", color: "#64748b" }}>
                            <Inbox className="h-10 w-10 mx-auto mb-3 opacity-20" />
                            <div style={{ fontSize: 14 }}>No notifications yet</div>
                        </div>
                    ) : (
                        notifications.map((n) => (
                            <div
                                key={n.id}
                                onClick={() => { if (!n.isRead) markRead(n.id); }}
                                style={{
                                    padding: "12px 16px",
                                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                                    cursor: n.isRead ? "default" : "pointer",
                                    background: n.isRead ? "transparent" : "rgba(99,102,241,0.08)",
                                    transition: "background 0.15s",
                                }}
                                onMouseOver={(e) => { if (!n.isRead) e.currentTarget.style.background = "rgba(99,102,241,0.15)"; }}
                                onMouseOut={(e) => { if (!n.isRead) e.currentTarget.style.background = "rgba(99,102,241,0.08)"; }}
                            >
                                <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                                    {!n.isRead && (
                                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#6366f1", marginTop: 5, flexShrink: 0 }} />
                                    )}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: 13, color: n.isRead ? "#64748b" : "#e2e8f0" }}>
                                            {n.notification?.title || "Notification"}
                                        </div>
                                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2, lineHeight: 1.4 }}>
                                            {n.notification?.message}
                                        </div>
                                        <div style={{ fontSize: 11, color: "#475569", marginTop: 6 }}>
                                            {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
