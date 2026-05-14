import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:infinite_scroll_pagination/infinite_scroll_pagination.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../models/models.dart';
import '../../widgets/app_avatar.dart';
import '../../widgets/post_card.dart';
import '../../core/theme.dart';
import '../messages/chat_screen.dart';

class ProfileScreen extends StatefulWidget {
  final String username;
  const ProfileScreen({super.key, required this.username});
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _sb = Supabase.instance.client;
  Profile? _profile;
  bool _loading = true;
  String? _friendshipId;
  String? _friendshipStatus;
  bool _iAmRequester = false;
  bool _isOwnProfile = false;
  final _pagingCtrl = PagingController<int, Post>(firstPageKey: 0);

  @override
  void initState() {
    super.initState();
    _load();
    _pagingCtrl.addPageRequestListener(_fetchPosts);
  }

  Future<void> _load() async {
    try {
      final data = await _sb.from('profiles').select().eq('username', widget.username).single();
      final profile = Profile.fromJson(data);
      final myId = _sb.auth.currentUser?.id;
      bool isOwn = profile.id == myId;

      String? fsId;
      String? fsStatus;
      bool iAmReq = false;

      if (!isOwn && myId != null) {
        final fs = await _sb.from('friendships').select('id,status,requester_id')
            .or('and(requester_id.eq.$myId,addressee_id.eq.${profile.id}),and(requester_id.eq.${profile.id},addressee_id.eq.$myId)')
            .maybeSingle();
        if (fs != null) {
          fsId = fs['id'];
          fsStatus = fs['status'];
          iAmReq = fs['requester_id'] == myId;
        }
      }

      setState(() {
        _profile = profile;
        _isOwnProfile = isOwn;
        _friendshipId = fsId;
        _friendshipStatus = fsStatus;
        _iAmRequester = iAmReq;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<void> _fetchPosts(int offset) async {
    if (_profile == null) return;
    try {
      final myId = _sb.auth.currentUser?.id;
      const pageSize = 10;
      final data = await _sb
          .from('posts')
          .select('*, author:profiles(id,username,full_name,first_name,avatar_url,is_verified,institution), media:post_media(*)')
          .eq('author_id', _profile!.id)
          .eq('is_deleted', false)
          .order('created_at', ascending: false)
          .range(offset, offset + pageSize - 1);
      final posts = (data as List).map((p) => Post.fromJson(p)).toList();

      if (myId != null && posts.isNotEmpty) {
        final ids = posts.map((p) => p.id).toList();
        final liked = await _sb.from('post_likes').select('post_id').eq('user_id', myId).inFilter('post_id', ids);
        final saved = await _sb.from('post_saves').select('post_id').eq('user_id', myId).inFilter('post_id', ids);
        final likedSet = {for (var l in (liked as List)) l['post_id'] as String};
        final savedSet = {for (var s in (saved as List)) s['post_id'] as String};
        for (final p in posts) {
          p.likedByUser = likedSet.contains(p.id);
          p.savedByUser = savedSet.contains(p.id);
        }
      }

      if (posts.length < pageSize) {
        _pagingCtrl.appendLastPage(posts);
      } else {
        _pagingCtrl.appendPage(posts, offset + pageSize);
      }
    } catch (e) {
      _pagingCtrl.error = e;
    }
  }

  Future<void> _sendFriendAction(String action, {String? addresseeId, String? fsId}) async {
    final body = <String, dynamic>{'action': action};
    if (addresseeId != null) body['addresseeId'] = addresseeId;
    if (fsId != null) body['friendshipId'] = fsId;
    await _sb.functions.invoke('friends-action', body: body);
    _load();
  }

  Future<void> _openMessage() async {
    if (_profile == null) return;
    final myId = _sb.auth.currentUser?.id;
    if (myId == null) return;
    // Find or create conversation
    final existing = await _sb.from('conversations')
        .select()
        .or('and(participant_1.eq.$myId,participant_2.eq.${_profile!.id}),and(participant_1.eq.${_profile!.id},participant_2.eq.$myId)')
        .maybeSingle();

    Map<String, dynamic> conv;
    if (existing != null) {
      conv = existing;
    } else {
      final created = await _sb.from('conversations')
          .insert({'participant_1': myId, 'participant_2': _profile!.id})
          .select('*, p1:profiles!conversations_participant_1_fkey(id,username,full_name,first_name,avatar_url), p2:profiles!conversations_participant_2_fkey(id,username,full_name,first_name,avatar_url)')
          .single();
      conv = created;
    }

    if (mounted) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => ChatScreen(conversation: Conversation.fromJson(conv, myId)),
        ),
      );
    }
  }

  @override
  void dispose() {
    _pagingCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator(color: kOrange)));
    if (_profile == null) return const Scaffold(body: Center(child: Text('Profil introuvable')));

