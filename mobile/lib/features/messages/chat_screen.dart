import 'dart:io';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:timeago/timeago.dart' as timeago;
import 'package:image_picker/image_picker.dart';
import 'package:file_picker/file_picker.dart';
import '../../models/models.dart';
import '../../widgets/app_avatar.dart';
import '../../core/theme.dart';
import '../../core/constants.dart';
import '../pdf_viewer/pdf_viewer_screen.dart';

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
  late RealtimeChannel _channel;

  // Media en attente
  File? _pendingFile;
  String? _pendingFileType;
  String? _pendingFileName;
  bool _uploading = false;
  bool _isViewOnce = false; // "vue une fois"

  // Réponse à un message
  Message? _replyTo;

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
    await _sb.from('messages')
        .update({'is_read': true})
        .eq('conversation_id', widget.conversation.id)
        .neq('sender_id', _myId!)
        .eq('is_read', false);
  }

  void _subscribeRealtime() {
    _channel = _sb.channel('chat-${widget.conversation.id}');
    _channel.onPostgresChanges(
      event: PostgresChangeEvent.insert,
      schema: 'public',
      table: 'messages',
      filter: PostgresChangeFilter(
        type: PostgresChangeFilterType.eq,
        column: 'conversation_id',
        value: widget.conversation.id,
      ),
      callback: (payload) async {
        // Le payload Realtime ne contient PAS le profil du sender
        // → on recharge le message complet avec le join profiles
        final msgId = payload.newRecord['id'] as String?;
        final senderId = payload.newRecord['sender_id'] as String?;
        if (msgId == null || senderId == _myId) return;
        try {
          final fullData = await _sb
              .from('messages')
              .select('*, sender:profiles(id,username,full_name,first_name,avatar_url)')
              .eq('id', msgId)
              .single();
          final newMsg = Message.fromJson(fullData);
          if (!mounted) return;
          setState(() => _messages.add(newMsg));
          _scrollToBottom();
        } catch (_) {}
      },
    ).subscribe();
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

  // ── Sélecteur media ─────────────────────────────────────────────────────────
  void _showMediaPicker() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? const Color(0xFF1E2025) : Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(width: 40, height: 4, margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2))),
              const Text('Envoyer un fichier', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
              const SizedBox(height: 16),
              ListTile(
                leading: Container(width: 44, height: 44,
                  decoration: BoxDecoration(color: kGreen.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                  child: const Icon(Icons.image_outlined, color: kGreen, size: 24)),
                title: const Text('Photo', style: TextStyle(fontWeight: FontWeight.w600)),
                subtitle: const Text('Galerie ou appareil photo'),
                onTap: () { Navigator.pop(ctx); _pickImage(); },
              ),
              ListTile(
                leading: Container(width: 44, height: 44,
                  decoration: BoxDecoration(color: Colors.red.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                  child: Icon(Icons.picture_as_pdf, color: Colors.red.shade600, size: 24)),
                title: const Text('Document PDF', style: TextStyle(fontWeight: FontWeight.w600)),
                subtitle: const Text('Cours, sujets, documents...'),
                onTap: () { Navigator.pop(ctx); _pickPdf(); },
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _pickImage() async {
    final source = await showDialog<ImageSource>(
      context: context,
      builder: (ctx) => SimpleDialog(title: const Text('Choisir une photo'), children: [
        SimpleDialogOption(onPressed: () => Navigator.pop(ctx, ImageSource.gallery),
          child: const Row(children: [Icon(Icons.photo_library_outlined, size: 20), SizedBox(width: 12), Text('Galerie')])),
        SimpleDialogOption(onPressed: () => Navigator.pop(ctx, ImageSource.camera),
          child: const Row(children: [Icon(Icons.camera_alt_outlined, size: 20), SizedBox(width: 12), Text('Appareil photo')])),
      ]),
    );
    if (source == null) return;
    final file = await ImagePicker().pickImage(source: source, imageQuality: 80);
    if (file == null || !mounted) return;
    setState(() { _pendingFile = File(file.path); _pendingFileType = 'image'; _pendingFileName = file.name; _isViewOnce = false; });
  }

  Future<void> _pickPdf() async {
    final result = await FilePicker.platform.pickFiles(type: FileType.custom, allowedExtensions: ['pdf']);
    if (result == null || result.files.isEmpty || !mounted) return;
    final picked = result.files.first;
    if (picked.path == null) return;
    final file = File(picked.path!);
    if (await file.length() > 50 * 1024 * 1024) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Fichier trop volumineux (max 50 MB)')));
      return;
    }
    setState(() { _pendingFile = file; _pendingFileType = 'pdf'; _pendingFileName = picked.name; _isViewOnce = false; });
  }

  void _cancelPending() => setState(() { _pendingFile = null; _pendingFileType = null; _pendingFileName = null; _isViewOnce = false; });
  void _cancelReply() => setState(() => _replyTo = null);

  // ── Vue une fois : marquer comme vue ────────────────────────────────────────
  bool _markingViewed = false;

  Future<void> _markViewed(Message msg) async {
    if (_markingViewed) return;
    _markingViewed = true;
    try {
      await _sb.from('messages').update({'is_viewed': true}).eq('id', msg.id);
      if (!mounted) return;
      setState(() {
        final idx = _messages.indexWhere((m) => m.id == msg.id);
        if (idx != -1) {
          _messages[idx] = Message(
            id: msg.id, conversationId: msg.conversationId, senderId: msg.senderId,
            content: msg.content, mediaUrl: msg.mediaUrl, isRead: msg.isRead,
            isDeleted: msg.isDeleted, isViewOnce: msg.isViewOnce, isViewed: true,
            replyToId: msg.replyToId, replyToContent: msg.replyToContent, replyToSender: msg.replyToSender,
            createdAt: msg.createdAt, sender: msg.sender,
          );
        }
      });
    } finally {
      _markingViewed = false;
    }
  }

  // ── Envoi de message ─────────────────────────────────────────────────────────
  Future<void> _sendMessage() async {
    final content = _msgCtrl.text.trim();
    if (content.isEmpty && _pendingFile == null) return;
    if (_sending || _myId == null) return;
    setState(() => _sending = true);
    _msgCtrl.clear();

    String? mediaUrl;
    String messageContent = content;

    if (_pendingFile != null) {
      setState(() => _uploading = true);
      try {
        final bytes = await _pendingFile!.readAsBytes();
        final ext = _pendingFileType == 'pdf' ? 'pdf' : 'jpg';
        final path = '$_myId/messages/${DateTime.now().millisecondsSinceEpoch}.$ext';
        await _sb.storage.from(AppConstants.storageBucket).uploadBinary(path, bytes);
        mediaUrl = _sb.storage.from(AppConstants.storageBucket).getPublicUrl(path);
        if (_pendingFileType == 'pdf' && content.isEmpty) messageContent = _pendingFileName ?? 'Document PDF';
      } catch (_) {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Erreur lors de l'envoi")));
        setState(() { _sending = false; _uploading = false; });
        return;
      }
      setState(() { _uploading = false; _pendingFile = null; _pendingFileType = null; _pendingFileName = null; });
    }

    final tempId = 'temp-${DateTime.now().millisecondsSinceEpoch}';
    final optimistic = Message(
      id: tempId, conversationId: widget.conversation.id, senderId: _myId!,
      content: messageContent, mediaUrl: mediaUrl, isViewOnce: _isViewOnce,
      replyToId: _replyTo?.id, replyToContent: _replyTo?.content,
      replyToSender: _replyTo?.sender?.firstName ?? _replyTo?.sender?.fullName,
      createdAt: DateTime.now().toIso8601String(),
    );
    final wasReplyTo = _replyTo;
    setState(() { _messages.add(optimistic); _replyTo = null; _isViewOnce = false; });
    _scrollToBottom();

    try {
      final data = await _sb.from('messages').insert({
        'conversation_id': widget.conversation.id,
        'sender_id': _myId,
        'content': messageContent,
        if (mediaUrl != null) 'media_url': mediaUrl,
        'is_view_once': optimistic.isViewOnce,
        if (wasReplyTo != null) 'reply_to_id': wasReplyTo.id,
        if (wasReplyTo != null) 'reply_to_content': wasReplyTo.content.isNotEmpty ? wasReplyTo.content : '📎 Fichier',
        if (wasReplyTo != null) 'reply_to_sender': wasReplyTo.sender?.firstName ?? wasReplyTo.sender?.fullName ?? '',
      }).select('*, sender:profiles(id,username,full_name,first_name,avatar_url)').single();
      final real = Message.fromJson(data);
      if (!mounted) return;
      setState(() {
        final idx = _messages.indexWhere((m) => m.id == tempId);
        if (idx != -1) _messages[idx] = real;
      });
      await _sb.from('conversations').update({
        'last_message': mediaUrl != null ? (messageContent.isEmpty ? '📎 Fichier' : messageContent) : messageContent,
        'last_message_at': DateTime.now().toIso8601String(),
        'is_active': true,
      }).eq('id', widget.conversation.id);
    } catch (_) {
      if (mounted) setState(() => _messages.removeWhere((m) => m.id == tempId));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  String _formatDate(String iso) {
    final now = DateTime.now(); final msg = DateTime.parse(iso).toLocal();
    final today = DateTime(now.year, now.month, now.day);
    final yesterday = today.subtract(const Duration(days: 1));
    final msgDate = DateTime(msg.year, msg.month, msg.day);
    if (msgDate == today) return "Aujourd'hui";
    if (msgDate == yesterday) return 'Hier';
    const months = ['jan.','fév.','mar.','avr.','mai','juin','juil.','aoû.','sep.','oct.','nov.','déc.'];
    return '${msg.day} ${months[msg.month-1]}${msg.year != now.year ? ' ${msg.year}' : ''}';
  }

  bool _isSameDay(String a, String b) {
    final da = DateTime.parse(a).toLocal(); final db = DateTime.parse(b).toLocal();
    return da.year == db.year && da.month == db.month && da.day == db.day;
  }

  String _timeStr(String iso) {
    final dt = DateTime.parse(iso).toLocal();
    return '${dt.hour.toString().padLeft(2,'0')}:${dt.minute.toString().padLeft(2,'0')}';
  }

  @override
  void dispose() {
    _msgCtrl.dispose(); _scrollCtrl.dispose();
    _channel.unsubscribe();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final other = widget.conversation.otherParticipant;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F1117) : const Color(0xFFF0F2F5),
      appBar: AppBar(
        backgroundColor: isDark ? const Color(0xFF1E2025) : Colors.white,
        titleSpacing: 0,
        leading: const BackButton(),
        title: Row(children: [
          AppAvatar(url: other?.avatarUrl, initials: other?.initials ?? 'U', size: 36, isOnline: other?.isActive ?? false),
          const SizedBox(width: 10),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(other?.fullName ?? '', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
            Text(other?.isActive == true ? 'En ligne' : 'Hors ligne',
              style: TextStyle(fontSize: 11, color: other?.isActive == true ? kGreen : Colors.grey.shade400, fontWeight: FontWeight.w500)),
          ]),
        ]),
      ),
      body: Column(children: [
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator(color: kOrange))
              : _messages.isEmpty
                  ? _buildEmpty(other)
                  : ListView.builder(
                      controller: _scrollCtrl,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      itemCount: _messages.length,
                      itemBuilder: (ctx, i) {
                        final msg = _messages[i];
                        final isMine = msg.senderId == _myId;
                        final prev = i > 0 ? _messages[i-1] : null;
                        final next = i < _messages.length-1 ? _messages[i+1] : null;
                        final isFirst = prev == null || prev.senderId != msg.senderId;
                        final isLast = next == null || next.senderId != msg.senderId;
                        final showDate = prev == null || !_isSameDay(prev.createdAt, msg.createdAt);

                        return Column(children: [
                          if (showDate) Padding(
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
                          // Glisser pour répondre
                          _SwipeToReply(
                            isMine: isMine,
                            onReply: () => setState(() => _replyTo = msg),
                            child: _MessageBubble(
                              msg: msg, isMine: isMine, isFirst: isFirst, isLast: isLast,
                              timeStr: _timeStr(msg.createdAt),
                              onViewOnce: () => _markViewed(msg),
                            ),
                          ),
                        ]);
                      },
                    ),
        ),
        _InputBar(
          controller: _msgCtrl,
          sending: _sending, uploading: _uploading,
          pendingFile: _pendingFile, pendingFileType: _pendingFileType, pendingFileName: _pendingFileName,
          isViewOnce: _isViewOnce,
          replyTo: _replyTo,
          onSend: _sendMessage,
          onPickMedia: _showMediaPicker,
          onCancelPending: _cancelPending,
          onCancelReply: _cancelReply,
          onToggleViewOnce: () => setState(() => _isViewOnce = !_isViewOnce),
        ),
      ]),
    );
  }

  Widget _buildEmpty(Profile? other) => Center(
    child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
      AppAvatar(url: other?.avatarUrl, initials: other?.initials ?? 'U', size: 72),
      const SizedBox(height: 16),
      Text(other?.fullName ?? '', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
      const SizedBox(height: 8),
      Text('Démarrez la conversation avec ${other?.firstName ?? other?.fullName ?? ''}!',
        style: TextStyle(color: Colors.grey.shade500, fontSize: 14)),
    ]),
  );
}

