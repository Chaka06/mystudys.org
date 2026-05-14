import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../models/models.dart';
import '../core/theme.dart';
import 'app_avatar.dart';

class PostCard extends StatefulWidget {
  final Post post;
  final VoidCallback? onTap;
  final VoidCallback? onDeleted;

  const PostCard({super.key, required this.post, this.onTap, this.onDeleted});

  @override
  State<PostCard> createState() => _PostCardState();
}

class _PostCardState extends State<PostCard> {
  late bool _liked;
  late int _likeCount;
  late bool _saved;
  bool _liking = false;
  bool _showComments = false;
  final _sb = Supabase.instance.client;

  @override
  void initState() {
    super.initState();
    _liked = widget.post.likedByUser;
    _likeCount = widget.post.likeCount;
    _saved = widget.post.savedByUser;
  }

  Future<void> _toggleLike() async {
    if (_liking) return;
    final userId = _sb.auth.currentUser?.id;
    if (userId == null) return;
    final oldLiked = _liked;
    setState(() { _liking = true; _liked = !_liked; _likeCount += _liked ? 1 : -1; });
    try {
      if (_liked) {
        await _sb.from('post_likes').insert({'post_id': widget.post.id, 'user_id': userId});
      } else {
        await _sb.from('post_likes').delete().eq('post_id', widget.post.id).eq('user_id', userId);
      }
    } catch (_) {
      setState(() { _liked = oldLiked; _likeCount += oldLiked ? 1 : -1; });
    } finally {
      setState(() => _liking = false);
    }
  }

  Future<void> _toggleSave() async {
    final userId = _sb.auth.currentUser?.id;
    if (userId == null) return;
    setState(() => _saved = !_saved);
    try {
      if (_saved) {
        await _sb.from('post_saves').insert({'post_id': widget.post.id, 'user_id': userId});
      } else {
        await _sb.from('post_saves').delete().eq('post_id', widget.post.id).eq('user_id', userId);
      }
    } catch (_) {
      setState(() => _saved = !_saved);
    }
  }

  String _postTypeLabel(String type) {
    switch (type) {
      case 'exam_subject': return 'Sujet d\'examen';
      case 'course_document': return 'Document';
      case 'event': return 'Événement';
      case 'announcement': return 'Annonce';
      case 'conference': return 'Conférence';
      case 'soutenance': return 'Soutenance';
      default: return '';
    }
  }

  (Color, Color) _postTypeColors(String type) {
    switch (type) {
      case 'exam_subject': return (kOrange.withValues(alpha: 0.1), kOrange);
      case 'course_document': return (kGreen.withValues(alpha: 0.1), kGreen);
      case 'event': return (Colors.blue.withValues(alpha: 0.1), Colors.blue.shade700);
      case 'announcement': return (Colors.purple.withValues(alpha: 0.1), Colors.purple.shade700);
      case 'conference': return (Colors.indigo.withValues(alpha: 0.1), Colors.indigo.shade700);
      case 'soutenance': return (Colors.pink.withValues(alpha: 0.1), Colors.pink.shade700);
      default: return (Colors.grey.shade100, Colors.grey.shade600);
    }
  }

