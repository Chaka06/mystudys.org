import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../models/models.dart';
import '../core/theme.dart';
import 'app_avatar.dart';

class CommentThread extends StatefulWidget {
  final Comment comment;
  final String postId;
  final bool isDark;
  final VoidCallback? onCommentAdded;

  const CommentThread({
    super.key,
    required this.comment,
    required this.postId,
    required this.isDark,
    this.onCommentAdded,
  });

  @override
  State<CommentThread> createState() => _CommentThreadState();
}

class _CommentThreadState extends State<CommentThread> {
  final _sb = Supabase.instance.client;
  final _replyCtrl = TextEditingController();
  List<Comment> _replies = [];
  bool _showReplyField = false;
  bool _showReplies = false;
  bool _loadingReplies = false;
  bool _sendingReply = false;

  @override
  void dispose() {
    _replyCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadReplies() async {
    if (_loadingReplies) return;
    setState(() => _loadingReplies = true);
    try {
      final data = await _sb.from('comments')
          .select('*, author:profiles(id,username,full_name,first_name,avatar_url)')
          .eq('post_id', widget.postId)
          .eq('parent_id', widget.comment.id)
          .eq('is_deleted', false)
          .order('created_at', ascending: true);
      if (!mounted) return;
      setState(() {
        _replies = (data as List).map((c) => Comment.fromJson(c)).toList();
        _showReplies = true;
        _loadingReplies = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() => _loadingReplies = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur : $e')));
      }
    }
  }

  Future<void> _sendReply() async {
    final text = _replyCtrl.text.trim();
    if (text.isEmpty || _sendingReply) return;
    final userId = _sb.auth.currentUser?.id;
    if (userId == null) return;
    setState(() => _sendingReply = true);
    _replyCtrl.clear();
    try {
      final data = await _sb.from('comments').insert({
        'post_id': widget.postId,
        'parent_id': widget.comment.id,
        'content': text,
        'author_id': userId,
      }).select('*, author:profiles(id,username,full_name,first_name,avatar_url)').single();
      if (!mounted) return;
      setState(() {
        _replies.add(Comment.fromJson(data));
        _showReplies = true;
        _showReplyField = false;
      });
      widget.onCommentAdded?.call();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur : $e')));
        _replyCtrl.text = text;
      }
    } finally {
      if (mounted) setState(() => _sendingReply = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.comment;
    final bubbleBg = widget.isDark ? const Color(0xFF2D3139) : const Color(0xFFF3F4F6);
    final replyBg = widget.isDark ? const Color(0xFF1E2025) : const Color(0xFFEEEFF1);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ── Commentaire principal ────────────────────────────────
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          AppAvatar(url: c.author?.avatarUrl, initials: c.author?.initials ?? 'U', size: 32),
          const SizedBox(width: 8),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(color: bubbleBg, borderRadius: BorderRadius.circular(12)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(c.author?.fullName ?? 'Utilisateur',
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                const SizedBox(height: 3),
                Text(c.content, style: const TextStyle(fontSize: 13, height: 1.4)),
              ]),
            ),
            const SizedBox(height: 4),
            Row(children: [
              Text(timeago.format(DateTime.parse(c.createdAt), locale: 'fr'),
                style: TextStyle(fontSize: 10, color: Colors.grey.shade400)),
              const SizedBox(width: 14),
              GestureDetector(
                onTap: () => setState(() => _showReplyField = !_showReplyField),
                child: Text('Répondre',
                  style: const TextStyle(fontSize: 10, color: kOrange, fontWeight: FontWeight.w600)),
              ),
              if (_replies.isEmpty)
                FutureBuilder<int>(
                  future: _sb.from('comments').select('id')
                      .eq('parent_id', c.id).eq('is_deleted', false).then((r) => (r as List).length),
                  builder: (ctx, snap) {
                    final count = snap.data ?? 0;
                    if (count == 0) return const SizedBox.shrink();
                    return GestureDetector(
                      onTap: _showReplies ? () => setState(() => _showReplies = false) : _loadReplies,
                      child: Padding(
                        padding: const EdgeInsets.only(left: 14),
                        child: Text(
                          _showReplies ? 'Masquer réponses' : '$count réponse${count > 1 ? 's' : ''}',
                          style: TextStyle(fontSize: 10, color: Colors.blue.shade600, fontWeight: FontWeight.w600)),
                      ),
                    );
                  },
                )
              else
                GestureDetector(
                  onTap: _showReplies ? () => setState(() => _showReplies = false) : _loadReplies,
                  child: Padding(
                    padding: const EdgeInsets.only(left: 14),
                    child: Text(
                      _showReplies ? 'Masquer' : '${_replies.length} réponse${_replies.length > 1 ? 's' : ''}',
                      style: TextStyle(fontSize: 10, color: Colors.blue.shade600, fontWeight: FontWeight.w600)),
                  ),
                ),
            ]),
          ])),
        ]),

        // ── Champ de réponse ─────────────────────────────────────
        if (_showReplyField)
          Padding(
            padding: const EdgeInsets.only(left: 40, top: 6),
            child: Row(children: [
              Expanded(
                child: TextField(
                  controller: _replyCtrl,
                  autofocus: true,
                  style: const TextStyle(fontSize: 12),
                  decoration: InputDecoration(
                    hintText: 'Répondre à ${c.author?.firstName ?? c.author?.fullName ?? ''}…',
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                    fillColor: widget.isDark ? const Color(0xFF2D3139) : Colors.grey.shade100,
                    filled: true,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: BorderSide.none),
                  ),
                  onSubmitted: (_) => _sendReply(),
                  onChanged: (_) => setState(() {}),
                ),
              ),
              const SizedBox(width: 6),
              GestureDetector(
                onTap: _sendingReply ? null : _sendReply,
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: _replyCtrl.text.trim().isEmpty ? Colors.grey.shade300 : kOrange,
                    shape: BoxShape.circle),
                  child: _sendingReply
                      ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Icon(Icons.send_rounded, color: Colors.white, size: 14),
                ),
              ),
            ]),
          ),

        // ── Réponses imbriquées ───────────────────────────────────
        if (_showReplies)
          Padding(
            padding: const EdgeInsets.only(left: 40, top: 6),
            child: _loadingReplies
                ? const Padding(
                    padding: EdgeInsets.all(8),
                    child: SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: kOrange, strokeWidth: 2)),
                  )
                : Column(
                    children: _replies.map((r) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        AppAvatar(url: r.author?.avatarUrl, initials: r.author?.initials ?? 'U', size: 26),
                        const SizedBox(width: 7),
                        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(color: replyBg, borderRadius: BorderRadius.circular(10)),
                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Text(r.author?.fullName ?? 'Utilisateur',
                                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 11)),
                              const SizedBox(height: 2),
                              Text(r.content, style: const TextStyle(fontSize: 12, height: 1.3)),
                            ]),
                          ),
                          Padding(
                            padding: const EdgeInsets.only(left: 4, top: 2),
                            child: Text(timeago.format(DateTime.parse(r.createdAt), locale: 'fr'),
                              style: TextStyle(fontSize: 9, color: Colors.grey.shade400)),
                          ),
                        ])),
                      ]),
                    )).toList(),
                  ),
          ),
      ],
    );
  }
}
