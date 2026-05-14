import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:infinite_scroll_pagination/infinite_scroll_pagination.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../models/models.dart';
import '../../widgets/post_card.dart';
import '../../core/theme.dart';

class SavedPostsScreen extends StatefulWidget {
  const SavedPostsScreen({super.key});
  @override
  State<SavedPostsScreen> createState() => _SavedPostsScreenState();
}

class _SavedPostsScreenState extends State<SavedPostsScreen> {
  static const _pageSize = 10;
  final _pagingCtrl = PagingController<int, Post>(firstPageKey: 0);
  final _sb = Supabase.instance.client;

  @override
  void initState() {
    super.initState();
    _pagingCtrl.addPageRequestListener(_fetchPage);
  }

  Future<void> _fetchPage(int offset) async {
    final userId = _sb.auth.currentUser?.id;
    if (userId == null) { _pagingCtrl.appendLastPage([]); return; }
    try {
      final data = await _sb
          .from('post_saves')
          .select('post:posts(*, author:profiles(id,username,full_name,first_name,avatar_url,is_verified,institution), media:post_media(*))')
          .eq('user_id', userId)
          .order('created_at', ascending: false)
          .range(offset, offset + _pageSize - 1);

      final posts = (data as List)
          .map((s) => Post.fromJson(s['post'] as Map<String, dynamic>))
          .where((p) => !p.isDeleted && p.author != null)
          .toList();

      // Enrichir liked_by_user
      if (posts.isNotEmpty) {
        final ids = posts.map((p) => p.id).toList();
        final liked = await _sb.from('post_likes').select('post_id').eq('user_id', userId).inFilter('post_id', ids);
        final likedSet = {for (var l in (liked as List)) l['post_id'] as String};
        for (final p in posts) {
          p.likedByUser = likedSet.contains(p.id);
          p.savedByUser = true; // Forcément sauvé puisqu'on est dans cette liste
        }
      }

      if (posts.length < _pageSize) {
        _pagingCtrl.appendLastPage(posts);
      } else {
        _pagingCtrl.appendPage(posts, offset + _pageSize);
      }
    } catch (e) {
      _pagingCtrl.error = e;
    }
  }

  @override
  void dispose() {
    _pagingCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Publications enregistrées')),
    body: RefreshIndicator(
      color: kOrange,
      onRefresh: () async => _pagingCtrl.refresh(),
      child: PagedListView<int, Post>(
        pagingController: _pagingCtrl,
        padding: const EdgeInsets.symmetric(vertical: 8),
        builderDelegate: PagedChildBuilderDelegate<Post>(
          itemBuilder: (ctx, post, _) => Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            child: PostCard(post: post, onTap: () => context.push('/post/${post.id}')),
          ),
          noItemsFoundIndicatorBuilder: (_) => Center(
            child: Padding(
              padding: const EdgeInsets.all(40),
              child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                Container(
                  width: 64, height: 64,
                  decoration: BoxDecoration(color: kOrange.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(16)),
                  child: const Icon(Icons.bookmark_outline, size: 32, color: kOrange),
                ),
                const SizedBox(height: 16),
                const Text('Aucune publication sauvegardée', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                Text('Appuyez sur le bookmark d\'un post pour le sauvegarder',
                  style: TextStyle(color: Colors.grey.shade500, fontSize: 13), textAlign: TextAlign.center),
              ]),
            ),
          ),
        ),
      ),
    ),
  );
}
