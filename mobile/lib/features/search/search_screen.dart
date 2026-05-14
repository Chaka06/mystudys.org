import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../models/models.dart';
import '../../widgets/app_avatar.dart';
import '../../widgets/post_card.dart';
import '../../core/theme.dart';
import '../profile/profile_screen.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});
  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final _sb = Supabase.instance.client;
  final _ctrl = TextEditingController();
  List<Profile> _users = [];
  List<Post> _posts = [];
  bool _loading = false;
  String _activeTab = 'all';

  Future<void> _search(String q) async {
    if (q.trim().isEmpty) {
      setState(() { _users = []; _posts = []; });
      return;
    }
    setState(() => _loading = true);
    try {
      final escaped = q.trim().replaceAll('%', '\\%').replaceAll('_', '\\_');
      List<Profile> users = [];
      List<Post> posts = [];

      if (_activeTab == 'all' || _activeTab == 'users') {
        final data = await _sb.from('profiles')
            .select('id,username,full_name,first_name,avatar_url,is_verified,institution,field_of_study')
            .or('username.ilike.${escaped}%,full_name.ilike.${escaped}%,username.ilike.%$escaped%,full_name.ilike.%$escaped%')
            .eq('is_public', true)
            .limit(10);
        users = (data as List).map((u) => Profile.fromJson(u)).toList();
      }

      if (_activeTab == 'all' || _activeTab == 'posts') {
        final data = await _sb.from('posts')
            .select('*, author:profiles(id,username,full_name,first_name,avatar_url,is_verified,institution), media:post_media(*)')
            .eq('is_deleted', false)
            .eq('moderation_status', 'approved')
            .or('content.ilike.%$escaped%,subject_name.ilike.%$escaped%,professor_name.ilike.%$escaped%')
            .order('created_at', ascending: false)
            .limit(20);
        posts = (data as List).map((p) => Post.fromJson(p)).toList();
      }

      setState(() { _users = users; _posts = posts; _loading = false; });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: TextField(
          controller: _ctrl,
          autofocus: true,
          decoration: InputDecoration(
            hintText: 'Rechercher…',
            prefixIcon: const Icon(Icons.search, size: 20),
            suffixIcon: _ctrl.text.isNotEmpty
                ? IconButton(icon: const Icon(Icons.clear, size: 18), onPressed: () { _ctrl.clear(); _search(''); })
                : null,
            contentPadding: const EdgeInsets.symmetric(vertical: 10),
          ),
          onChanged: (v) => Future.delayed(const Duration(milliseconds: 350), () {
            if (_ctrl.text == v) _search(v);
          }),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(44),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            child: Row(
              children: [
                for (final tab in [('all', 'Tout'), ('users', 'Personnes'), ('posts', 'Publications')])
                  GestureDetector(
                    onTap: () { setState(() => _activeTab = tab.$1); _search(_ctrl.text); },
                    child: Container(
                      margin: const EdgeInsets.only(right: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        color: _activeTab == tab.$1 ? kOrange : Colors.transparent,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: _activeTab == tab.$1 ? kOrange : Colors.grey.shade300),
                      ),
                      child: Text(
                        tab.$2,
                        style: TextStyle(
                          fontSize: 13,
                          color: _activeTab == tab.$1 ? Colors.white : Colors.grey.shade600,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: kOrange))
          : _users.isEmpty && _posts.isEmpty
              ? Center(
                  child: _ctrl.text.isEmpty
                      ? Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.search, size: 56, color: Colors.grey.shade300),
                            const SizedBox(height: 16),
                            Text('Recherchez des personnes ou publications', style: TextStyle(color: Colors.grey.shade500)),
                          ],
                        )
                      : Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.search_off, size: 56, color: Colors.grey.shade300),
                            const SizedBox(height: 16),
                            Text('Aucun résultat pour "${_ctrl.text}"', style: TextStyle(color: Colors.grey.shade500)),
                          ],
                        ),
                )
              : ListView(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  children: [
                    if (_users.isNotEmpty) ...[
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                        child: Text('Personnes', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: Colors.grey.shade500)),
                      ),
                      ..._users.map((u) => ListTile(
                        leading: AppAvatar(url: u.avatarUrl, initials: u.initials, size: 44),
                        title: Row(children: [
                          Text(u.fullName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                          if (u.isVerified) ...[const SizedBox(width: 4), const Icon(Icons.verified, color: kOrange, size: 14)],
                        ]),
                        subtitle: Text('@${u.username}${u.institution != null ? ' · ${u.institution}' : ''}', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ProfileScreen(username: u.username))),
                      )),
                    ],
                    if (_posts.isNotEmpty) ...[
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                        child: Text('Publications', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: Colors.grey.shade500)),
                      ),
                      ..._posts.map((p) => PostCard(post: p)),
                    ],
                  ],
                ),
    );
  }
}
