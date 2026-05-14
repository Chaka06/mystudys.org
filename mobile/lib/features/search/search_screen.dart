import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
  String _level = '';

  static const _tabs = [
    ('all', 'Tout', Icons.search),
    ('users', 'Utilisateurs', Icons.people),
    ('posts', 'Publications', Icons.description),
    ('exam_subject', 'Sujets d\'examens', Icons.school),
  ];

  static const _levels = [
    ('all', 'Tous les niveaux'),
    ('terminale', 'Terminale'), ('bts_1', 'BTS 1'), ('bts_2', 'BTS 2'),
    ('licence_1', 'L1'), ('licence_2', 'L2'), ('licence_3', 'L3'),
    ('master_1', 'M1'), ('master_2', 'M2'), ('doctorat', 'Doctorat'),
  ];

  Future<void> _search(String q) async {
    if (q.trim().isEmpty && _activeTab == 'all') {
      setState(() { _users = []; _posts = []; });
      return;
    }
    setState(() => _loading = true);
    try {
      final escaped = q.trim().replaceAll('%', '\\%').replaceAll('_', '\\_');
      List<Profile> users = [];
      List<Post> posts = [];

      if (_activeTab == 'all' || _activeTab == 'users') {
        if (escaped.isNotEmpty) {
          final data = await _sb.from('profiles')
              .select('id,username,full_name,first_name,avatar_url,is_verified,institution,field_of_study,academic_level')
              .or('username.ilike.${escaped}%,full_name.ilike.${escaped}%,username.ilike.%$escaped%,full_name.ilike.%$escaped%')
              .eq('is_public', true)
              .limit(10);
          users = (data as List).map((u) => Profile.fromJson(u)).toList();
        }
      }

      if (_activeTab == 'all' || _activeTab == 'posts') {
        if (escaped.isNotEmpty) {
          var query = _sb.from('posts')
              .select('*, author:profiles(id,username,full_name,first_name,avatar_url,is_verified,institution), media:post_media(*)')
              .eq('is_deleted', false)
              .eq('moderation_status', 'approved')
              .or('content.ilike.%$escaped%,subject_name.ilike.%$escaped%,professor_name.ilike.%$escaped%');
          if (_level.isNotEmpty) query = query.eq('academic_level', _level);
          final data = await query.order('created_at', ascending: false).limit(20);
          posts = (data as List).map((p) => Post.fromJson(p)).toList();
        }
      }

      if (_activeTab == 'exam_subject') {
        var query = _sb.from('posts')
            .select('*, author:profiles(id,username,full_name,first_name,avatar_url,is_verified,institution), media:post_media(*)')
            .eq('is_deleted', false)
            .eq('moderation_status', 'approved')
            .eq('post_type', 'exam_subject');
        if (escaped.isNotEmpty) query = query.or('content.ilike.%$escaped%,subject_name.ilike.%$escaped%,professor_name.ilike.%$escaped%');
        if (_level.isNotEmpty) query = query.eq('academic_level', _level);
        final data = await query.order('created_at', ascending: false).limit(20);
        posts = (data as List).map((p) => Post.fromJson(p)).toList();
      }

      setState(() { _users = users; _posts = posts; _loading = false; });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  void _hideKeyboard() => SystemChannels.textInput.invokeMethod('TextInput.hide');

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
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
              children: _tabs.map((tab) => GestureDetector(
                onTap: () {
                  setState(() => _activeTab = tab.$1);
                  _hideKeyboard();
                  _search(_ctrl.text);
                },
                child: Container(
                  margin: const EdgeInsets.only(right: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                  decoration: BoxDecoration(
                    color: _activeTab == tab.$1 ? kOrange : Colors.transparent,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: _activeTab == tab.$1 ? kOrange : Colors.grey.shade300),
                  ),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    Icon(tab.$3, size: 14, color: _activeTab == tab.$1 ? Colors.white : Colors.grey.shade600),
                    const SizedBox(width: 5),
                    Text(tab.$2, style: TextStyle(
                      fontSize: 12, fontWeight: FontWeight.w600,
                      color: _activeTab == tab.$1 ? Colors.white : Colors.grey.shade600,
                    )),
                  ]),
                ),
              )).toList(),
            ),
          ),
        ),
      ),
      body: Column(
        children: [
          // Filtre niveau (sauf pour l'onglet utilisateurs)
          if (_activeTab != 'users')
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: DropdownButton<String>(
                value: _level.isEmpty ? 'all' : _level,
                isExpanded: true,
                underline: const SizedBox(),
                isDense: true,
                items: _levels.map((l) => DropdownMenuItem(
                  value: l.$1,
                  child: Text(l.$2, style: const TextStyle(fontSize: 13)),
                )).toList(),
                onChanged: (v) {
                  setState(() => _level = v == 'all' ? '' : v ?? '');
                  _search(_ctrl.text);
                },
              ),
            ),

          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: kOrange))
                : _users.isEmpty && _posts.isEmpty
                    ? Center(
                        child: _ctrl.text.isEmpty && _activeTab != 'exam_subject'
                            ? Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                                Icon(Icons.search, size: 56, color: Colors.grey.shade300),
                                const SizedBox(height: 16),
                                Text('Recherchez des personnes ou publications',
                                  style: TextStyle(color: Colors.grey.shade500), textAlign: TextAlign.center),
                              ])
                            : Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                                Icon(Icons.search_off, size: 56, color: Colors.grey.shade300),
                                const SizedBox(height: 16),
                                Text('Aucun résultat${_ctrl.text.isNotEmpty ? ' pour "${_ctrl.text}"' : ''}',
                                  style: TextStyle(color: Colors.grey.shade500)),
                              ]),
                      )
                    : ListView(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        children: [
                          if (_users.isNotEmpty) ...[
                            Padding(
                              padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                              child: Text('Utilisateurs',
                                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: Colors.grey.shade500)),
                            ),
                            Padding(
                              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                              child: Text('${_users.length} résultat${_users.length > 1 ? 's' : ''}',
                                style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
                            ),
                            ..._users.map((u) => ListTile(
                              leading: AppAvatar(url: u.avatarUrl, initials: u.initials, size: 44),
                              title: Row(children: [
                                Text(u.fullName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                                if (u.isVerified) ...[const SizedBox(width: 4), const Icon(Icons.verified, color: kOrange, size: 14)],
                              ]),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text('@${u.username}${u.institution != null ? ' · ${u.institution}' : ''}',
                                    style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                                  if (u.academicLevel != null)
                                    Container(
                                      margin: const EdgeInsets.only(top: 3),
                                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: kOrange.withValues(alpha: 0.1),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(u.academicLevel!,
                                        style: const TextStyle(fontSize: 10, color: kOrange, fontWeight: FontWeight.w600)),
                                    ),
                                ],
                              ),
                              onTap: () {
                                _hideKeyboard();
                                Navigator.push(context, MaterialPageRoute(builder: (_) => ProfileScreen(username: u.username)));
                              },
                            )),
                          ],
                          if (_posts.isNotEmpty) ...[
                            Padding(
                              padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
                              child: Text('Publications',
                                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: Colors.grey.shade500)),
                            ),
                            Padding(
                              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                              child: Text('${_posts.length} résultat${_posts.length > 1 ? 's' : ''}',
                                style: TextStyle(fontSize: 11, color: Colors.grey.shade400)),
                            ),
                            ..._posts.map((p) => Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                              child: PostCard(post: p),
                            )),
                          ],
                        ],
                      ),
          ),
        ],
      ),
    );
  }
}
