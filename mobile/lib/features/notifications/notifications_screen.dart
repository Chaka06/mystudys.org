import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../../models/models.dart';
import '../../widgets/app_avatar.dart';
import '../../core/theme.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});
  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final _sb = Supabase.instance.client;
  List<AppNotification> _notifs = [];
  bool _loading = true;
  late RealtimeChannel _channel;

  @override
  void initState() {
    super.initState();
    _load();
    _subscribeRealtime();
  }

  @override
  void dispose() {
    _channel.unsubscribe(); // Fix memory leak
    super.dispose();
  }

  Future<void> _load() async {
    final userId = _sb.auth.currentUser?.id;
    if (userId == null) return;
    try {
      final data = await _sb
          .from('notifications')
          .select('*, sender:profiles!notifications_sender_id_fkey(id,username,full_name,first_name,avatar_url)')
          .eq('recipient_id', userId)
          .order('created_at', ascending: false)
          .limit(50);
      if (!mounted) return;
      setState(() {
        _notifs = (data as List).map((n) => AppNotification.fromJson(n)).toList();
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _subscribeRealtime() {
    final userId = _sb.auth.currentUser?.id;
    if (userId == null) return;
    _channel = _sb.channel('notifs-screen-$userId')
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'notifications',
          filter: PostgresChangeFilter(type: PostgresChangeFilterType.eq, column: 'recipient_id', value: userId),
          callback: (_) => _load(),
        );
    _channel.subscribe();
  }

  Future<void> _markAllRead() async {
    final userId = _sb.auth.currentUser?.id;
    if (userId == null) return;
    await _sb.from('notifications').update({'is_read': true}).eq('recipient_id', userId);
    if (!mounted) return;
    setState(() => _notifs = _notifs.map((n) => AppNotification(
      id: n.id, recipientId: n.recipientId, senderId: n.senderId,
      type: n.type, title: n.title, body: n.body,
      resourceType: n.resourceType, resourceId: n.resourceId,
      isRead: true, createdAt: n.createdAt, sender: n.sender,
    )).toList());
  }

  Future<void> _markRead(AppNotification n) async {
    if (n.isRead) return;
    await _sb.from('notifications').update({'is_read': true}).eq('id', n.id);
    if (!mounted) return;
    setState(() {
      final idx = _notifs.indexWhere((x) => x.id == n.id);
      if (idx != -1) {
        _notifs[idx] = AppNotification(
          id: n.id, recipientId: n.recipientId, senderId: n.senderId,
          type: n.type, title: n.title, body: n.body,
          resourceType: n.resourceType, resourceId: n.resourceId,
          isRead: true, createdAt: n.createdAt, sender: n.sender,
        );
      }
    });
  }

  // Navigation vers la ressource concernée
  void _navigate(AppNotification n) {
    _markRead(n);
    if (n.resourceType == 'post' && n.resourceId != null) {
      context.push('/post/${n.resourceId}');
    } else if (n.resourceType == 'profile' && n.resourceId != null) {
      // resourceId = username ou UUID → chercher par username si sender disponible
      if (n.sender?.username != null) {
        context.push('/profile/${n.sender!.username}');
      }
    } else if (n.type == 'message') {
      context.go('/messages');
    } else if (n.type == 'friend_request' || n.type == 'friend_accepted') {
      context.go('/friends');
    } else if (n.sender?.username != null) {
      context.push('/profile/${n.sender!.username}');
    }
  }

  IconData _icon(String type) {
    switch (type) {
      case 'like': return Icons.favorite;
      case 'comment': return Icons.chat_bubble;
      case 'reply': return Icons.reply;
      case 'friend_request': return Icons.person_add;
      case 'friend_accepted': return Icons.people;
      case 'message': return Icons.message;
      case 'mention': return Icons.alternate_email;
      case 'post_share': return Icons.share;
      default: return Icons.notifications;
    }
  }

  Color _color(String type) {
    switch (type) {
      case 'like': return Colors.red;
      case 'comment': case 'reply': return Colors.blue;
      case 'friend_request': case 'friend_accepted': return kGreen;
      case 'message': return kOrange;
      case 'mention': return kOrange;
      case 'post_share': return kGreen;
      default: return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final unread = _notifs.where((n) => !n.isRead).length;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Notifications'),
            if (unread > 0)
              Text('$unread non lue${unread > 1 ? 's' : ''}',
                style: const TextStyle(fontSize: 12, color: kOrange, fontWeight: FontWeight.w500)),
          ],
        ),
        actions: [
          if (unread > 0)
            TextButton(
              onPressed: _markAllRead,
              child: const Text('Tout lire', style: TextStyle(color: kOrange, fontSize: 13)),
            ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: kOrange))
          : _notifs.isEmpty
              ? Center(
                  child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    Icon(Icons.notifications_none, size: 56, color: Colors.grey.shade300),
                    const SizedBox(height: 16),
                    const Text('Aucune notification', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                  ]),
                )
              : RefreshIndicator(
                  color: kOrange,
                  onRefresh: _load,
                  child: ListView.separated(
                    itemCount: _notifs.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (ctx, i) {
                      final n = _notifs[i];
                      return Container(
                        color: n.isRead ? null : kOrange.withValues(alpha: isDark ? 0.08 : 0.04),
                        child: ListTile(
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          onTap: () => _navigate(n), // Fix : navigation au clic
                          leading: Stack(
                            clipBehavior: Clip.none,
                            children: [
                              AppAvatar(url: n.sender?.avatarUrl, initials: n.sender?.initials ?? 'S', size: 44),
                              Positioned(
                                bottom: -2, right: -2,
                                child: Container(
                                  padding: const EdgeInsets.all(4),
                                  decoration: BoxDecoration(
                                    color: _color(n.type),
                                    shape: BoxShape.circle,
                                    border: Border.all(color: isDark ? const Color(0xFF0F1117) : Colors.white, width: 1.5),
                                  ),
                                  child: Icon(_icon(n.type), color: Colors.white, size: 10),
                                ),
                              ),
                            ],
                          ),
                          title: Text(n.title,
                            style: TextStyle(fontSize: 13, fontWeight: n.isRead ? FontWeight.w500 : FontWeight.w700)),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (n.body != null)
                                Text(n.body!, style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                              Text(timeago.format(DateTime.parse(n.createdAt), locale: 'fr'),
                                style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
                            ],
                          ),
                          trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                            if (!n.isRead)
                              Container(width: 8, height: 8,
                                decoration: const BoxDecoration(color: kOrange, shape: BoxShape.circle)),
                            const SizedBox(width: 4),
                            Icon(Icons.chevron_right, size: 16, color: Colors.grey.shade400),
                          ]),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
