import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/models.dart';

class AuthProvider extends ChangeNotifier {
  final _supabase = Supabase.instance.client;

  User? _user;
  Profile? _profile;
  bool _loading = true;

  User? get user => _user;
  Profile? get profile => _profile;
  bool get loading => _loading;
  bool get isAuthenticated => _user != null;

  AuthProvider() {
    _init();
  }

  Future<void> _init() async {
    _user = _supabase.auth.currentUser;
    if (_user != null) await _loadProfile();
    _loading = false;
    notifyListeners();

    _supabase.auth.onAuthStateChange.listen((data) async {
      _user = data.session?.user;
      if (_user != null) {
        await _loadProfile();
      } else {
        _profile = null;
      }
      notifyListeners();
    });
  }

  Future<void> _loadProfile() async {
    if (_user == null) return;
    try {
      final data = await _supabase
          .from('profiles')
          .select()
          .eq('id', _user!.id)
          .single();
      _profile = Profile.fromJson(data);
      notifyListeners();
    } catch (_) {}
  }

  Future<void> refreshProfile() => _loadProfile();

  Future<String?> signOut() async {
    try {
      await _supabase.auth.signOut();
      _user = null;
      _profile = null;
      notifyListeners();
      return null;
    } catch (e) {
      return e.toString();
    }
  }
}
