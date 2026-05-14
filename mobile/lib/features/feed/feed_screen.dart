import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:infinite_scroll_pagination/infinite_scroll_pagination.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../models/models.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/post_card.dart';
import '../../widgets/app_avatar.dart';
import '../../core/theme.dart';
import '../create_post/create_post_screen.dart';

class FeedScreen extends StatefulWidget {
  const FeedScreen({super.key});
  @override
  State<FeedScreen> createState() => _FeedScreenState();
}

class _FeedScreenState extends State<FeedScreen> {
  static const _pageSize = 10;
  final _pagingCtrl = PagingController<int, Post>(firstPageKey: 0);
  final _sb = Supabase.instance.client;

  @override
  void initState() {
    super.initState();
    _pagingCtrl.addPageRequestListener(_fetchPage);
  }

  Future<void> _fetchPage(int offset) async {
    try {
      final userId = _sb.auth.currentUser?.id;
      final data = await _sb
          .from('posts')
          .select('*, author:profiles(id,username,full_name,first_name,avatar_url,is_verified,institution), media:post_media(*)')
          .eq('is_deleted', false)
          .eq('moderation_status', 'approved')
          .order('created_at', ascending: false)
          .range(offset, offset + _pageSize - 1);

      final posts = (data as List).map((p) => Post.fromJson(p)).where((p) => p.author != null).toList();

      if (userId != null && posts.isNotEmpty) {
        final ids = posts.map((p) => p.id).toList();
        final liked = await _sb.from('post_likes').select('post_id').eq('user_id', userId).inFilter('post_id', ids);
        final saved = await _sb.from('post_saves').select('post_id').eq('user_id', userId).inFilter('post_id', ids);
        final likedSet = {for (var l in (liked as List)) l['post_id'] as String};
        final savedSet = {for (var s in (saved as List)) s['post_id'] as String};
        for (final p in posts) {
          p.likedByUser = likedSet.contains(p.id);
          p.savedByUser = savedSet.contains(p.id);
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
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 16,
        title: Row(children: [
          Image.asset('assets/images/logostudys.png', height: 36, width: 36),
          const SizedBox(width: 8),
          RichText(text: const TextSpan(children: [
            TextSpan(text: 'STUDY', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: kOrange)),
            TextSpan(text: "'S", style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: kGreen)),
          ])),
        ]),
        actions: [
          IconButton(
            icon: const Icon(Icons.search_rounded),
            onPressed: () => context.push('/search'),
          ),
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: GestureDetector(
              onTap: () {
                if (auth.profile != null) {
                  context.push('/profile/${auth.profile!.username}');
                }
              },
              child: AppAvatar(
                url: auth.profile?.avatarUrl,
                initials: auth.profile?.initials ?? 'U',
                size: 32,
              ),
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        color: kOrange,
        onRefresh: () async => _pagingCtrl.refresh(),
        child: PagedListView<int, Post>(
          pagingController: _pagingCtrl,
          padding: const EdgeInsets.only(top: 8, bottom: 80),
          builderDelegate: PagedChildBuilderDelegate<Post>(
            itemBuilder: (ctx, post, _) => Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: PostCard(post: post),
            ),
            firstPageProgressIndicatorBuilder: (_) => const _FeedSkeleton(),
            noItemsFoundIndicatorBuilder: (_) => const _EmptyFeed(),
            firstPageErrorIndicatorBuilder: (_) => Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  children: [
                    const Icon(Icons.wifi_off, size: 40, color: Colors.grey),
                    const SizedBox(height: 12),
                    const Text('Erreur de chargement'),
                    const SizedBox(height: 8),
                    ElevatedButton(onPressed: _pagingCtrl.refresh, child: const Text('Réessayer')),
                  ],
                ),
              ),
            ),
            newPageProgressIndicatorBuilder: (_) => const Padding(
              padding: EdgeInsets.all(16),
              child: Center(child: CircularProgressIndicator(color: kOrange, strokeWidth: 2)),
            ),
            noMoreItemsIndicatorBuilder: (_) => Padding(
              padding: const EdgeInsets.all(20),
              child: Center(child: Text('Vous avez tout vu ! 🎉',
                style: TextStyle(color: Colors.grey.shade400, fontSize: 13))),
            ),
          ),
        ),
      ),
    );
  }
}

class _FeedSkeleton extends StatelessWidget {
  const _FeedSkeleton();
  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? const Color(0xFF2D3139) : Colors.grey.shade200;
    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      itemCount: 3,
      itemBuilder: (_, __) => Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1E2025) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: isDark ? const Color(0xFF2D3139) : Colors.grey.shade200),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Container(width: 40, height: 40, decoration: BoxDecoration(color: bg, shape: BoxShape.circle)),
            const SizedBox(width: 10),
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Container(width: 120, height: 12, decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(6))),
              const SizedBox(height: 6),
              Container(width: 80, height: 10, decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(5))),
            ]),
          ]),
          const SizedBox(height: 14),
          Container(width: double.infinity, height: 12, decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(6))),
          const SizedBox(height: 8),
          Container(width: 200, height: 12, decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(6))),
          const SizedBox(height: 8),
          Container(width: 150, height: 12, decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(6))),
        ]),
      ),
    );
  }
}

class _EmptyFeed extends StatelessWidget {
  const _EmptyFeed();
  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(40),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 64, height: 64,
            decoration: BoxDecoration(color: kOrange.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(16)),
            child: const Icon(Icons.inbox_outlined, size: 32, color: kOrange),
          ),
          const SizedBox(height: 16),
          const Text('Votre fil est vide', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Text('Ajoutez des amis pour voir leurs publications',
            style: TextStyle(color: Colors.grey.shade500, fontSize: 13), textAlign: TextAlign.center),
        ],
      ),
    ),
  );
}