  @override
  Widget build(BuildContext context) {
    final post = widget.post;
    final author = post.author;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? const Color(0xFF1E2025) : Colors.white;
    final border = isDark ? const Color(0xFF2D3139) : const Color(0xFFE5E7EB);
    final images = post.media.where((m) => m.mediaType == 'image').toList();

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 0, vertical: 4),
      decoration: BoxDecoration(
        color: cardBg,
        border: Border.all(color: border),
        borderRadius: BorderRadius.circular(16),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Header ──────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 14, 14, 10),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                GestureDetector(
                  onTap: () {},
                  child: AppAvatar(url: author?.avatarUrl, initials: author?.initials ?? 'U', size: 40),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(children: [
                        Flexible(
                          child: Text(author?.fullName ?? 'Utilisateur',
                            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                            overflow: TextOverflow.ellipsis),
                        ),
                        if (author?.isVerified == true) ...[
                          const SizedBox(width: 4),
                          const Icon(Icons.verified, color: kOrange, size: 14),
                        ],
                      ]),
                      const SizedBox(height: 1),
                      Text(
                        [
                          timeago.format(DateTime.parse(post.createdAt), locale: 'fr'),
                          if (author?.institution != null) author!.institution!,
                        ].join(' · '),
                        style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                if (post.postType != 'general') ...[
                  const SizedBox(width: 8),
                  Builder(builder: (_) {
                    final colors = _postTypeColors(post.postType);
                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(color: colors.$1, borderRadius: BorderRadius.circular(8)),
                      child: Text(_postTypeLabel(post.postType),
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: colors.$2)),
                    );
                  }),
                ],
              ],
            ),
          ),

          // ── Métadonnées académiques ──────────────────────────
          if (post.subjectName != null || post.professorName != null || post.academicLevel != null)
            Container(
              margin: const EdgeInsets.fromLTRB(14, 0, 14, 10),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: kOrange.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: kOrange.withValues(alpha: 0.2)),
              ),
              child: Wrap(
                spacing: 12, runSpacing: 4,
                children: [
                  if (post.subjectName != null)
                    Row(mainAxisSize: MainAxisSize.min, children: [
                      const Icon(Icons.menu_book, color: kOrange, size: 13),
                      const SizedBox(width: 4),
                      Text(post.subjectName!, style: const TextStyle(fontSize: 12, color: kOrange, fontWeight: FontWeight.w600)),
                    ]),
                  if (post.professorName != null)
                    Text('Pr. ${post.professorName}', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                ],
              ),
            ),

          // ── Contenu texte ─────────────────────────────────────
          if (post.content != null && post.content!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 10),
              child: Text(post.content!, style: const TextStyle(fontSize: 14, height: 1.5)),
            ),

          // ── Images ────────────────────────────────────────────
          if (images.isNotEmpty) _ImageGrid(images: images),

          // ── Actions ───────────────────────────────────────────
          Container(
            padding: const EdgeInsets.fromLTRB(6, 6, 10, 10),
            decoration: BoxDecoration(
              border: Border(top: BorderSide(color: isDark ? const Color(0xFF2D3139) : Colors.grey.shade100)),
            ),
            child: Row(
              children: [
                _ActionBtn(
                  icon: _liked ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                  iconColor: _liked ? Colors.red : null,
                  label: _likeCount > 0 ? _likeCount.toString() : '',
                  onTap: _toggleLike,
                  hoverColor: Colors.red.shade50,
                ),
                _ActionBtn(
                  icon: Icons.chat_bubble_outline_rounded,
                  label: post.commentCount > 0 ? post.commentCount.toString() : '',
                  onTap: () => setState(() => _showComments = !_showComments),
                  hoverColor: kOrange.withValues(alpha: 0.1),
                ),
                _ActionBtn(
                  icon: Icons.share_outlined,
                  onTap: () {},
                  hoverColor: kGreen.withValues(alpha: 0.1),
                ),
                const Spacer(),
                GestureDetector(
                  onTap: _toggleSave,
                  child: Padding(
                    padding: const EdgeInsets.all(8),
                    child: Icon(
                      _saved ? Icons.bookmark_rounded : Icons.bookmark_border_rounded,
                      size: 20,
                      color: _saved ? kOrange : Colors.grey.shade400,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // ── Commentaires (expandable) ─────────────────────────
          if (_showComments) _CommentSection(postId: post.id),
        ],
      ),
    );
  }
}

class _ActionBtn extends StatelessWidget {
  final IconData icon;
  final Color? iconColor;
  final String label;
  final VoidCallback? onTap;
  final Color? hoverColor;

  const _ActionBtn({required this.icon, this.iconColor, this.label = '', this.onTap, this.hoverColor});

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(10)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 19, color: iconColor ?? Colors.grey.shade500),
        if (label.isNotEmpty) ...[
          const SizedBox(width: 5),
          Text(label, style: TextStyle(fontSize: 13, color: Colors.grey.shade500)),
        ],
      ]),
    ),
  );
}

class _ImageGrid extends StatelessWidget {
  final List<PostMedia> images;
  const _ImageGrid({required this.images});

