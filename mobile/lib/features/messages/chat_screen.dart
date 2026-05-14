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
  String? _pendingFileType; // 'image' ou 'pdf'
  String? _pendingFileName;
  bool _uploading = false;

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
      callback: (payload) {
        final newMsg = Message.fromJson(payload.newRecord);
        if (newMsg.senderId == _myId) return;
        if (!mounted) return;
        setState(() => _messages.add(newMsg));
        _scrollToBottom();
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

  // ── Sélecteur media : bottom sheet Image / PDF ──────────────────────────────
  void _showMediaPicker() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? const Color(0xFF1E2025) : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40, height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const Text('Envoyer un fichier',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
              const SizedBox(height: 16),
              ListTile(
                leading: Container(
                  width: 44, height: 44,
                  decoration: BoxDecoration(color: kGreen.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                  child: const Icon(Icons.image_outlined, color: kGreen, size: 24),
                ),
                title: const Text('Photo', style: TextStyle(fontWeight: FontWeight.w600)),
                subtitle: const Text('Galerie ou appareil photo'),
                onTap: () { Navigator.pop(ctx); _pickImage(); },
              ),
              ListTile(
                leading: Container(
                  width: 44, height: 44,
                  decoration: BoxDecoration(color: Colors.red.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                  child: Icon(Icons.picture_as_pdf, color: Colors.red.shade600, size: 24),
                ),
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
    // Choix source
    final source = await showDialog<ImageSource>(
      context: context,
      builder: (ctx) => SimpleDialog(
        title: const Text('Choisir une photo'),
        children: [
          SimpleDialogOption(
            onPressed: () => Navigator.pop(ctx, ImageSource.gallery),
            child: const Row(children: [
              Icon(Icons.photo_library_outlined, size: 20),
              SizedBox(width: 12),
              Text('Galerie'),
            ]),
          ),
          SimpleDialogOption(
            onPressed: () => Navigator.pop(ctx, ImageSource.camera),
            child: const Row(children: [
              Icon(Icons.camera_alt_outlined, size: 20),
              SizedBox(width: 12),
              Text('Appareil photo'),
            ]),
          ),
        ],
      ),
    );
    if (source == null) return;

    final picker = ImagePicker();
    final file = await picker.pickImage(source: source, imageQuality: 80);
    if (file == null || !mounted) return;

    setState(() {
      _pendingFile = File(file.path);
      _pendingFileType = 'image';
      _pendingFileName = file.name;
    });
  }

  Future<void> _pickPdf() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf'],
    );
    if (result == null || result.files.isEmpty || !mounted) return;
    final picked = result.files.first;
    if (picked.path == null) return;

    final file = File(picked.path!);
    final size = await file.length();
    if (size > 50 * 1024 * 1024) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Fichier trop volumineux (max 50 MB)')),
      );
      return;
    }

    setState(() {
      _pendingFile = file;
      _pendingFileType = 'pdf';
      _pendingFileName = picked.name;
    });
  }

  void _cancelPending() => setState(() { _pendingFile = null; _pendingFileType = null; _pendingFileName = null; });

  Future<void> _sendMessage({String? text}) async {
    final content = (text ?? _msgCtrl.text).trim();
    if (content.isEmpty && _pendingFile == null) return;
    if (_sending || _myId == null) return;
    setState(() { _sending = true; });
    _msgCtrl.clear();

    String? mediaUrl;
    String messageContent = content;

    // Upload le fichier en attente
    if (_pendingFile != null) {
      setState(() => _uploading = true);
      try {
        final bytes = await _pendingFile!.readAsBytes();
        final ext = _pendingFileType == 'pdf' ? 'pdf' : 'jpg';
        final path = '$_myId/messages/${DateTime.now().millisecondsSinceEpoch}.$ext';
        await _sb.storage.from(AppConstants.storageBucket).uploadBinary(path, bytes);
        mediaUrl = _sb.storage.from(AppConstants.storageBucket).getPublicUrl(path);
        // Pour PDF : stocker le nom dans le content
        if (_pendingFileType == 'pdf' && content.isEmpty) {
          messageContent = _pendingFileName ?? 'Document PDF';
        }
      } catch (e) {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Erreur lors de l'envoi du fichier")),
        );
        setState(() { _sending = false; _uploading = false; });
        return;
      }
      setState(() { _uploading = false; _pendingFile = null; _pendingFileType = null; _pendingFileName = null; });
    }

    final tempId = 'temp-${DateTime.now().millisecondsSinceEpoch}';
    final optimistic = Message(
      id: tempId,
      conversationId: widget.conversation.id,
      senderId: _myId!,
      content: messageContent,
      mediaUrl: mediaUrl,
      createdAt: DateTime.now().toIso8601String(),
    );
    setState(() => _messages.add(optimistic));
    _scrollToBottom();

    try {
      final data = await _sb.from('messages')
          .insert({
            'conversation_id': widget.conversation.id,
            'sender_id': _myId,
            'content': messageContent,
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
        'last_message': mediaUrl != null ? (real.content.isEmpty ? '📎 Fichier' : real.content) : messageContent,
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
    final now = DateTime.now();
    final msg = DateTime.parse(iso).toLocal();
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
    final bgColor = isDark ? const Color(0xFF0F1117) : const Color(0xFFF0F2F5);

    return Scaffold(
      backgroundColor: bgColor,
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
      body: Column(
        children: [
          // Zone messages
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
                          final prev = i > 0 ? _messages[i-1] : null;
                          final next = i < _messages.length - 1 ? _messages[i+1] : null;
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
                            _MessageBubble(
                              msg: msg, isMine: isMine, isFirst: isFirst, isLast: isLast,
                              myId: _myId ?? '', timeStr: _timeStr(msg.createdAt),
                            ),
                          ]);
                        },
                      ),
          ),

          // Zone saisie
          _InputBar(
            controller: _msgCtrl,
            sending: _sending,
            uploading: _uploading,
            pendingFile: _pendingFile,
            pendingFileType: _pendingFileType,
            pendingFileName: _pendingFileName,
            onSend: () => _sendMessage(),
            onPickMedia: _showMediaPicker,
            onCancelPending: _cancelPending,
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(Profile? other) => Center(
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

// ── Bulle de message ─────────────────────────────────────────────────────────

class _MessageBubble extends StatelessWidget {
  final Message msg;
  final bool isMine, isFirst, isLast;
  final String myId, timeStr;
  const _MessageBubble({required this.msg, required this.isMine, required this.isFirst, required this.isLast, required this.myId, required this.timeStr});

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
          // Avatar expéditeur
          if (!isMine) ...[
            SizedBox(
              width: 32,
              child: isLast ? AppAvatar(url: msg.sender?.avatarUrl, initials: msg.sender?.initials ?? 'U', size: 28) : const SizedBox(),
            ),
            const SizedBox(width: 4),
          ],

          ConstrainedBox(
            constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.72),
            child: Container(
              margin: EdgeInsets.only(top: isFirst ? 6 : 2, bottom: isLast ? 6 : 2, left: isMine ? 40 : 0),
              decoration: BoxDecoration(
                color: hasPdf ? Colors.transparent : (isMine ? bubbleMine : bubbleOther),
                borderRadius: borderRadius,
                boxShadow: hasPdf ? null : [BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 4, offset: const Offset(0, 2))],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  // Image
                  if (hasImage)
                    GestureDetector(
                      onTap: () => Navigator.of(context, rootNavigator: true).push(MaterialPageRoute(
                        builder: (_) => _ImageViewer(url: msg.mediaUrl!),
                        fullscreenDialog: true,
                      )),
                      child: ClipRRect(
                        borderRadius: borderRadius,
                        child: Image.network(msg.mediaUrl!, fit: BoxFit.cover, width: 220,
                          loadingBuilder: (_, child, progress) => progress == null ? child : Container(
                            width: 220, height: 160, color: Colors.grey.shade200,
                            child: const Center(child: CircularProgressIndicator(color: kOrange, strokeWidth: 2)),
                          ),
                        ),
                      ),
                    ),

                  // PDF card dans la bulle
                  if (hasPdf)
                    GestureDetector(
                      onTap: () => Navigator.of(context, rootNavigator: true).push(MaterialPageRoute(
                        builder: (_) => PdfViewerScreen(url: msg.mediaUrl!, title: msg.content.isEmpty ? 'Document PDF' : msg.content),
                        fullscreenDialog: true,
                      )),
                      child: Container(
                        width: 240,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(colors: [Colors.red.shade700, Colors.red.shade500], begin: Alignment.topLeft, end: Alignment.bottomRight),
                          borderRadius: borderRadius,
                          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.12), blurRadius: 6, offset: const Offset(0, 2))],
                        ),
                        child: Column(
                          children: [
                            // Zone icône
                            Padding(
                              padding: const EdgeInsets.fromLTRB(14, 14, 14, 8),
                              child: Row(children: [
                                Container(
                                  width: 44, height: 44,
                                  decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(10)),
                                  child: const Icon(Icons.picture_as_pdf, color: Colors.white, size: 26),
                                ),
                                const SizedBox(width: 10),
                                Expanded(child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      msg.content.isEmpty ? 'Document PDF' : msg.content.replaceAll(RegExp(r'\.[^/.]+$'), ''),
                                      style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700),
                                      maxLines: 2, overflow: TextOverflow.ellipsis,
                                    ),
                                    const Text('Appuyer pour ouvrir', style: TextStyle(color: Colors.white70, fontSize: 10)),
                                  ],
                                )),
                              ]),
                            ),
                            // Heure
                            Padding(
                              padding: const EdgeInsets.fromLTRB(14, 0, 14, 10),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.end,
                                children: [
                                  Text(timeStr, style: const TextStyle(color: Colors.white60, fontSize: 10)),
                                  if (isMine) ...[
                                    const SizedBox(width: 4),
                                    Icon(msg.isRead ? Icons.done_all : Icons.done, size: 11, color: Colors.white60),
                                  ],
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                  // Texte
                  if (hasText)
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(msg.content,
                            style: TextStyle(
                              color: isMine ? Colors.white : (isDark ? Colors.white : const Color(0xFF1A1A1A)),
                              fontSize: 14, height: 1.4,
                            ),
                          ),
                          if (isLast) ...[
                            const SizedBox(height: 2),
                            Row(mainAxisSize: MainAxisSize.min, children: [
                              Text(timeStr, style: TextStyle(fontSize: 10, color: isMine ? Colors.white60 : Colors.grey.shade400)),
                              if (isMine) ...[
                                const SizedBox(width: 4),
                                Icon(msg.isRead ? Icons.done_all : Icons.done, size: 12, color: msg.isRead ? Colors.white : Colors.white60),
                              ],
                            ]),
                          ],
                        ],
                      ),
                    ),

                  // Heure sous l'image
                  if (hasImage && isLast)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(8, 4, 8, 6),
                      child: Row(mainAxisSize: MainAxisSize.min, children: [
                        Text(timeStr, style: TextStyle(fontSize: 10, color: isMine ? Colors.white60 : Colors.grey.shade400)),
                        if (isMine) ...[
                          const SizedBox(width: 4),
                          Icon(msg.isRead ? Icons.done_all : Icons.done, size: 12, color: msg.isRead ? Colors.white : Colors.white60),
                        ],
                      ]),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Visionneuse image dans le chat ────────────────────────────────────────────

