import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:timeago/timeago.dart' as timeago;
import 'package:image_picker/image_picker.dart';
import '../../models/models.dart';
import '../../widgets/app_avatar.dart';
import '../../core/theme.dart';
import '../../core/constants.dart';

class ChatScreen extends StatefulWidget {
  final Conversation conversation;
  const ChatScreen({super.key, required this.conversation});
  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _sb = Supabase.instance.client;
  final _msgCtrl = TextEditingController();
  late final ScrollController _scrollCtrl;
  List<Message> _messages = [];
  bool _loading = true;
  bool _sending = false;
  String? _myId;
  late RealtimeChannel _channel; // Référence au channel pour cleanup propre

  @override
  void initState() {
    super.initState();
    _scrollCtrl = ScrollController();
    _myId = _sb.auth.currentUser?.id;
    _loadMessages();
    _subscribeRealtime();
  }

  Future<void> _loadMessages() async {
    try {
      final data = await _sb
          .from('messages')
          .select('*, sender:profiles(id,username,full_name,first_name,avatar_url)')
          .eq('conversation_id', widget.conversation.id)
          .eq('is_deleted', false)
          .order('created_at', ascending: true)
          .limit(50);
      if (!mounted) return;
      setState(() {
        _messages = (data as List).map((m) => Message.fromJson(m)).toList();
        _loading = false;
      });
      _markAsRead();
      _scrollToBottom();
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _markAsRead() async {
    if (_myId == null) return;
    await _sb
        .from('messages')
        .update({'is_read': true})
        .eq('conversation_id', widget.conversation.id)
        .neq('sender_id', _myId!)
        .eq('is_read', false);
  }

  void _subscribeRealtime() {
    _channel = _sb.channel('chat-${widget.conversation.id}');
    _channel
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'messages',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'conversation_id',
            value: widget.conversation.id,
          ),
          callback: (payload) {
            final newMsg = Message.fromJson(payload.newRecord);
            if (newMsg.senderId == _myId) return;
            if (!mounted) return;
            setState(() => _messages.add(newMsg));
            _scrollToBottom();
          },
        )
        .subscribe();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage({String? mediaUrl}) async {
    final text = _msgCtrl.text.trim();
    if (text.isEmpty && mediaUrl == null) return;
    if (_sending || _myId == null) return;
    setState(() => _sending = true);
    _msgCtrl.clear();

    final tempId = 'temp-${DateTime.now().millisecondsSinceEpoch}';
    final optimistic = Message(
      id: tempId,
      conversationId: widget.conversation.id,
      senderId: _myId!,
      content: text,
      mediaUrl: mediaUrl,
      createdAt: DateTime.now().toIso8601String(),
    );
    setState(() => _messages.add(optimistic));
    _scrollToBottom();

    try {
      final data = await _sb
          .from('messages')
          .insert({
            'conversation_id': widget.conversation.id,
            'sender_id': _myId,
            'content': text,
            if (mediaUrl != null) 'media_url': mediaUrl,
          })
          .select('*, sender:profiles(id,username,full_name,first_name,avatar_url)')
          .single();
      final real = Message.fromJson(data);
      if (!mounted) return;
      setState(() {
        final idx = _messages.indexWhere((m) => m.id == tempId);
        if (idx != -1) _messages[idx] = real;
      });
      await _sb.from('conversations').update({
        'last_message': text.isNotEmpty ? text : '📎 Fichier',
        'last_message_at': DateTime.now().toIso8601String(),
        'is_active': true,
      }).eq('id', widget.conversation.id);
    } catch (_) {
      if (mounted) setState(() => _messages.removeWhere((m) => m.id == tempId));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final file = await picker.pickImage(source: ImageSource.gallery, imageQuality: 80);
    if (file == null) return;
    if (!mounted) return;
    setState(() => _sending = true);
    try {
      final bytes = await file.readAsBytes();
      final fileName = '${_myId}/messages/${DateTime.now().millisecondsSinceEpoch}.jpg';
      await _sb.storage.from(AppConstants.storageBucket).uploadBinary(fileName, bytes);
      final url = _sb.storage.from(AppConstants.storageBucket).getPublicUrl(fileName);
      await _sendMessage(mediaUrl: url);
    } catch (_) {
      if (mounted) setState(() => _sending = false);
    }
  }

  String _formatDate(String iso) {
    final now = DateTime.now();
    final msg = DateTime.parse(iso).toLocal();
    final today = DateTime(now.year, now.month, now.day);
    final yesterday = today.subtract(const Duration(days: 1));
    final msgDate = DateTime(msg.year, msg.month, msg.day);
    if (msgDate == today) return "Aujourd'hui";
    if (msgDate == yesterday) return 'Hier';
    const months = ['jan.', 'fév.', 'mar.', 'avr.', 'mai', 'juin', 'juil.', 'aoû.', 'sep.', 'oct.', 'nov.', 'déc.'];
    final m = months[msg.month - 1];
    return '${msg.day} $m${msg.year != now.year ? ' ${msg.year}' : ''}';
  }

  bool _isSameDay(String a, String b) {
    final da = DateTime.parse(a).toLocal();
    final db = DateTime.parse(b).toLocal();
    return da.year == db.year && da.month == db.month && da.day == db.day;
  }

  String _timeStr(String iso) {
    final dt = DateTime.parse(iso).toLocal();
    return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }

  @override
  void dispose() {
    _msgCtrl.dispose();
    _scrollCtrl.dispose();
    _channel.unsubscribe(); // Nettoie seulement ce channel, pas tous
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final other = widget.conversation.otherParticipant;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDark ? const Color(0xFF0F1117) : const Color(0xFFF0F2F5);

    return Scaffold(
      backgroundColor: bgColor,
      appBar: AppBar(
        backgroundColor: isDark ? const Color(0xFF1E2025) : Colors.white,
        titleSpacing: 0,
        leading: const BackButton(),
        title: GestureDetector(
          onTap: () {},
          child: Row(
            children: [
              AppAvatar(
                url: other?.avatarUrl,
                initials: other?.initials ?? 'U',
                size: 36,
                isOnline: other?.isActive ?? false,
              ),
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(other?.fullName ?? '', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                  Text(
                    other?.isActive == true ? 'En ligne' : 'Hors ligne',
                    style: TextStyle(
                      fontSize: 11,
                      color: other?.isActive == true ? kGreen : Colors.grey.shade400,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: kOrange))
                : _messages.isEmpty
                    ? _buildEmptyState(other)
                    : ListView.builder(
                        controller: _scrollCtrl,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        itemCount: _messages.length,
                        itemBuilder: (ctx, i) {
                          final msg = _messages[i];
                          final isMine = msg.senderId == _myId;
                          final prev = i > 0 ? _messages[i - 1] : null;
                          final next = i < _messages.length - 1 ? _messages[i + 1] : null;
                          final isFirst = prev == null || prev.senderId != msg.senderId;
                          final isLast = next == null || next.senderId != msg.senderId;
                          final showDate = prev == null || !_isSameDay(prev.createdAt, msg.createdAt);

                          return Column(
                            children: [
                              if (showDate)
                                Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: isDark ? const Color(0xFF2D3139) : Colors.white,
                                      borderRadius: BorderRadius.circular(20),
                                      boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4)],
                                    ),
                                    child: Text(_formatDate(msg.createdAt),
                                        style: TextStyle(fontSize: 11, color: Colors.grey.shade500, fontWeight: FontWeight.w500)),
                                  ),
                                ),
                              _MessageBubble(
                                msg: msg, isMine: isMine, isFirst: isFirst, isLast: isLast,
                                myId: _myId ?? '', timeStr: _timeStr(msg.createdAt),
                              ),
                            ],
                          );
                        },
                      ),
          ),
          _InputBar(
            controller: _msgCtrl,
            sending: _sending,
            onSend: () => _sendMessage(),
            onPickImage: _pickImage,
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(Profile? other) => Center(
    child: Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        AppAvatar(url: other?.avatarUrl, initials: other?.initials ?? 'U', size: 72),
        const SizedBox(height: 16),
        Text(other?.fullName ?? '', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        Text('Démarrez la conversation avec ${other?.firstName ?? other?.fullName ?? ''}!',
          style: TextStyle(color: Colors.grey.shade500, fontSize: 14)),
      ],
    ),
  );
}

class _MessageBubble extends StatelessWidget {
  final Message msg;
  final bool isMine;
  final bool isFirst;
  final bool isLast;
  final String myId;
  final String timeStr;

  const _MessageBubble({
    required this.msg, required this.isMine, required this.isFirst,
    required this.isLast, required this.myId, required this.timeStr,
  });

  bool _isImage(String url) => RegExp(r'\.(jpg|jpeg|png|webp|gif)(\?|$)', caseSensitive: false).hasMatch(url);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bubbleMine = kOrange;
    final bubbleOther = isDark ? const Color(0xFF2D3139) : Colors.white;

    // Arrondis dynamiques selon position dans le groupe
    final borderRadius = BorderRadius.only(
      topLeft: const Radius.circular(18),
      topRight: const Radius.circular(18),
      bottomLeft: Radius.circular(isMine ? 18 : (isLast ? 18 : 4)),
      bottomRight: Radius.circular(isMine ? (isLast ? 4 : 4) : 18),
    );

    return Align(
      alignment: isMine ? Alignment.centerRight : Alignment.centerLeft,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          // Avatar expéditeur (gauche, uniquement sur le dernier du groupe)
          if (!isMine) ...[
            SizedBox(
              width: 32,
              child: isLast
                  ? AppAvatar(url: msg.sender?.avatarUrl, initials: msg.sender?.initials ?? 'U', size: 28)
                  : const SizedBox(),
            ),
            const SizedBox(width: 4),
          ],

          ConstrainedBox(
            constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.68),
            child: Container(
              margin: EdgeInsets.only(
                top: isFirst ? 6 : 2, bottom: isLast ? 6 : 2,
                left: isMine ? 40 : 0, right: isMine ? 0 : 0,
              ),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: isMine ? bubbleMine : bubbleOther,
                borderRadius: borderRadius,
                boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 4, offset: const Offset(0, 2))],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  // Image
                  if (msg.mediaUrl != null && _isImage(msg.mediaUrl!))
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.network(msg.mediaUrl!, fit: BoxFit.cover, width: 200),
                    ),

                  // Texte
                  if (msg.content.isNotEmpty)
                    Text(
                      msg.content,
                      style: TextStyle(
                        color: isMine ? Colors.white : (isDark ? Colors.white : const Color(0xFF1A1A1A)),
                        fontSize: 14,
                        height: 1.4,
                      ),
                    ),

                  // Heure + statut (seulement sur le dernier du groupe)
                  if (isLast) ...[
                    const SizedBox(height: 2),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(timeStr,
                          style: TextStyle(fontSize: 10, color: isMine ? Colors.white60 : Colors.grey.shade400)),
                        if (isMine) ...[
                          const SizedBox(width: 4),
                          Icon(
                            msg.isRead ? Icons.done_all : Icons.done,
                            size: 12,
                            color: msg.isRead ? Colors.white : Colors.white60,
                          ),
                        ],
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _InputBar extends StatelessWidget {
  final TextEditingController controller;
  final bool sending;
  final VoidCallback onSend;
  final VoidCallback onPickImage;

  const _InputBar({
    required this.controller, required this.sending,
    required this.onSend, required this.onPickImage,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1E2025) : Colors.white,
          border: Border(top: BorderSide(color: isDark ? const Color(0xFF2D3139) : Colors.grey.shade200)),
        ),
        child: Row(
          children: [
            IconButton(
              onPressed: onPickImage,
              icon: Icon(Icons.attach_file, color: Colors.grey.shade400, size: 22),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
            ),
            const SizedBox(width: 6),
            Expanded(
              child: TextField(
                controller: controller,
                minLines: 1,
                maxLines: 4,
                onSubmitted: (_) => onSend(),
                onTap: () {
                  // Scroll vers le bas quand le clavier s'ouvre sur mobile
                  Future.delayed(const Duration(milliseconds: 300), () {});
                },
                decoration: InputDecoration(
                  hintText: 'Écrire un message…',
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  fillColor: isDark ? const Color(0xFF2D3139) : const Color(0xFFF1F5F9),
                ),
              ),
            ),
            const SizedBox(width: 6),
            GestureDetector(
              onTap: sending ? null : onSend,
              child: Container(
                width: 40, height: 40,
                decoration: BoxDecoration(
                  color: sending ? Colors.grey.shade300 : kOrange,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: sending
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Icon(Icons.send_rounded, color: Colors.white, size: 20),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
