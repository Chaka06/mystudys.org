import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../../models/models.dart';
import '../../widgets/app_avatar.dart';
import '../../core/theme.dart';
import 'chat_screen.dart';

class ConversationsScreen extends StatefulWidget {
  const ConversationsScreen({super.key});
  @override
  State<ConversationsScreen> createState() => _ConversationsScreenState();
}

class _ConversationsScreenState extends State<ConversationsScreen> {
  final _sb = Supabase.instance.client;
  List<Conversation> _conversations = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
    _subscribeRealtime();
  }

  Future<void> _load() async {
    final userId = _sb.auth.currentUser?.id;
    if (userId == null) return;
    try {
      final data = await _sb
          .from('conversations')
          .select('*, p1:profiles!conversations_participant_1_fkey(id,username,full_name,first_name,avatar_url,last_seen_at,is_active), p2:profiles!conversations_participant_2_fkey(id,username,full_name,first_name,avatar_url,last_seen_at,is_active)')
          .or('participant_1.eq.$userId,participant_2.eq.$userId')
          .order('last_message_at', ascending: false, nullsFirst: false);

      final convs = (data as List).map((c) => Conversation.fromJson(c, userId)).toList();

      // Compter non-lus
      if (convs.isNotEmpty) {
        final convIds = convs.map((c) => c.id).toList();
        final unread = await _sb
            .from('messages')
            .select('conversation_id')
            .inFilter('conversation_id', convIds)
            .neq('sender_id', userId)
            .eq('is_read', false)
            .eq('is_deleted', false);
        final unreadMap = <String, int>{};
        for (final r in (unread as List)) {
          final cId = r['conversation_id'] as String;
          unreadMap[cId] = (unreadMap[cId] ?? 0) + 1;
        }
        setState(() {
          _conversations = convs.map((c) => Conversation(
            id: c.id, participant1: c.participant1, participant2: c.participant2,
            lastMessage: c.lastMessage, lastMessageAt: c.lastMessageAt,
            isActive: c.isActive, createdAt: c.createdAt,
            otherParticipant: c.otherParticipant,
            unreadCount: unreadMap[c.id] ?? 0,
          )).toList();
          _loading = false;
        });
      } else {
        setState(() { _conversations = []; _loading = false; });
      }
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  void _subscribeRealtime() {
    final userId = _sb.auth.currentUser?.id;
    if (userId == null) return;
    _sb.channel('conv-list-$userId')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'conversations',
          filter: PostgresChangeFilter(type: PostgresChangeFilterType.eq, column: 'participant_1', value: userId),
          callback: (_) => _load(),
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'conversations',
          filter: PostgresChangeFilter(type: PostgresChangeFilterType.eq, column: 'participant_2', value: userId),
          callback: (_) => _load(),
        )
        .subscribe();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      appBar: AppBar(title: const Text('Messages')),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: kOrange))
          : _conversations.isEmpty
              ? _empty()
              : RefreshIndicator(
                  color: kOrange,
                  onRefresh: _load,
                  child: ListView.separated(
                    itemCount: _conversations.length,
                    separatorBuilder: (_, __) => const Divider(height: 1, indent: 72),
                    itemBuilder: (ctx, i) {
                      final conv = _conversations[i];
                      final other = conv.otherParticipant;
                      final hasUnread = conv.unreadCount > 0;
                      return ListTile(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                        leading: AppAvatar(
                          url: other?.avatarUrl,
                          initials: other?.initials ?? 'U',
                          size: 48,
                          isOnline: other?.isActive ?? false,
                        ),
                        title: Text(
                          other?.fullName ?? 'Utilisateur',
                          style: TextStyle(
                            fontWeight: hasUnread ? FontWeight.w700 : FontWeight.w500,
                            fontSize: 14,
                          ),
                        ),
                        subtitle: conv.lastMessage != null
                            ? Text(
                                conv.lastMessage!,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 12,
                                  color: hasUnread ? kOrange : Colors.grey.shade500,
                                  fontWeight: hasUnread ? FontWeight.w600 : FontWeight.normal,
                                ),
                              )
                            : null,
                        trailing: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            if (conv.lastMessageAt != null)
                              Text(
                                timeago.format(DateTime.parse(conv.lastMessageAt!), locale: 'fr'),
                                style: TextStyle(fontSize: 11, color: hasUnread ? kOrange : Colors.grey.shade400),
                              ),
                            if (hasUnread) ...[
                              const SizedBox(height: 4),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(color: kOrange, borderRadius: BorderRadius.circular(10)),
                                child: Text(
                                  conv.unreadCount > 99 ? '99+' : conv.unreadCount.toString(),
                                  style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700),
                                ),
                              ),
                            ],
                          ],
                        ),
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => ChatScreen(conversation: conv)),
                        ).then((_) => _load()),
                      );
                    },
                  ),
                ),
    );
  }

  Widget _empty() => Center(
    child: Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(Icons.chat_bubble_outline, size: 56, color: Colors.grey.shade300),
        const SizedBox(height: 16),
        const Text('Pas encore de messages', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        Text('Visitez un profil pour démarrer une conversation', style: TextStyle(color: Colors.grey.shade500, fontSize: 14)),
      ],
    ),
  );
}
