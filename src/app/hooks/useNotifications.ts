import { useState, useEffect, useCallback } from "react";
import * as api from "../api";
import type { Notification } from "../types";

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await api.getNotifications();
      setNotifications(result.notifications as Notification[]);
      setUnreadCount(result.unreadCount);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const markRead = useCallback(async (id: number) => {
    await api.markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await api.markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, []);

  return { notifications, unreadCount, loading, error, fetch, markRead, markAllRead };
}