  @override
  Widget build(BuildContext context) {
    final count = images.length;
    if (count == 1) {
      return AspectRatio(
        aspectRatio: 16 / 9,
        child: CachedNetworkImage(imageUrl: images[0].url, fit: BoxFit.cover),
      );
    }
    if (count == 2) {
      return SizedBox(
        height: 200,
        child: Row(children: [
          Expanded(child: CachedNetworkImage(imageUrl: images[0].url, fit: BoxFit.cover)),
          const SizedBox(width: 2),
          Expanded(child: CachedNetworkImage(imageUrl: images[1].url, fit: BoxFit.cover)),
        ]),
      );
    }
    if (count == 3) {
      return SizedBox(
        height: 220,
        child: Row(children: [
          Expanded(flex: 2, child: CachedNetworkImage(imageUrl: images[0].url, fit: BoxFit.cover)),
          const SizedBox(width: 2),
          Expanded(child: Column(children: [
            Expanded(child: CachedNetworkImage(imageUrl: images[1].url, fit: BoxFit.cover)),
            const SizedBox(height: 2),
            Expanded(child: CachedNetworkImage(imageUrl: images[2].url, fit: BoxFit.cover)),
          ])),
        ]),
      );
    }
    return SizedBox(
      height: 200,
      child: GridView.count(
        crossAxisCount: 2, crossAxisSpacing: 2, mainAxisSpacing: 2,
        physics: const NeverScrollableScrollPhysics(), padding: EdgeInsets.zero,
        children: [
          ...images.take(3).map((img) => CachedNetworkImage(imageUrl: img.url, fit: BoxFit.cover)),
          Stack(children: [
            Positioned.fill(child: CachedNetworkImage(imageUrl: images[3].url, fit: BoxFit.cover)),
            if (count > 4)
              Positioned.fill(child: Container(
                color: Colors.black54,
                child: Center(child: Text('+${count - 4}',
                  style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w700))),
              )),
          ]),
        ],
      ),
    );
  }
}

class _CommentSection extends StatefulWidget {
  final String postId;
  const _CommentSection({required this.postId});
  @override
  State<_CommentSection> createState() => _CommentSectionState();
}

class _CommentSectionState extends State<_CommentSection> {
  final _sb = Supabase.instance.client;
  final _ctrl = TextEditingController();
  List<Comment> _comments = [];
  bool _loading = true;
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final data = await _sb.from('comments')
        .select('*, author:profiles(id,username,full_name,avatar_url)')
        .eq('post_id', widget.postId)
        .eq('is_deleted', false)
        .isFilter('parent_id', null)
        .order('created_at', ascending: true)
        .limit(20);
    setState(() {
      _comments = (data as List).map((c) => Comment.fromJson(c)).toList();
      _loading = false;
    });
  }

  Future<void> _send() async {
    final text = _ctrl.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    _ctrl.clear();
    try {
      final data = await _sb.from('comments')
          .insert({'post_id': widget.postId, 'content': text, 'author_id': _sb.auth.currentUser?.id})
          .select('*, author:profiles(id,username,full_name,avatar_url)')
          .single();
      setState(() => _comments.add(Comment.fromJson(data)));
    } catch (_) {}
    setState(() => _sending = false);
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: isDark ? const Color(0xFF2D3139) : Colors.grey.shade100)),
      ),
      child: Column(
        children: [
          if (_loading)
            const Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator(color: kOrange, strokeWidth: 2))
          else if (_comments.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Text('Aucun commentaire. Soyez le premier !',
                style: TextStyle(color: Colors.grey.shade400, fontSize: 13)),
            )
          else
            ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 220),
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: _comments.length,
                itemBuilder: (_, i) {
                  final c = _comments[i];
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        AppAvatar(url: c.author?.avatarUrl, initials: c.author?.initials ?? 'U', size: 28),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF2D3139) : const Color(0xFFF3F4F6),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Text(c.author?.fullName ?? '', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                              const SizedBox(height: 2),
                              Text(c.content, style: const TextStyle(fontSize: 13, height: 1.4)),
                            ]),
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
          const SizedBox(height: 8),
          Row(children: [
            AppAvatar(
              url: _sb.auth.currentUser?.userMetadata?['avatar_url'],
              initials: 'M', size: 28,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: TextField(
                controller: _ctrl,
                style: const TextStyle(fontSize: 13),
                decoration: InputDecoration(
                  hintText: 'Écrire un commentaire…',
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  fillColor: isDark ? const Color(0xFF2D3139) : const Color(0xFFF3F4F6),
                  suffixIcon: IconButton(
                    icon: Icon(Icons.send_rounded, size: 18, color: kOrange.withValues(alpha: _ctrl.text.isEmpty ? 0.3 : 1)),
                    onPressed: _send,
                  ),
                ),
                onSubmitted: (_) => _send(),
                onChanged: (_) => setState(() {}),
              ),
            ),
          ]),
        ],
      ),
    );
  }
}
