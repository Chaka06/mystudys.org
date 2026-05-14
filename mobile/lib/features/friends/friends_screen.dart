import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../models/models.dart';
import '../../widgets/app_avatar.dart';
import '../../core/theme.dart';
import '../profile/profile_screen.dart';

class FriendsScreen extends StatefulWidget {
  const FriendsScreen({super.key});
  @override
  State<FriendsScreen> createState() => _FriendsScreenState();
}

class _FriendsScreenState extends State<FriendsScreen> with SingleTickerProviderStateMixin {
  final _sb = Supabase.instance.client;
  late final TabController _tabs;
  late RealtimeChannel _channel;
  List<Friendship> _friends = [];
  List<Friendship> _requests = [];
  List<Profile> _suggestions = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
    _load();
    _setupRealtime();
  }

  void _setupRealtime() {
    final userId = _sb.auth.currentUser?.id;
    if (userId == null) return;
    _channel = _sb.channel('friends-screen-$userId')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'friendships',
          filter: PostgresChangeFilter(type: PostgresChangeFilterType.eq, column: 'requester_id', value: userId),
          callback: (_) => _load(),
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'friendships',
          filter: PostgresChangeFilter(type: PostgresChangeFilterType.eq, column: 'addressee_id', value: userId),
          callback: (_) => _load(),
        )
        .subscribe();
  }

  Future<void> _removeFriend(String friendshipId) async {
    await _sb.from('friendships').delete().eq('id', friendshipId);
    _load();
  }

  Future<void> _load() async {
    final userId = _sb.auth.currentUser?.id;
    if (userId == null) return;
    try {
      final [friendsData, requestsData, suggestsData] = await Future.wait([
        _sb.from('friendships')
            .select('*, requester:profiles!requester_id(*), addressee:profiles!addressee_id(*)')
            .or('requester_id.eq.$userId,addressee_id.eq.$userId')
            .eq('status', 'accepted'),
        _sb.from('friendships')
            .select('*, requester:profiles!requester_id(*)')
            .eq('addressee_id', userId)
            .eq('status', 'pending'),
        _sb.rpc('get_friend_suggestions', params: {'p_user_id': userId, 'p_limit': 15}),
      ]);

      final friends = (friendsData as List).map((f) => Friendship.fromJson(f)).toList();
      final requests = (requestsData as List).map((f) => Friendship.fromJson(f)).toList();
      List<Profile> suggests = [];
      if (suggestsData is List && suggestsData.isNotEmpty) {
        final ids = suggestsData.map((s) => s['suggested_id'] as String).toList();
        if (ids.isNotEmpty) {
          final profiles = await _sb.from('profiles').select().inFilter('id', ids);
          suggests = (profiles as List).map((p) => Profile.fromJson(p)).toList();
        }
      }

      setState(() {
        _friends = friends;
        _requests = requests;
        _suggestions = suggests;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<void> _respond(String action, String friendshipId) async {
    await _sb.from('friendships').update({'status': action == 'accept' ? 'accepted' : 'rejected'}).eq('id', friendshipId);
    _load();
  }

  Future<void> _sendRequest(String addresseeId) async {
    final userId = _sb.auth.currentUser?.id;
    if (userId == null) return;
    await _sb.from('friendships').insert({'requester_id': userId, 'addressee_id': addresseeId});
    _load();
  }

  @override
  void dispose() {
    _channel.unsubscribe();
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Amis'),
        bottom: TabBar(
          controller: _tabs,
          labelColor: kOrange,
          unselectedLabelColor: Colors.grey,
          indicatorColor: kOrange,
          tabs: [
            Tab(text: 'Amis (${_friends.length})'),
            Tab(text: 'Demandes (${_requests.length})'),
            const Tab(text: 'Suggestions'),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: kOrange))
          : TabBarView(
              controller: _tabs,
              children: [
                _FriendsList(
                  friends: _friends,
                  onTap: (username) => Navigator.push(context, MaterialPageRoute(builder: (_) => ProfileScreen(username: username))),
                  onRemove: _removeFriend,
                ),
                _RequestsList(requests: _requests, onRespond: _respond),
                _SuggestionsList(suggestions: _suggestions, onAdd: _sendRequest, onTap: (username) => Navigator.push(context, MaterialPageRoute(builder: (_) => ProfileScreen(username: username)))),
              ],
            ),
    );
  }
}

class _FriendsList extends StatelessWidget {
  final List<Friendship> friends;
  final void Function(String username) onTap;
  final void Function(String friendshipId) onRemove;
  const _FriendsList({required this.friends, required this.onTap, required this.onRemove});

  @override
  Widget build(BuildContext context) {
    if (friends.isEmpty) return Center(child: Text('Aucun ami pour l\'instant', style: TextStyle(color: Colors.grey.shade500)));
    final userId = Supabase.instance.client.auth.currentUser?.id;
    return ListView.separated(
      itemCount: friends.length,
      separatorBuilder: (_, __) => const Divider(height: 1, indent: 72),
      itemBuilder: (_, i) {
        final f = friends[i];
        final other = f.requesterId == userId ? f.addressee : f.requester;
        return ListTile(
          leading: AppAvatar(url: other?.avatarUrl, initials: other?.initials ?? 'U', size: 44),
          title: Text(other?.fullName ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
          subtitle: Text('@${other?.username ?? ''}', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
          onTap: () => onTap(other?.username ?? ''),
          trailing: IconButton(
            icon: Icon(Icons.person_remove_outlined, size: 20, color: Colors.grey.shade400),
            onPressed: () async {
              final confirm = await showDialog<bool>(
                context: context,
                builder: (ctx) => AlertDialog(
                  title: Text('Retirer ${other?.firstName ?? 'cet ami'} ?'),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
                    TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Retirer', style: TextStyle(color: Colors.red))),
                  ],
                ),
              );
              if (confirm == true) onRemove(f.id);
            },
          ),
        );
      },
    );
  }
}

class _RequestsList extends StatelessWidget {
  final List<Friendship> requests;
  final void Function(String action, String fsId) onRespond;
  const _RequestsList({required this.requests, required this.onRespond});

  @override
  Widget build(BuildContext context) {
    if (requests.isEmpty) return Center(child: Text('Aucune demande en attente', style: TextStyle(color: Colors.grey.shade500)));
    return ListView.builder(
      itemCount: requests.length,
      itemBuilder: (_, i) {
        final f = requests[i];
        final req = f.requester;
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          child: Row(
            children: [
              AppAvatar(url: req?.avatarUrl, initials: req?.initials ?? 'U', size: 44),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(req?.fullName ?? '', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                    Text('@${req?.username ?? ''}', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                  ],
                ),
              ),
              TextButton(
                onPressed: () => onRespond('reject', f.id),
                style: TextButton.styleFrom(foregroundColor: Colors.grey),
                child: const Text('Refuser'),
              ),
              const SizedBox(width: 4),
              ElevatedButton(
                onPressed: () => onRespond('accept', f.id),
                style: ElevatedButton.styleFrom(backgroundColor: kGreen, padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                child: const Text('Accepter', style: TextStyle(fontSize: 12)),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _SuggestionsList extends StatelessWidget {
  final List<Profile> suggestions;
  final void Function(String id) onAdd;
  final void Function(String username) onTap;
  const _SuggestionsList({required this.suggestions, required this.onAdd, required this.onTap});

  @override
  Widget build(BuildContext context) {
    if (suggestions.isEmpty) return Center(child: Text('Aucune suggestion', style: TextStyle(color: Colors.grey.shade500)));
    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: suggestions.length,
      itemBuilder: (_, i) {
        final p = suggestions[i];
        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Theme.of(context).cardTheme.color,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Theme.of(context).brightness == Brightness.dark ? const Color(0xFF2D3139) : Colors.grey.shade200),
          ),
          child: Row(
            children: [
              GestureDetector(
                onTap: () => onTap(p.username),
                child: AppAvatar(url: p.avatarUrl, initials: p.initials, size: 44),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: GestureDetector(
                  onTap: () => onTap(p.username),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(p.fullName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                      if (p.institution != null)
                        Text(p.institution!, style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                    ],
                  ),
                ),
              ),
              ElevatedButton(
                onPressed: () => onAdd(p.id),
                style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                child: const Text('Ajouter', style: TextStyle(fontSize: 12)),
              ),
            ],
          ),
        );
      },
    );
  }
}
