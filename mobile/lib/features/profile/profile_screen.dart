import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import 'package:infinite_scroll_pagination/infinite_scroll_pagination.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../models/models.dart';
import '../../widgets/app_avatar.dart';
import '../../widgets/post_card.dart';
import '../../core/theme.dart';
import '../messages/chat_screen.dart';
import '../settings/profile_editor_screen.dart';

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
      final isOwn = profile.id == myId;
      String? fsId; String? fsStatus; bool iAmReq = false;
      if (!isOwn && myId != null) {
        final fs = await _sb.from('friendships').select('id,status,requester_id')
            .or('and(requester_id.eq.$myId,addressee_id.eq.${profile.id}),and(requester_id.eq.${profile.id},addressee_id.eq.$myId)')
            .maybeSingle();
        if (fs != null) { fsId = fs['id']; fsStatus = fs['status']; iAmReq = fs['requester_id'] == myId; }
      }
      if (!mounted) return;
      setState(() { _profile = profile; _isOwnProfile = isOwn; _friendshipId = fsId; _friendshipStatus = fsStatus; _iAmRequester = iAmReq; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
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
          .eq('author_id', _profile!.id).eq('is_deleted', false)
          .order('created_at', ascending: false).range(offset, offset + pageSize - 1);
      final posts = (data as List).map((p) => Post.fromJson(p)).toList();
      if (myId != null && posts.isNotEmpty) {
        final ids = posts.map((p) => p.id).toList();
        final liked = await _sb.from('post_likes').select('post_id').eq('user_id', myId).inFilter('post_id', ids);
        final saved = await _sb.from('post_saves').select('post_id').eq('user_id', myId).inFilter('post_id', ids);
        final likedSet = {for (var l in (liked as List)) l['post_id'] as String};
        final savedSet = {for (var s in (saved as List)) s['post_id'] as String};
        for (final p in posts) { p.likedByUser = likedSet.contains(p.id); p.savedByUser = savedSet.contains(p.id); }
      }
      posts.length < pageSize ? _pagingCtrl.appendLastPage(posts) : _pagingCtrl.appendPage(posts, offset + pageSize);
    } catch (e) { _pagingCtrl.error = e; }
  }

  Future<void> _sendFriendAction(String action, {String? addresseeId, String? fsId}) async {
    final myId = _sb.auth.currentUser?.id;
    if (myId == null) return;
    if (action == 'send' && addresseeId != null) {
      await _sb.from('friendships').insert({'requester_id': myId, 'addressee_id': addresseeId});
    } else if ((action == 'accept') && fsId != null) {
      await _sb.from('friendships').update({'status': 'accepted'}).eq('id', fsId);
    } else if ((action == 'reject' || action == 'remove') && fsId != null) {
      await _sb.from('friendships').delete().eq('id', fsId);
    }
    _load();
  }

  Future<void> _openMessage() async {
    if (_profile == null) return;
    final myId = _sb.auth.currentUser?.id;
    if (myId == null) return;
    final existing = await _sb.from('conversations').select()
        .or('and(participant_1.eq.$myId,participant_2.eq.${_profile!.id}),and(participant_1.eq.${_profile!.id},participant_2.eq.$myId)')
        .maybeSingle();
    Map<String, dynamic> conv;
    if (existing != null) {
      conv = existing;
    } else {
      conv = await _sb.from('conversations')
          .insert({'participant_1': myId, 'participant_2': _profile!.id})
          .select('*, p1:profiles!conversations_participant_1_fkey(id,username,full_name,first_name,avatar_url,is_active), p2:profiles!conversations_participant_2_fkey(id,username,full_name,first_name,avatar_url,is_active)')
          .single();
    }
    if (mounted) Navigator.push(context, MaterialPageRoute(builder: (_) => ChatScreen(conversation: Conversation.fromJson(conv, myId))));
  }

  @override
  void dispose() { _pagingCtrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator(color: kOrange)));
    if (_profile == null) return const Scaffold(body: Center(child: Text('Profil introuvable')));

    final p = _profile!;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? const Color(0xFF0F1117) : const Color(0xFFF8F9FB);
    final cardBg = isDark ? const Color(0xFF1E2025) : Colors.white;
    final border = isDark ? const Color(0xFF2D3139) : Colors.grey.shade200;

    return Scaffold(
      backgroundColor: bg,
      body: CustomScrollView(
        slivers: [
          // ── Cover photo + AppBar ────────────────────────────
          SliverAppBar(
            expandedHeight: 180,
            pinned: true,
            backgroundColor: isDark ? const Color(0xFF1E2025) : Colors.white,
            surfaceTintColor: Colors.transparent,
            leading: const BackButton(),
            actions: [
              if (_isOwnProfile)
                IconButton(
                  icon: const Icon(Icons.settings_outlined),
                  onPressed: () => context.go('/settings'),
                ),
            ],
            flexibleSpace: FlexibleSpaceBar(
              collapseMode: CollapseMode.pin,
              background: p.coverUrl != null
                  ? CachedNetworkImage(imageUrl: p.coverUrl!, fit: BoxFit.cover)
                  : Container(
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          colors: [kOrange, Color(0xFFEA580C), kGreen],
                          begin: Alignment.topLeft, end: Alignment.bottomRight,
                        ),
                      ),
                    ),
            ),
          ),

          // ── Header profil ────────────────────────────────────
          SliverToBoxAdapter(
            child: Container(
              color: bg,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Avatar + boutons
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 0),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        // Avatar avec badge vérifié en bas-droite
                        Transform.translate(
                          offset: const Offset(0, -28),
                          child: Stack(
                            clipBehavior: Clip.none,
                            children: [
                              Container(
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(color: bg, width: 4),
                                  boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.15), blurRadius: 8)],
                                ),
                                child: AppAvatar(url: p.avatarUrl, initials: p.initials, size: 80),
                              ),
                              if (p.isVerified)
                                Positioned(
                                  bottom: 2, right: 2,
                                  child: Container(
                                    width: 24, height: 24,
                                    decoration: BoxDecoration(
                                      color: kOrange, shape: BoxShape.circle,
                                      border: Border.all(color: bg, width: 2),
                                    ),
                                    child: const Icon(Icons.check, color: Colors.white, size: 13),
                                  ),
                                ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        // Boutons d'action
                        Expanded(
                          child: Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Wrap(
                              alignment: WrapAlignment.end,
                              spacing: 8, runSpacing: 8,
                              children: [
                                if (!_isOwnProfile) ...[
                                  OutlinedButton.icon(
                                    onPressed: _openMessage,
                                    icon: const Icon(Icons.chat_bubble_outline, size: 15),
                                    label: const Text('Message'),
                                    style: OutlinedButton.styleFrom(
                                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                      textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                                    ),
                                  ),
                                  _FriendButton(
                                    status: _friendshipStatus,
                                    iAmRequester: _iAmRequester,
                                    profileId: p.id,
                                    friendshipId: _friendshipId,
                                    onAction: _sendFriendAction,
                                  ),
                                ] else
                                  ElevatedButton.icon(
                                    onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfileEditorScreen())),
                                    icon: const Icon(Icons.edit_outlined, size: 15),
                                    label: const Text('Modifier'),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: isDark ? const Color(0xFF2D3139) : Colors.grey.shade100,
                                      foregroundColor: isDark ? Colors.white : Colors.black87,
                                      elevation: 0,
                                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                      textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Infos profil
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Nom + badge
                        Row(children: [
                          Flexible(child: Text(p.fullName, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800))),
                          if (p.isVerified) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                              decoration: BoxDecoration(color: kOrange.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
                              child: const Text('✓ Vérifié', style: TextStyle(fontSize: 10, color: kOrange, fontWeight: FontWeight.w700)),
                            ),
                          ],
                        ]),
                        const SizedBox(height: 2),
                        Text('@${p.username}', style: TextStyle(color: Colors.grey.shade500, fontSize: 13)),

                        // Bio
                        if (p.bio != null && p.bio!.isNotEmpty) ...[
                          const SizedBox(height: 10),
                          Text(p.bio!, style: const TextStyle(fontSize: 14, height: 1.5)),
                        ],

                        // Infos (institution, filière, niveau, ville, site web)
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 0, runSpacing: 6,
                          children: [
                            if (p.institution != null) _InfoRow(Icons.business_outlined, p.institution!),
                            if (p.fieldOfStudy != null) _InfoRow(Icons.school_outlined, p.fieldOfStudy!),
                            if (p.academicLevel != null) _InfoRow(Icons.grade_outlined, _levelLabel(p.academicLevel!)),
                            if (p.city != null) _InfoRow(Icons.location_on_outlined, p.city!),
                            if (p.website != null) _InfoRow(Icons.link, p.website!, isLink: true),
                          ],
                        ),

                        // Stats
                        const SizedBox(height: 16),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          decoration: BoxDecoration(
                            color: cardBg,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: border),
                          ),
                          child: Row(
                            children: [
                              Expanded(child: _StatItem(p.postCount, 'Publications')),
                              Container(width: 1, height: 32, color: border),
                              Expanded(child: _StatItem(p.friendCount, 'Amis')),
                            ],
                          ),
                        ),

                        // Séparateur publications
                        const SizedBox(height: 20),
                        Row(children: [
                          const Text('Publications', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(color: kOrange.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
                            child: Text('${p.postCount}', style: const TextStyle(fontSize: 11, color: kOrange, fontWeight: FontWeight.w700)),
                          ),
                        ]),
                        const SizedBox(height: 4),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // ── Liste posts ─────────────────────────────────────
          PagedSliverList<int, Post>(
            pagingController: _pagingCtrl,
            builderDelegate: PagedChildBuilderDelegate<Post>(
              itemBuilder: (ctx, post, _) => Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                child: PostCard(post: post, onTap: () => context.push('/post/${post.id}')),
              ),
              firstPageProgressIndicatorBuilder: (_) => const Padding(
                padding: EdgeInsets.all(32),
                child: Center(child: CircularProgressIndicator(color: kOrange, strokeWidth: 2)),
              ),
              noItemsFoundIndicatorBuilder: (_) => Padding(
                padding: const EdgeInsets.all(40),
                child: Center(
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    Icon(Icons.post_add, size: 48, color: Colors.grey.shade300),
                    const SizedBox(height: 12),
                    Text('Aucune publication', style: TextStyle(color: Colors.grey.shade400, fontSize: 14)),
                  ]),
                ),
              ),
            ),
          ),

          const SliverToBoxAdapter(child: SizedBox(height: 80)),
        ],
      ),
    );
  }

  String _levelLabel(String level) {
    const map = {
      'terminale': 'Terminale', 'bts_1': 'BTS 1', 'bts_2': 'BTS 2',
      'licence_1': 'L1', 'licence_2': 'L2', 'licence_3': 'L3',
      'master_1': 'M1', 'master_2': 'M2', 'doctorat': 'Doctorat',
    };
    return map[level] ?? level;
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isLink;
  const _InfoRow(this.icon, this.label, {this.isLink = false});
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 4),
    child: Row(mainAxisSize: MainAxisSize.min, children: [
      Icon(icon, size: 14, color: isLink ? kOrange : Colors.grey.shade500),
      const SizedBox(width: 5),
      Flexible(child: Text(label, style: TextStyle(
        fontSize: 13, color: isLink ? kOrange : Colors.grey.shade600,
        decoration: isLink ? TextDecoration.underline : null,
      ))),
      const SizedBox(width: 16),
    ]),
  );
}