// ── Glisser pour répondre ─────────────────────────────────────────────────────

class _SwipeToReply extends StatefulWidget {
  final Widget child;
  final bool isMine;
  final VoidCallback onReply;
  const _SwipeToReply({required this.child, required this.isMine, required this.onReply});
  @override
  State<_SwipeToReply> createState() => _SwipeToReplyState();
}

class _SwipeToReplyState extends State<_SwipeToReply> with SingleTickerProviderStateMixin {
  double _offset = 0;
  bool _triggered = false;
  late AnimationController _iconAnim;

  @override
  void initState() {
    super.initState();
    _iconAnim = AnimationController(vsync: this, duration: const Duration(milliseconds: 200));
  }

  @override
  void dispose() { _iconAnim.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onHorizontalDragUpdate: (d) {
        // Glisser vers la droite uniquement
        if (d.delta.dx > 0) {
          setState(() {
            _offset = (_offset + d.delta.dx).clamp(0.0, 72.0);
            if (_offset > 50 && !_triggered) {
              _triggered = true;
              _iconAnim.forward(from: 0);
            }
          });
        }
      },
      onHorizontalDragEnd: (_) {
        if (_triggered) widget.onReply();
        setState(() { _offset = 0; _triggered = false; });
      },
      child: Stack(
        children: [
          // Icône répondre visible derrière
          Positioned(
            left: 8,
            top: 0, bottom: 0,
            child: Opacity(
              opacity: (_offset / 60).clamp(0.0, 1.0),
              child: Center(
                child: Transform.scale(
                  scale: (_offset / 50).clamp(0.5, 1.0),
                  child: Container(
                    width: 32, height: 32,
                    decoration: BoxDecoration(
                      color: kOrange.withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.reply_rounded, color: kOrange, size: 18),
                  ),
                ),
              ),
            ),
          ),
          // Message décalé
          Transform.translate(
            offset: Offset(_offset, 0),
            child: widget.child,
          ),
        ],
      ),
    );
  }
}

