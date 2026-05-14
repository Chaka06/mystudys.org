import 'dart:async';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/models.dart';

class NotificationProvider extends ChangeNotifier {
  final _sb = Supabase.instance.client;

  List<AppNotification> _notifications = [];
  int _unreadCount = 0;
  int _friendRequestCount = 0;
  int _unreadMessages = 0;
  bool _loading = true;
  RealtimeChannel? _channel;

  List<AppNotification> get notifications => _notifications;
  int get unreadCount => _unreadCount;
  int get friendRequestCount => _friendRequestCount;
  int get unreadMessages => _unreadMessages;
  bool get loading => _loading;

  NotificationProvider() {
    _init();
  }

  Future<void> _init() async {
    final userId = _sb.auth.currentUser?.id;
    if (userId == null) { _loading = false; notifyListeners(); return; }
    await Future.wait([_loadNotifications(), _loadFriendRequests(), _loadUnreadMessages()]);
    _subscribeRealtime(userId);
    _loading = false;
    notifyListeners();
  }

  Future<void> _loadNotifications() async {
    final userId = _sb.auth.currentUser?.id;
    if (userId == null) return;
    try {
      final data = await _sb
          .from('notifications')
          .select('*, sender:profiles!notifications_sender_id_fkey(id,username,full_name,first_name,avatar_url)')
          .eq('recipient_id', userId)
          .order('created_at', ascending: false)
          .limit(50);
      _notifications = (data as List).map((n) => AppNotification.fromJson(n)).toList();
      _unreadCount = _notifications.where((n) => !n.isRead).length;
      notifyListeners();
    } catch (_) {}
  }

  Future<void> _loadFriendRequests() async {
    final userId = _sb.auth.currentUser?.id;
    if (userId == null) return;
    try {
      final data = await _sb
          .from('friendships')
          .select('id')
          .eq('addressee_id', userId)
          .eq('status', 'pending');
      _friendRequestCount = (data as List).length;
      notifyListeners();
    } catch (_) {}
  }

  Future<void> _loadUnreadMessages() async {
    final userId = _sb.auth.currentUser?.id;
    if (userId == null) return;
    try {
      final convs = await _sb
          .from('conversations')
          .select('id')
          .or('participant_1.eq.$userId,participant_2.eq.$userId');
      final convIds = (convs as List).map((c) => c['id'] as String).toList();
      if (convIds.isEmpty) { _unreadMessages = 0; notifyListeners(); return; }
      final msgs = await _sb
          .from('messages')
          .select('conversation_id')
          .inFilter('conversation_id', convIds)
          .neq('sender_id', userId)
          .eq('is_read', false)
          .eq('is_deleted', false);
      _unreadMessages = (msgs as List).length;
      notifyListeners();
    } catch (_) {}
  }

  void _subscribeRealtime(String userId) {
    _channel = _sb.channel('notifs-provider-$userId')
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'notifications',
          filter: PostgresChangeFilter(type: PostgresChangeFilterType.eq, column: 'recipient_id', value: userId),
          callback: (_) => _loadNotifications(),
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'friendships',
          filter: PostgresChangeFilter(type: PostgresChangeFilterType.eq, column: 'addressee_id', value: userId),
          callback: (_) => _loadFriendRequests(),
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'messages',
          callback: (_) => _loadUnreadMessages(),
        )
        .subscribe();
  }

  Future<void> markAsRead(String id) async {
    _notifications = _notifications.map((n) => n.id == id
        ? AppNotification(id: n.id, recipientId: n.recipientId, senderId: n.senderId,
            type: n.type, title: n.title, body: n.body, resourceType: n.resourceType,
            resourceId: n.resourceId, isRead: true, createdAt: n.createdAt, sender: n.sender)
        : n).toList();
    _unreadCount = _notifications.where((n) => !n.isRead).length;
    notifyListeners();
    try {
      await _sb.from('notifications').update({'is_read': true}).eq('id', id);
    } catch (_) { await _loadNotifications(); }
  }

  Future<void> markAllAsRead() async {
    final userId = _sb.auth.currentUser?.id;
    if (userId == null) return;
    _notifications = _notifications.map((n) => AppNotification(
      id: n.id, recipientId: n.recipientId, senderId: n.senderId,
      type: n.type, title: n.title, body: n.body, resourceType: n.resourceType,
      resourceId: n.resourceId, isRead: true, createdAt: n.createdAt, sender: n.sender)).toList();
    _unreadCount = 0;
    notifyListeners();
    try {
      await _sb.from('notifications').update({'is_read': true}).eq('recipient_id', userId);
    } catch (_) { await _loadNotifications(); }
  }

  Future<void> refresh() async {
    await Future.wait([_loadNotifications(), _loadFriendRequests(), _loadUnreadMessages()]);
  }

  @override
  void dispose() {
    _channel?.unsubscribe();
    super.dispose();
  }
}
