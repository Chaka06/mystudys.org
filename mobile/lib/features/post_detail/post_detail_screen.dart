import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../../models/models.dart';
import '../../widgets/post_card.dart';
import '../../widgets/app_avatar.dart';
import '../../core/theme.dart';

class PostDetailScreen extends StatefulWidget {
  final String postId;
  const PostDetailScreen({super.key, required this.postId});
  @override
  State<PostDetailScreen> createState() => _PostDetailScreenState();
}

class _PostDetailScreenState extends State<PostDetailScreen> {
  final _sb = Supabase.instance.client;
  final _commentCtrl = TextEditingController();
  Post? _post;
  List<Comment> _comments = [];
  bool _loading = true;
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final userId = _sb.auth.currentUser?.id;
    try {
      final data = await _sb
          .from('posts')
          .select('*, author:profiles(id,username,full_name,first_name,avatar_url,is_verified,institution), media:post_media(*)')
          .eq('id', widget.postId)
          .eq('is_deleted', false)
          .single();
      final post = Post.fromJson(data);
      if (userId != null) {
        final liked = await _sb.from('post_likes').select().eq('post_id', widget.postId).eq('user_id', userId).maybeSingle();
        final saved = await _sb.from('post_saves').select().eq('post_id', widget.postId).eq('user_id', userId).maybeSingle();
        post.likedByUser = liked != null;
        post.savedByUser = saved != null;
      }
      final commentsData = await _sb
          .from('comments')
          .select('*, author:profiles(id,username,full_name,first_name,avatar_url)')
          .eq('post_id', widget.postId)
          .eq('is_deleted', false)
          .order('created_at', ascending: true)
          .limit(50);
      if (!mounted) return;
      setState(() {
        _post = post;
        _comments = (commentsData as List).map((c) => Comment.fromJson(c)).toList();
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _sendComment() async {
    final text = _commentCtrl.text.trim();
    if (text.isEmpty || _sending) return;
    final userId = _sb.auth.currentUser?.id;
    if (userId == null) return;
    setState(() => _sending = true);
    try {
      final data = await _sb.from('comments')
          .insert({'post_id': widget.postId, 'author_id': userId, 'content': text})
          .select('*, author:profiles(id,username,full_name,first_name,avatar_url)')
          .single();
      if (!mounted) return;
      setState(() {
        _comments.add(Comment.fromJson(data));
        _post = _post != null ? Post(
          id: _post!.id, authorId: _post!.authorId, content: _post!.content,
          postType: _post!.postType, subjectName: _post!.subjectName,
          professorName: _post!.professorName, academicLevel: _post!.academicLevel,
          institution: _post!.institution, examYear: _post!.examYear,
          eventDate: _post!.eventDate, eventLocation: _post!.eventLocation,
          eventUrl: _post!.eventUrl, likeCount: _post!.likeCount,
          commentCount: _post!.commentCount + 1, isDeleted: _post!.isDeleted,
          createdAt: _post!.createdAt, author: _post!.author,
          media: _post!.media, likedByUser: _post!.likedByUser,
          savedByUser: _post!.savedByUser,
        ) : null;
      });
      _commentCtrl.clear();
    } catch (_) {}
    if (mounted) setState(() => _sending = false);
  }

  @override
  void dispose() {
    _commentCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      appBar: AppBar(title: const Text('Publication')),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: kOrange))
          : _post == null
              ? const Center(child: Text('Publication introuvable'))
              : Column(
                  children: [
                    Expanded(
                      child: ListView(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        children: [
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            child: PostCard(post: _post!),
                          ),
                          Padding(
                            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                            child: Text('${_comments.length} commentaire${_comments.length > 1 ? 's' : ''}',
                              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                          ),
                          if (_comments.isEmpty)
                            Padding(
                              padding: const EdgeInsets.all(24),
                              child: Center(child: Text('Aucun commentaire pour le moment',
                                style: TextStyle(color: Colors.grey.shade500, fontSize: 13))),
                            )
                          else
                            ..._comments.map((c) => _CommentTile(comment: c, isDark: isDark)),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF1E2025) : Colors.white,
                        border: Border(top: BorderSide(color: isDark ? const Color(0xFF2D3139) : Colors.grey.shade200)),
                      ),
                      child: SafeArea(
                        top: false,
                        child: Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: _commentCtrl,
                                minLines: 1, maxLines: 3,
                                decoration: const InputDecoration(
                                  hintText: 'Ajouter un commentaire…',
                                  contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            GestureDetector(
                              onTap: _sending ? null : _sendComment,
                              child: Container(
                                width: 40, height: 40,
                                decoration: BoxDecoration(color: kOrange, borderRadius: BorderRadius.circular(12)),
                                child: _sending
                                    ? const Padding(padding: EdgeInsets.all(10), child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                    : const Icon(Icons.send_rounded, color: Colors.white, size: 20),
                              ),
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

class _CommentTile extends StatelessWidget {
  final Comment comment;
  final bool isDark;
  const _CommentTile({required this.comment, required this.isDark});
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AppAvatar(url: comment.author?.avatarUrl, initials: comment.author?.initials ?? 'U', size: 32),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF2D3139) : const Color(0xFFF3F4F6),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(comment.author?.fullName ?? '', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                  const SizedBox(height: 2),
                  Text(comment.content, style: const TextStyle(fontSize: 13, height: 1.4)),
                ]),
              ),
              Padding(
                padding: const EdgeInsets.only(left: 4, top: 2),
                child: Text(timeago.format(DateTime.parse(comment.createdAt), locale: 'fr'),
                  style: TextStyle(fontSize: 10, color: Colors.grey.shade400)),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}