// ── Bulle de message ──────────────────────────────────────────────────────────

class _MessageBubble extends StatelessWidget {
  final Message msg;
  final bool isMine, isFirst, isLast;
  final String timeStr;
  final VoidCallback onViewOnce;

  const _MessageBubble({
    required this.msg, required this.isMine, required this.isFirst,
    required this.isLast, required this.timeStr, required this.onViewOnce,
  });

  bool _isImage(String url) => RegExp(r'\.(jpg|jpeg|png|webp|gif)(\?|$)', caseSensitive: false).hasMatch(url);
  bool _isPdf(String url) => RegExp(r'\.pdf(\?|$)', caseSensitive: false).hasMatch(url);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bubbleMine = kOrange;
    final bubbleOther = isDark ? const Color(0xFF2D3139) : Colors.white;
    final hasPdf = msg.mediaUrl != null && _isPdf(msg.mediaUrl!);
    final hasImage = msg.mediaUrl != null && _isImage(msg.mediaUrl!);
    final hasText = msg.content.isNotEmpty && !hasPdf;

    final br = BorderRadius.only(
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
          if (!isMine) ...[
            SizedBox(width: 32, child: isLast
                ? AppAvatar(url: msg.sender?.avatarUrl, initials: msg.sender?.initials ?? 'U', size: 28)
                : const SizedBox()),
            const SizedBox(width: 4),
          ],
          ConstrainedBox(
            constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.72),
            child: Container(
              margin: EdgeInsets.only(top: isFirst ? 6 : 2, bottom: isLast ? 6 : 2, left: isMine ? 40 : 0),
              decoration: BoxDecoration(
                color: hasPdf ? Colors.transparent : (isMine ? bubbleMine : bubbleOther),
                borderRadius: br,
                boxShadow: hasPdf ? null : [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 4, offset: const Offset(0, 2))],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Aperçu du message auquel on répond
                  if (msg.replyToContent != null && msg.replyToContent!.isNotEmpty)
                    Container(
                      margin: const EdgeInsets.fromLTRB(6, 6, 6, 0),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: (isMine ? Colors.white : kOrange).withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(10),
                        border: Border(left: BorderSide(color: isMine ? Colors.white : kOrange, width: 3)),
                      ),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        if (msg.replyToSender != null)
                          Text(msg.replyToSender!,
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700,
                              color: isMine ? Colors.white : kOrange)),
                        Text(msg.replyToContent!, maxLines: 1, overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontSize: 12, color: isMine ? Colors.white70 : Colors.grey.shade600)),
                      ]),
                    ),

                  // ── Photo "vue une fois" ──────────────────────────────
                  if (hasImage && msg.isViewOnce)
                    _ViewOnceBubble(
                      msg: msg,
                      isMine: isMine,
                      timeStr: timeStr,
                      borderRadius: br,
                      onViewOnce: onViewOnce,
                    ),

                  // ── Photo normale ───────────────────────────────────────
                  if (hasImage && !msg.isViewOnce)
                    GestureDetector(
                      onTap: () => Navigator.of(context, rootNavigator: true).push(MaterialPageRoute(
                        builder: (_) => _ImageViewer(url: msg.mediaUrl!), fullscreenDialog: true)),
                      child: ClipRRect(
                        borderRadius: br,
                        child: Image.network(msg.mediaUrl!, fit: BoxFit.cover, width: 220,
                          loadingBuilder: (_, child, p) => p == null ? child : Container(
                            width: 220, height: 160, color: Colors.grey.shade200,
                            child: const Center(child: CircularProgressIndicator(color: kOrange, strokeWidth: 2)))),
                      ),
                    ),

                  // ── PDF ─────────────────────────────────────────────────
                  if (hasPdf)
                    GestureDetector(
                      onTap: () => Navigator.of(context, rootNavigator: true).push(MaterialPageRoute(
                        builder: (_) => PdfViewerScreen(url: msg.mediaUrl!,
                          title: msg.content.isEmpty ? 'Document PDF' : msg.content), fullscreenDialog: true)),
                      child: Container(
                        width: 240,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(colors: [Colors.red.shade700, Colors.red.shade500], begin: Alignment.topLeft, end: Alignment.bottomRight),
                          borderRadius: br,
                          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.12), blurRadius: 6, offset: const Offset(0, 2))],
                        ),
                        child: Column(children: [
                          Padding(padding: const EdgeInsets.fromLTRB(14, 14, 14, 8),
                            child: Row(children: [
                              Container(width: 44, height: 44,
                                decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(10)),
                                child: const Icon(Icons.picture_as_pdf, color: Colors.white, size: 26)),
                              const SizedBox(width: 10),
                              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Text(msg.content.isEmpty ? 'Document PDF' : msg.content.replaceAll(RegExp(r'\.[^/.]+$'), ''),
                                  style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700),
                                  maxLines: 2, overflow: TextOverflow.ellipsis),
                                const Text('Appuyer pour ouvrir', style: TextStyle(color: Colors.white70, fontSize: 10)),
                              ])),
                            ])),
                          Padding(padding: const EdgeInsets.fromLTRB(14, 0, 14, 10),
                            child: Row(mainAxisAlignment: MainAxisAlignment.end, children: [
                              Text(timeStr, style: const TextStyle(color: Colors.white60, fontSize: 10)),
                              if (isMine) ...[const SizedBox(width: 4),
                                Icon(msg.isRead ? Icons.done_all : Icons.done, size: 11, color: Colors.white60)],
                            ])),
                        ]),
                      ),
                    ),

                  // ── Texte ────────────────────────────────────────────────
                  if (hasText)
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                        Text(msg.content,
                          style: TextStyle(
                            color: isMine ? Colors.white : (isDark ? Colors.white : const Color(0xFF1A1A1A)),
                            fontSize: 14, height: 1.4)),
                        if (isLast) ...[
                          const SizedBox(height: 2),
                          Row(mainAxisSize: MainAxisSize.min, children: [
                            Text(timeStr, style: TextStyle(fontSize: 10, color: isMine ? Colors.white60 : Colors.grey.shade400)),
                            if (isMine) ...[const SizedBox(width: 4),
                              Icon(msg.isRead ? Icons.done_all : Icons.done, size: 12,
                                color: msg.isRead ? Colors.white : Colors.white60)],
                          ]),
                        ],
                      ]),
                    ),

                  // Heure sous image normale
                  if (hasImage && !msg.isViewOnce && isLast)
                    Padding(padding: const EdgeInsets.fromLTRB(8, 4, 8, 6),
                      child: Row(mainAxisSize: MainAxisSize.min, children: [
                        Text(timeStr, style: TextStyle(fontSize: 10, color: isMine ? Colors.white60 : Colors.grey.shade400)),
                        if (isMine) ...[const SizedBox(width: 4),
                          Icon(msg.isRead ? Icons.done_all : Icons.done, size: 12,
                            color: msg.isRead ? Colors.white : Colors.white60)],
                      ])),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Bulle "vue une fois" (style Telegram) ────────────────────────────────────

