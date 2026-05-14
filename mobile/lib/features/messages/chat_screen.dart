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
  final _scrollCtrl = ScrollController();
  List<Message> _messages = [];
  bool _loading = true;
  bool _sending = false;
  String? _myId;

  @override
  void initState() {
    super.initState();
    _myId = _sb.auth.currentUser?.id;
    _loadMessages();
    _subscribeRealtime();
  }

  Future<void> _loadMessages() async {
    try {
      final data = await _sb
          .from('messages')
          .select('*, sender:profiles(id,username,full_name,avatar_url)')
          .eq('conversation_id', widget.conversation.id)
          .eq('is_deleted', false)
          .order('created_at', ascending: true)
          .limit(50);
      setState(() {
        _messages = (data as List).map((m) => Message.fromJson(m)).toList();
        _loading = false;
      });
      _markAsRead();
      _scrollToBottom();
    } catch (_) {
      setState(() => _loading = false);
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
    _sb.channel('chat-${widget.conversation.id}')
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'messages',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'conversation_id',
            value: widget.conversation.id,
          ),
          callback: (payload) async {
            final newMsg = Message.fromJson(payload.newRecord);
            if (newMsg.senderId == _myId) return; // own message handled optimistically
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
    if (_sending) return;
    setState(() => _sending = true);
    _msgCtrl.clear();

    final tempId = 'temp-${DateTime.now().millisecondsSinceEpoch}';
    final optimistic = Message(
      id: tempId,
      conversationId: widget.conversation.id,
      senderId: _myId ?? '',
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
          .select('*, sender:profiles(id,username,full_name,avatar_url)')
          .single();
      final real = Message.fromJson(data);
      setState(() {
        final idx = _messages.indexWhere((m) => m.id == tempId);
        if (idx != -1) _messages[idx] = real;
      });

      // Update conversation last_message
      await _sb.from('conversations').update({
        'last_message': text.isNotEmpty ? text : '📎 Fichier',
        'last_message_at': DateTime.now().toIso8601String(),
        'is_active': true,
      }).eq('id', widget.conversation.id);
    } catch (_) {
      setState(() => _messages.removeWhere((m) => m.id == tempId));
    } finally {
      setState(() => _sending = false);
    }
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final file = await picker.pickImage(source: ImageSource.gallery, imageQuality: 80);
    if (file == null) return;

    setState(() => _sending = true);
    try {
      final bytes = await file.readAsBytes();
      final fileName = '${_myId}/messages/${DateTime.now().millisecondsSinceEpoch}.jpg';
      await _sb.storage.from(AppConstants.storageBucket).uploadBinary(fileName, bytes);
      final url = _sb.storage.from(AppConstants.storageBucket).getPublicUrl(fileName);
      await _sendMessage(mediaUrl: url);
    } catch (_) {
      setState(() => _sending = false);
    }
  }

  @override
  void dispose() {
    _msgCtrl.dispose();
    _scrollCtrl.dispose();
    _sb.removeAllChannels();
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
        title: Row(
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
      body: Column(
        children: [
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: kOrange))
                : ListView.builder(
                    controller: _scrollCtrl,
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                    itemCount: _messages.length,
                    itemBuilder: (ctx, i) {
                      final msg = _messages[i];
                      final isMine = msg.senderId == _myId;
                      final prev = i > 0 ? _messages[i - 1] : null;
                      final showDate = prev == null ||
                          DateTime.parse(msg.createdAt).difference(DateTime.parse(prev.createdAt)).inHours.abs() > 6;

                      return Column(
                        children: [
                          if (showDate)
                            Padding(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              child: Text(
                                timeago.format(DateTime.parse(msg.createdAt), locale: 'fr'),
                                style: TextStyle(fontSize: 11, color: Colors.grey.shade400),
                              ),
                            ),
                          _MessageBubble(msg: msg, isMine: isMine),
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
}

class _MessageBubble extends StatelessWidget {
  final Message msg;
  final bool isMine;
  const _MessageBubble({required this.msg, required this.isMine});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bubbleMine = kOrange;
    final bubbleOther = isDark ? const Color(0xFF2D3139) : Colors.white;
    final textMine = Colors.white;
    final textOther = isDark ? Colors.white : const Color(0xFF1A1A1A);

    return Align(
      alignment: isMine ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.72),
        child: Container(
          margin: EdgeInsets.only(
            top: 2, bottom: 2,
            left: isMine ? 40 : 0,
            right: isMine ? 0 : 40,
          ),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: isMine ? bubbleMine : bubbleOther,
            borderRadius: BorderRadius.only(
              topLeft: const Radius.circular(18),
              topRight: const Radius.circular(18),
              bottomLeft: Radius.circular(isMine ? 18 : 4),
              bottomRight: Radius.circular(isMine ? 4 : 18),
            ),
            boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 4, offset: const Offset(0, 2))],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              if (msg.mediaUrl != null && _isImage(msg.mediaUrl!))
                ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: Image.network(msg.mediaUrl!, fit: BoxFit.cover, width: 220),
                ),
              if (msg.content.isNotEmpty)
                Text(msg.content, style: TextStyle(color: isMine ? textMine : textOther, fontSize: 14, height: 1.4)),
              const SizedBox(height: 2),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    _timeStr(msg.createdAt),
                    style: TextStyle(fontSize: 10, color: isMine ? Colors.white60 : Colors.grey.shade400),
                  ),
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
          ),
        ),
      ),
    );
  }

  bool _isImage(String url) => RegExp(r'\.(jpg|jpeg|png|webp|gif)(\?|$)', caseSensitive: false).hasMatch(url);

  String _timeStr(String iso) {
    final dt = DateTime.parse(iso).toLocal();
    return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }
}

class _InputBar extends StatelessWidget {
  final TextEditingController controller;
  final bool sending;
  final VoidCallback onSend;
  final VoidCallback onPickImage;

  const _InputBar({
    required this.controller,
    required this.sending,
    required this.onSend,
    required this.onPickImage,
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
              constraints: const BoxConstraints(),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: TextField(
                controller: controller,
                minLines: 1,
                maxLines: 4,
                decoration: InputDecoration(
                  hintText: 'Écrire un message…',
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  fillColor: isDark ? const Color(0xFF2D3139) : const Color(0xFFF1F5F9),
                ),
                onSubmitted: (_) => onSend(),
              ),
            ),
            const SizedBox(width: 8),
            GestureDetector(
              onTap: sending ? null : onSend,
              child: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: sending ? Colors.grey.shade300 : kOrange,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: sending
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Icon(Icons.send_rounded, color: Colors.white, size: 20),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
