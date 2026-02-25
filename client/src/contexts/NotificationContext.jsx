import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import API from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const NotificationContext = createContext(null);

export const useNotificationContext = () => {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error("useNotificationContext must be used within NotificationProvider");
    return ctx;
};

export const NotificationProvider = ({ children }) => {
    const { user } = useAuth();

    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);

    const pollingRef = useRef(null);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;

        try {
            setLoading(true);
            const { data } = await API.get("/notifications/my");
            setNotifications(data);
            setUnreadCount(data.filter((n) => !n.isRead).length);
        } catch (err) {
            console.error("[NotificationContext] fetch error:", err.message);
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Initial fetch + 30-second polling fallback (WebSocket upgrade optional)
    useEffect(() => {
        if (!user) return;

        fetchNotifications();

        pollingRef.current = setInterval(fetchNotifications, 30_000);

        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, [fetchNotifications, user]);

    const markRead = async (userNotificationId) => {
        try {
            await API.patch(`/notifications/${userNotificationId}/read`);
            setNotifications((prev) =>
                prev.map((n) =>
                    n.id === userNotificationId ? { ...n, isRead: true } : n
                )
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (err) {
            console.error("[NotificationContext] markRead error:", err.message);
        }
    };

    const markAllRead = async () => {
        try {
            await API.patch("/notifications/mark-all-read");
            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error("[NotificationContext] markAllRead error:", err.message);
        }
    };

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                loading,
                markRead,
                markAllRead,
                refreshNotifications: fetchNotifications,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
};