class _ViewOnceBubble extends StatelessWidget {
  final Message msg;
  final bool isMine;
  final String timeStr;
  final BorderRadius borderRadius;
  final VoidCallback onViewOnce;

  const _ViewOnceBubble({
    required this.msg, required this.isMine, required this.timeStr,
    required this.borderRadius, required this.onViewOnce,
  });

  @override
  Widget build(BuildContext context) {
    // ── EXPÉDITEUR : bulle sans photo, juste l'état ─────────────────────────
    if (isMine) {
      return Container(
        width: 220,
        decoration: BoxDecoration(
          color: msg.isViewed
              ? const Color(0xFFEA580C).withValues(alpha: 0.7) // Opened — plus discret
              : kOrange,
          borderRadius: borderRadius,
        ),
        padding: const EdgeInsets.fromLTRB(14, 10, 14, 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Container(
                width: 28, height: 28,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: msg.isViewed
                      ? const Icon(Icons.camera_alt, color: Colors.white, size: 15)
                      : const Text('1', style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w900)),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Photo', style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w700)),
                  Text(
                    msg.isViewed ? 'Ouverte ✓' : 'En attente d\'ouverture',
                    style: const TextStyle(color: Colors.white70, fontSize: 10),
                  ),
                ]),
              ),
            ]),
            const SizedBox(height: 6),
            Row(mainAxisAlignment: MainAxisAlignment.end, children: [
              Text(timeStr, style: const TextStyle(color: Colors.white60, fontSize: 10)),
              const SizedBox(width: 3),
              Icon(msg.isRead ? Icons.done_all : Icons.done, size: 12, color: Colors.white60),
            ]),
          ],
        ),
      );
    }

    // ── DESTINATAIRE : bulle dégradé foncé style Telegram ───────────────────
    return GestureDetector(
      onTap: msg.isViewed ? null : () async {
        await Navigator.of(context, rootNavigator: true).push(MaterialPageRoute(
          builder: (_) => _ViewOnceViewer(url: msg.mediaUrl!),
          fullscreenDialog: true,
        ));
        onViewOnce();
      },
      child: Container(
        width: 220, height: 150,
        decoration: BoxDecoration(
          gradient: msg.isViewed
              ? LinearGradient(
                  colors: [Colors.grey.shade700, Colors.grey.shade600],
                  begin: Alignment.topLeft, end: Alignment.bottomRight)
              : const LinearGradient(
                  colors: [Color(0xFF3B1F6E), Color(0xFF1A3A5C)], // violet foncé → bleu nuit
                  begin: Alignment.topLeft, end: Alignment.bottomRight),
          borderRadius: borderRadius,
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.15), blurRadius: 8, offset: const Offset(0, 3))],
        ),
        child: Stack(
          children: [
            // Contenu centré
            Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (!msg.isViewed) ...[
                    // Cercle "1" blanc
                    Container(
                      width: 52, height: 52,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.2),
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white.withValues(alpha: 0.5), width: 2),
                      ),
                      child: const Center(
                        child: Text('1', style: TextStyle(
                          color: Colors.white, fontSize: 24,
                          fontWeight: FontWeight.w900, height: 1,
                        )),
                      ),
                    ),
                    const SizedBox(height: 10),
                    const Text('Photo', style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 2),
                    Text('Appuyer pour voir',
                      style: TextStyle(color: Colors.white.withValues(alpha: 0.65), fontSize: 11)),
                  ] else ...[
                    // État "vue"
                    const Icon(Icons.camera_alt, color: Colors.white54, size: 32),
                    const SizedBox(height: 8),
                    const Text('Photo', style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 2),
                    const Text('Déjà ouverte', style: TextStyle(color: Colors.white38, fontSize: 11)),
                  ],
                ],
              ),
            ),
            // Heure en bas à droite
            Positioned(
              bottom: 8, right: 10,
              child: Text(timeStr, style: const TextStyle(color: Colors.white38, fontSize: 10)),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Visionneuse "vue une fois" ────────────────────────────────────────────────

class _ViewOnceViewer extends StatefulWidget {
  final String url;
  const _ViewOnceViewer({required this.url});
  @override
  State<_ViewOnceViewer> createState() => _ViewOnceViewerState();
}

class _ViewOnceViewerState extends State<_ViewOnceViewer> {
  // Fermeture immédiate quand l'utilisateur sort — pas de countdown
  // La photo disparaît dès qu'on quitte l'écran (pop)

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: Colors.black,
    appBar: AppBar(
      backgroundColor: Colors.black,
      foregroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
      leading: IconButton(
        icon: const Icon(Icons.close, color: Colors.white),
        onPressed: () => Navigator.pop(context),
      ),
      title: Row(children: [
        Container(
          width: 24, height: 24,
          decoration: BoxDecoration(
            border: Border.all(color: Colors.white70, width: 2),
            shape: BoxShape.circle,
          ),
          child: const Center(child: Text('1', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w900))),
        ),
        const SizedBox(width: 8),
        const Text('Vue une fois', style: TextStyle(color: Colors.white, fontSize: 14)),
      ]),
      // Pas de boutons save/share/forward
      actions: const [],
    ),
    body: Center(
      child: InteractiveViewer(
        minScale: 0.5, maxScale: 4.0,
        child: Image.network(
          widget.url,
          fit: BoxFit.contain,
          loadingBuilder: (_, child, p) => p == null
              ? child
              : Center(
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    const CircularProgressIndicator(color: Colors.white),
                    const SizedBox(height: 12),
                    Text('Chargement…', style: TextStyle(color: Colors.white54, fontSize: 12)),
                  ]),
                ),
        ),
      ),
    ),
    // Pas de bottomBar, pas de bouton télécharger
  );
}