class _ImageViewer extends StatelessWidget {
  final String url;
  const _ImageViewer({required this.url});
  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: Colors.black,
    appBar: AppBar(
      backgroundColor: Colors.black,
      foregroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
    ),
    body: Center(
      child: InteractiveViewer(
        minScale: 0.8, maxScale: 4.0,
        child: Image.network(url, fit: BoxFit.contain,
          loadingBuilder: (_, child, progress) => progress == null ? child
              : const Center(child: CircularProgressIndicator(color: Colors.white))),
      ),
    ),
  );
}

// ── Barre de saisie ──────────────────────────────────────────────────────────

class _InputBar extends StatelessWidget {
  final TextEditingController controller;
  final bool sending, uploading;
  final File? pendingFile;
  final String? pendingFileType, pendingFileName;
  final VoidCallback onSend, onPickMedia, onCancelPending;

  const _InputBar({
    required this.controller, required this.sending, required this.uploading,
    this.pendingFile, this.pendingFileType, this.pendingFileName,
    required this.onSend, required this.onPickMedia, required this.onCancelPending,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return SafeArea(
      top: false,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Aperçu du fichier en attente
          if (pendingFile != null)
            Container(
              color: isDark ? const Color(0xFF1E2025) : Colors.white,
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF2D3139) : Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: isDark ? const Color(0xFF3D4149) : Colors.grey.shade200),
                ),
                child: Row(children: [
                  // Aperçu
                  if (pendingFileType == 'image')
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.file(pendingFile!, width: 48, height: 48, fit: BoxFit.cover),
                    )
                  else
                    Container(
                      width: 48, height: 48,
                      decoration: BoxDecoration(color: Colors.red.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
                      child: Icon(Icons.picture_as_pdf, color: Colors.red.shade600, size: 24),
                    ),
                  const SizedBox(width: 10),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(pendingFileName ?? (pendingFileType == 'image' ? 'Image' : 'Document PDF'),
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12), maxLines: 1, overflow: TextOverflow.ellipsis),
                    Text(pendingFileType == 'image' ? 'Image sélectionnée' : 'PDF sélectionné',
                      style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                  ])),
                  if (uploading)
                    const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: kOrange, strokeWidth: 2))
                  else
                    GestureDetector(
                      onTap: onCancelPending,
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                        child: const Icon(Icons.close, size: 12, color: Colors.white),
                      ),
                    ),
                ]),
              ),
            ),

          // Saisie + boutons
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E2025) : Colors.white,
              border: Border(top: BorderSide(color: isDark ? const Color(0xFF2D3139) : Colors.grey.shade200)),
            ),
            child: Row(children: [
              // Bouton pièce jointe
              GestureDetector(
                onTap: (sending || uploading) ? null : onPickMedia,
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: kOrange.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
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
                    hintText: pendingFile != null ? 'Ajouter un message...' : 'Écrire un message…',
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    fillColor: isDark ? const Color(0xFF2D3139) : const Color(0xFFF1F5F9),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: (sending || uploading) ? null : onSend,
                child: Container(
                  width: 40, height: 40,
                  decoration: BoxDecoration(
                    color: (sending || uploading) ? Colors.grey.shade300 : kOrange,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: (sending || uploading)
                      ? const Padding(padding: EdgeInsets.all(10), child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
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