    final p = _profile!;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      body: NestedScrollView(
        headerSliverBuilder: (_, __) => [
          SliverAppBar(
            expandedHeight: 200,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: [
                  p.coverUrl != null
                      ? CachedNetworkImage(imageUrl: p.coverUrl!, fit: BoxFit.cover)
                      : Container(
                          decoration: const BoxDecoration(
                            gradient: LinearGradient(colors: [kOrange, kGreen], begin: Alignment.topLeft, end: Alignment.bottomRight),
                          ),
                        ),
                ],
              ),
            ),
          ),
        ],
        body: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        AppAvatar(url: p.avatarUrl, initials: p.initials, size: 72),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              if (!_isOwnProfile) ...[
                                OutlinedButton.icon(
                                  onPressed: _openMessage,
                                  icon: const Icon(Icons.message_outlined, size: 16),
                                  label: const Text('Message'),
                                  style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                                ),
                                const SizedBox(width: 8),
                                _FriendButton(
                                  status: _friendshipStatus,
                                  iAmRequester: _iAmRequester,
                                  profileId: p.id,
                                  friendshipId: _friendshipId,
                                  onAction: _sendFriendAction,
                                ),
                              ] else
                                OutlinedButton.icon(
                                  onPressed: () {},
                                  icon: const Icon(Icons.edit_outlined, size: 16),
                                  label: const Text('Modifier'),
                                  style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(children: [
                      Text(p.fullName, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                      if (p.isVerified) ...[
                        const SizedBox(width: 6),
                        const Icon(Icons.verified, color: kOrange, size: 18),
                      ],
                    ]),
                    Text('@${p.username}', style: TextStyle(color: Colors.grey.shade500, fontSize: 13)),
                    if (p.bio != null) ...[
                      const SizedBox(height: 8),
                      Text(p.bio!, style: const TextStyle(fontSize: 14, height: 1.5)),
                    ],
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 12,
                      runSpacing: 6,
                      children: [
                        if (p.institution != null) _InfoChip(Icons.business, p.institution!),
                        if (p.fieldOfStudy != null) _InfoChip(Icons.school, p.fieldOfStudy!),
                        if (p.city != null) _InfoChip(Icons.location_on, p.city!),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        _Stat(p.postCount, 'Publications'),
                        const SizedBox(width: 24),
                        _Stat(p.friendCount, 'Amis'),
                      ],
                    ),
                    const Divider(height: 32),
                    const Text('Publications', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                  ],
                ),
              ),
            ),
            PagedSliverList<int, Post>(
              pagingController: _pagingCtrl,
              builderDelegate: PagedChildBuilderDelegate<Post>(
                itemBuilder: (ctx, post, _) => PostCard(post: post),
                noItemsFoundIndicatorBuilder: (_) => Padding(
                  padding: const EdgeInsets.all(32),
                  child: Center(child: Text('Aucune publication', style: TextStyle(color: Colors.grey.shade400))),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String label;
  const _InfoChip(this.icon, this.label);
  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Icon(icon, size: 14, color: kOrange),
      const SizedBox(width: 4),
      Text(label, style: const TextStyle(fontSize: 12)),
    ],
  );
}

class _Stat extends StatelessWidget {
  final int count;
  final String label;
  const _Stat(this.count, this.label);
  @override
  Widget build(BuildContext context) => Column(
    children: [
      Text(count.toString(), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: kOrange)),
      Text(label, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
    ],
  );
}

class _FriendButton extends StatefulWidget {
  final String? status;
  final bool iAmRequester;
  final String profileId;
  final String? friendshipId;
  final Function(String action, {String? addresseeId, String? fsId}) onAction;

  const _FriendButton({this.status, required this.iAmRequester, required this.profileId, this.friendshipId, required this.onAction});

  @override
  State<_FriendButton> createState() => _FriendButtonState();
}

class _FriendButtonState extends State<_FriendButton> {
  bool _loading = false;

  Future<void> _act(String action, {String? addresseeId, String? fsId}) async {
    setState(() => _loading = true);
    await widget.onAction(action, addresseeId: addresseeId, fsId: fsId);
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: kOrange, strokeWidth: 2));

    if (widget.status == null) {
      return ElevatedButton.icon(
        onPressed: () => _act('send', addresseeId: widget.profileId),
        icon: const Icon(Icons.person_add, size: 16),
        label: const Text('Ajouter'),
        style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
      );
    }
    if (widget.status == 'accepted') {
      return OutlinedButton.icon(
        onPressed: () => _act('remove', fsId: widget.friendshipId),
        icon: const Icon(Icons.people, size: 16, color: kGreen),
        label: const Text('Amis', style: TextStyle(color: kGreen)),
        style: OutlinedButton.styleFrom(side: const BorderSide(color: kGreen), padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
      );
    }
    if (widget.status == 'pending' && widget.iAmRequester) {
      return OutlinedButton(
        onPressed: () => _act('reject', fsId: widget.friendshipId),
        style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
        child: const Text('Demande envoyée'),
      );
    }
    if (widget.status == 'pending' && !widget.iAmRequester) {
      return ElevatedButton(
        onPressed: () => _act('accept', fsId: widget.friendshipId),
        style: ElevatedButton.styleFrom(backgroundColor: kGreen, padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
        child: const Text('Accepter'),
      );
    }
    return const SizedBox.shrink();
  }
}