class _StatItem extends StatelessWidget {
  final int count;
  final String label;
  const _StatItem(this.count, this.label);
  @override
  Widget build(BuildContext context) => Column(
    children: [
      Text(count.toString(), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: kOrange)),
      Text(label, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
    ],
  );
}

// ── FriendButton ─────────────────────────────────────────────────────────────

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
        icon: const Icon(Icons.person_add, size: 15),
        label: const Text('Ajouter en ami'),
        style: ElevatedButton.styleFrom(
          backgroundColor: kOrange,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
        ),
      );
    }

    if (widget.status == 'accepted') {
      return PopupMenuButton<String>(
        onSelected: (v) { if (v == 'remove') _act('remove', fsId: widget.friendshipId); },
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        itemBuilder: (_) => [
          PopupMenuItem(value: 'remove', child: Row(children: [
            const Icon(Icons.person_remove, size: 16, color: kOrange),
            const SizedBox(width: 8),
            const Text('Retirer des amis', style: TextStyle(fontSize: 13)),
          ])),
        ],
        child: OutlinedButton.icon(
          onPressed: null,
          icon: const Icon(Icons.people, size: 15, color: kGreen),
          label: Row(mainAxisSize: MainAxisSize.min, children: const [
            Text('Amis', style: TextStyle(color: kGreen, fontSize: 13, fontWeight: FontWeight.w600)),
            SizedBox(width: 2),
            Icon(Icons.keyboard_arrow_down, size: 14, color: kGreen),
          ]),
          style: OutlinedButton.styleFrom(
            side: const BorderSide(color: kGreen),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          ),
        ),
      );
    }

    if (widget.status == 'pending' && widget.iAmRequester) {
      return Row(mainAxisSize: MainAxisSize.min, children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
          decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.grey.shade300)),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            Icon(Icons.schedule, size: 13, color: kOrange),
            const SizedBox(width: 4),
            const Text('Demande envoyée', style: TextStyle(fontSize: 11, color: Colors.grey, fontWeight: FontWeight.w500)),
          ]),
        ),
        const SizedBox(width: 6),
        TextButton(
          onPressed: () => _act('reject', fsId: widget.friendshipId),
          style: TextButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 8)),
          child: const Text('Annuler', style: TextStyle(fontSize: 11, color: Colors.grey)),
        ),
      ]);
    }

    if (widget.status == 'pending' && !widget.iAmRequester) {
      return Row(mainAxisSize: MainAxisSize.min, children: [
        TextButton(
          onPressed: () => _act('reject', fsId: widget.friendshipId),
          style: TextButton.styleFrom(foregroundColor: Colors.grey, padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8)),
          child: const Text('Refuser', style: TextStyle(fontSize: 12)),
        ),
        const SizedBox(width: 4),
        ElevatedButton(
          onPressed: () => _act('accept', fsId: widget.friendshipId),
          style: ElevatedButton.styleFrom(backgroundColor: kGreen, padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8)),
          child: const Text('Accepter', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
        ),
      ]);
    }

    return const SizedBox.shrink();
  }
}
