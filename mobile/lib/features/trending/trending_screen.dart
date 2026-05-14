import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:infinite_scroll_pagination/infinite_scroll_pagination.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../models/models.dart';
import '../../widgets/post_card.dart';
import '../../core/theme.dart';

class TrendingScreen extends StatefulWidget {
  const TrendingScreen({super.key});
  @override
  State<TrendingScreen> createState() => _TrendingScreenState();
}

class _TrendingScreenState extends State<TrendingScreen> {
  static const _pageSize = 10;
  final _pagingCtrl = PagingController<int, Post>(firstPageKey: 0);
  final _sb = Supabase.instance.client;
  String _filter = 'all';

  static const _filters = [
    ('all', 'Tout'), ('exam_subject', 'Sujets'), ('course_document', 'Cours'),
    ('event', 'Événements'), ('announcement', 'Annonces'),
  ];

  @override
  void initState() {
    super.initState();
    _pagingCtrl.addPageRequestListener(_fetchPage);
  }

  Future<void> _fetchPage(int offset) async {
    final userId = _sb.auth.currentUser?.id;
    try {
      var query = _sb
          .from('posts')
          .select('*, author:profiles(id,username,full_name,first_name,avatar_url,is_verified,institution), media:post_media(*)')
          .eq('is_deleted', false)
          .eq('moderation_status', 'approved');
      if (_filter != 'all') query = query.eq('post_type', _filter);
      final data = await query
          .order('like_count', ascending: false)
          .order('comment_count', ascending: false)
          .range(offset, offset + _pageSize - 1);

      final posts = (data as List).map((p) => Post.fromJson(p)).where((p) => p.author != null).toList();
      if (userId != null && posts.isNotEmpty) {
        final ids = posts.map((p) => p.id).toList();
        final liked = await _sb.from('post_likes').select('post_id').eq('user_id', userId).inFilter('post_id', ids);
        final saved = await _sb.from('post_saves').select('post_id').eq('user_id', userId).inFilter('post_id', ids);
        final likedSet = {for (var l in (liked as List)) l['post_id'] as String};
        final savedSet = {for (var s in (saved as List)) s['post_id'] as String};
        for (final p in posts) { p.likedByUser = likedSet.contains(p.id); p.savedByUser = savedSet.contains(p.id); }
      }

      if (posts.length < _pageSize) { _pagingCtrl.appendLastPage(posts); }
      else { _pagingCtrl.appendPage(posts, offset + _pageSize); }
    } catch (e) { _pagingCtrl.error = e; }
  }

  @override
  void dispose() { _pagingCtrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Tendances'), elevation: 0),
    body: Column(
      children: [
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: Row(
            children: _filters.map((f) => GestureDetector(
              onTap: () { setState(() => _filter = f.$1); _pagingCtrl.refresh(); },
              child: Container(
                margin: const EdgeInsets.only(right: 8),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                decoration: BoxDecoration(
                  color: _filter == f.$1 ? kOrange : Colors.transparent,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: _filter == f.$1 ? kOrange : Colors.grey.shade300),
                ),
                child: Text(f.$2, style: TextStyle(
                  fontSize: 13, fontWeight: FontWeight.w600,
                  color: _filter == f.$1 ? Colors.white : Colors.grey.shade600,
                )),
              ),
            )).toList(),
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            color: kOrange,
            onRefresh: () async => _pagingCtrl.refresh(),
            child: PagedListView<int, Post>(
              pagingController: _pagingCtrl,
              padding: const EdgeInsets.symmetric(vertical: 4),
              builderDelegate: PagedChildBuilderDelegate<Post>(
                itemBuilder: (ctx, post, _) => Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  child: PostCard(post: post, onTap: () => context.push('/post/${post.id}')),
                ),
                noItemsFoundIndicatorBuilder: (_) => Center(
                  child: Padding(padding: const EdgeInsets.all(40), child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(width: 64, height: 64,
                        decoration: BoxDecoration(color: kOrange.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(16)),
                        child: const Icon(Icons.trending_up, size: 32, color: kOrange)),
                      const SizedBox(height: 16),
                      const Text('Aucune tendance', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                    ],
                  )),
                ),
              ),
            ),
          ),
        ),
      ],
    ),
  );
}