// ── Visionneuse image normale ─────────────────────────────────────────────────

class _ImageViewer extends StatelessWidget {
  final String url;
  const _ImageViewer({required this.url});
  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: Colors.black,
    appBar: AppBar(backgroundColor: Colors.black, foregroundColor: Colors.white, surfaceTintColor: Colors.transparent),
    body: Center(
      child: InteractiveViewer(
        minScale: 0.8, maxScale: 4.0,
        child: Image.network(url, fit: BoxFit.contain,
          loadingBuilder: (_, child, p) => p == null ? child
              : const Center(child: CircularProgressIndicator(color: Colors.white))),
      ),
    ),
  );
}

// ── Barre de saisie ────────────────────────────────────────────────────────────

class _InputBar extends StatelessWidget {
  final TextEditingController controller;
  final bool sending, uploading, isViewOnce;
  final File? pendingFile;
  final String? pendingFileType, pendingFileName;
  final Message? replyTo;
  final VoidCallback onSend, onPickMedia, onCancelPending, onCancelReply, onToggleViewOnce;

  const _InputBar({
    required this.controller, required this.sending, required this.uploading,
    required this.isViewOnce, this.pendingFile, this.pendingFileType,
    this.pendingFileName, this.replyTo,
    required this.onSend, required this.onPickMedia, required this.onCancelPending,
    required this.onCancelReply, required this.onToggleViewOnce,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final barColor = isDark ? const Color(0xFF1E2025) : Colors.white;
    final dividerColor = isDark ? const Color(0xFF2D3139) : Colors.grey.shade200;

    return SafeArea(
      top: false,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Aperçu réponse
          if (replyTo != null)
            Container(
              color: barColor,
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: kOrange.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(10),
                  border: Border(left: const BorderSide(color: kOrange, width: 3)),
                ),
                child: Row(children: [
                  const Icon(Icons.reply_rounded, color: kOrange, size: 16),
                  const SizedBox(width: 8),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                    Text(replyTo!.sender?.firstName ?? replyTo!.sender?.fullName ?? 'Message',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: kOrange)),
                    Text(replyTo!.content.isNotEmpty ? replyTo!.content : '📎 Fichier',
                      maxLines: 1, overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                  ])),
                  GestureDetector(onTap: onCancelReply,
                    child: const Icon(Icons.close, size: 16, color: Colors.grey)),
                ]),
              ),
            ),

          // Aperçu fichier
          if (pendingFile != null)
            Container(
              color: barColor,
              padding: const EdgeInsets.fromLTRB(12, 6, 12, 0),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF2D3139) : Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: dividerColor),
                ),
                child: Row(children: [
                  if (pendingFileType == 'image')
                    ClipRRect(borderRadius: BorderRadius.circular(8),
                      child: Image.file(pendingFile!, width: 48, height: 48, fit: BoxFit.cover))
                  else
                    Container(width: 48, height: 48,
                      decoration: BoxDecoration(color: Colors.red.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
                      child: Icon(Icons.picture_as_pdf, color: Colors.red.shade600, size: 24)),
                  const SizedBox(width: 10),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(pendingFileName ?? (pendingFileType == 'image' ? 'Image' : 'PDF'),
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12), maxLines: 1, overflow: TextOverflow.ellipsis),
                    Text(pendingFileType == 'image' ? 'Image sélectionnée' : 'PDF sélectionné',
                      style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                  ])),
                  if (uploading)
                    const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: kOrange, strokeWidth: 2))
                  else
                    GestureDetector(onTap: onCancelPending,
                      child: Container(padding: const EdgeInsets.all(4),
                        decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                        child: const Icon(Icons.close, size: 12, color: Colors.white))),
                ]),
              ),
            ),

          // Saisie
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: barColor,
              border: Border(top: BorderSide(color: dividerColor)),
            ),
            child: Row(children: [
              GestureDetector(
                onTap: (sending || uploading) ? null : onPickMedia,
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: kOrange.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10)),
                  child: Icon(Icons.add, color: (sending || uploading) ? Colors.grey : kOrange, size: 20),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: controller,
                  minLines: 1, maxLines: 4,
                  onSubmitted: (_) => onSend(),
                  decoration: InputDecoration(
                    hintText: replyTo != null ? 'Répondre…' : (pendingFile != null ? 'Ajouter un message...' : 'Écrire un message…'),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    fillColor: isDark ? const Color(0xFF2D3139) : const Color(0xFFF1F5F9),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              // Bouton ① vue une fois — visible si photo en attente, à GAUCHE du send
              if (pendingFileType == 'image') ...[
                GestureDetector(
                  onTap: onToggleViewOnce,
                  child: Tooltip(
                    message: isViewOnce ? 'Désactiver — envoyer normalement' : 'Vue une fois (comme Telegram)',
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      width: 40, height: 40,
                      decoration: BoxDecoration(
                        color: isViewOnce ? const Color(0xFF6B21A8) : Colors.transparent,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: isViewOnce ? const Color(0xFF6B21A8) : Colors.grey.shade400,
                          width: 2,
                        ),
                      ),
                      child: Center(
                        child: Text('1',
                          style: TextStyle(
                            fontSize: 17, fontWeight: FontWeight.w900,
                            color: isViewOnce ? Colors.white : Colors.grey.shade400,
                          )),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 6),
              ],

              // Bouton envoyer — change d'apparence si view-once activé
              GestureDetector(
                onTap: (sending || uploading) ? null : onSend,
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  width: 40, height: 40,
                  decoration: BoxDecoration(
                    color: (sending || uploading)
                        ? Colors.grey.shade300
                        : (isViewOnce ? const Color(0xFF6B21A8) : kOrange),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: (sending || uploading)
                      ? const Padding(padding: EdgeInsets.all(10), child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : isViewOnce
                          ? const Center(child: Text('1', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900)))
                          : const Icon(Icons.send_rounded, color: Colors.white, size: 20),
                ),
              ),
            ]),
          ),
        ],
      ),
    );
  }
}
