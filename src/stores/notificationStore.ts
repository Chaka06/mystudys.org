import { create } from "zustand";
import type { Notification } from "@/types/database.types";

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  friendRequestCount: number;
  unreadMessages: number; // total messages non lus dans toutes les conversations
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  setUnreadCount: (count: number) => void;
  setFriendRequestCount: (count: number) => void;
  setUnreadMessages: (count: number) => void;
  incrementUnreadMessages: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  friendRequestCount: 0,
  unreadMessages: 0,
  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.is_read).length,
    }),
  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + (notification.is_read ? 0 : 1),
    })),
  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, is_read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),
  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    })),
  setUnreadCount: (count) => set({ unreadCount: count }),
  setFriendRequestCount: (count) => set({ friendRequestCount: count }),
  setUnreadMessages: (count) => set({ unreadMessages: count }),
  incrementUnreadMessages: () => set((s) => ({ unreadMessages: s.unreadMessages + 1 })),
}));
