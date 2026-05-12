import { describe, it, expect, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationStore } from "@/stores/notificationStore";
import type { Profile } from "@/types/database.types";
import type { Notification } from "@/types/database.types";

const mockProfile: Profile = {
  id: "user-123",
  username: "issiaka",
  full_name: "Issiaka Diarrassouba",
  first_name: "Issiaka",
  last_name: "Diarrassouba",
  avatar_url: null,
  cover_url: null,
  bio: null,
  phone: null,
  academic_level: "licence_1",
  field_of_study: "Informatique",
  institution: "UVCI",
  city: null,
  website: null,
  role: "user",
  is_public: true,
  is_verified: false,
  is_active: true,
  post_count: 0,
  friend_count: 0,
  last_seen_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockNotification = (overrides: Partial<Notification> = {}): Notification => ({
  id: "notif-1",
  recipient_id: "user-123",
  sender_id: "user-456",
  type: "like",
  title: "Nouveau like",
  body: "Quelqu'un a aimé votre publication",
  resource_type: "post",
  resource_id: "post-789",
  is_read: false,
  created_at: new Date().toISOString(),
  ...overrides,
});

// ─── AuthStore ─────────────────────────────────────────────────────────────

describe("useAuthStore", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, profile: null, isLoading: true });
  });

  it("démarre avec un état vide", () => {
    const { user, profile, isLoading } = useAuthStore.getState();
    expect(user).toBeNull();
    expect(profile).toBeNull();
    expect(isLoading).toBe(true);
  });

  it("setUser met à jour l'utilisateur", () => {
    const fakeUser = { id: "user-123" } as any;
    act(() => useAuthStore.getState().setUser(fakeUser));
    expect(useAuthStore.getState().user).toEqual(fakeUser);
  });

  it("setProfile met à jour le profil", () => {
    act(() => useAuthStore.getState().setProfile(mockProfile));
    expect(useAuthStore.getState().profile).toEqual(mockProfile);
  });

  it("setLoading met à jour isLoading", () => {
    act(() => useAuthStore.getState().setLoading(false));
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it("reset efface user et profile", () => {
    act(() => {
      useAuthStore.getState().setUser({ id: "user-123" } as any);
      useAuthStore.getState().setProfile(mockProfile);
      useAuthStore.getState().reset();
    });
    const { user, profile, isLoading } = useAuthStore.getState();
    expect(user).toBeNull();
    expect(profile).toBeNull();
    expect(isLoading).toBe(false);
  });
});

// ─── NotificationStore ─────────────────────────────────────────────────────

describe("useNotificationStore", () => {
  beforeEach(() => {
    useNotificationStore.setState({ notifications: [], unreadCount: 0 });
  });

  it("démarre avec des notifications vides", () => {
    const { notifications, unreadCount } = useNotificationStore.getState();
    expect(notifications).toHaveLength(0);
    expect(unreadCount).toBe(0);
  });

  it("setNotifications calcule correctement unreadCount", () => {
    const notifs = [
      mockNotification({ id: "1", is_read: false }),
      mockNotification({ id: "2", is_read: true }),
      mockNotification({ id: "3", is_read: false }),
    ];
    act(() => useNotificationStore.getState().setNotifications(notifs));
    expect(useNotificationStore.getState().unreadCount).toBe(2);
    expect(useNotificationStore.getState().notifications).toHaveLength(3);
  });

  it("addNotification ajoute en tête de liste", () => {
    act(() => useNotificationStore.getState().setNotifications([mockNotification({ id: "old" })]));
    act(() => useNotificationStore.getState().addNotification(mockNotification({ id: "new" })));
    const { notifications } = useNotificationStore.getState();
    expect(notifications[0].id).toBe("new");
    expect(notifications).toHaveLength(2);
  });

  it("addNotification incrémente unreadCount si non lue", () => {
    act(() => useNotificationStore.getState().addNotification(mockNotification({ is_read: false })));
    expect(useNotificationStore.getState().unreadCount).toBe(1);
  });

  it("addNotification n'incrémente pas unreadCount si déjà lue", () => {
    act(() => useNotificationStore.getState().addNotification(mockNotification({ is_read: true })));
    expect(useNotificationStore.getState().unreadCount).toBe(0);
  });

  it("markAsRead marque une notification comme lue", () => {
    const notif = mockNotification({ id: "notif-1", is_read: false });
    act(() => useNotificationStore.getState().setNotifications([notif]));
    act(() => useNotificationStore.getState().markAsRead("notif-1"));
    const { notifications, unreadCount } = useNotificationStore.getState();
    expect(notifications[0].is_read).toBe(true);
    expect(unreadCount).toBe(0);
  });

  it("markAsRead ne descend pas unreadCount en dessous de 0", () => {
    act(() => useNotificationStore.getState().markAsRead("inexistant"));
    expect(useNotificationStore.getState().unreadCount).toBe(0);
  });

  it("markAllAsRead marque toutes les notifications comme lues", () => {
    const notifs = [
      mockNotification({ id: "1", is_read: false }),
      mockNotification({ id: "2", is_read: false }),
    ];
    act(() => useNotificationStore.getState().setNotifications(notifs));
    act(() => useNotificationStore.getState().markAllAsRead());
    const { notifications, unreadCount } = useNotificationStore.getState();
    expect(notifications.every((n) => n.is_read)).toBe(true);
    expect(unreadCount).toBe(0);
  });

  it("setUnreadCount met à jour le compteur", () => {
    act(() => useNotificationStore.getState().setUnreadCount(42));
    expect(useNotificationStore.getState().unreadCount).toBe(42);
  });
});
