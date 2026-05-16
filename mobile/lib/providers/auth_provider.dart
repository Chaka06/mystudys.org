import 'dart:async';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/models.dart';

class AuthProvider extends ChangeNotifier {
  final _supabase = Supabase.instance.client;
  StreamSubscription? _authSubscription;

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

    _authSubscription = _supabase.auth.onAuthStateChange.listen((data) async {
      final event = data.event;
      final newUser = data.session?.user;

      // Ignorer les token refreshes silencieux — ils déclenchent le listener
      // sans changer l'état métier (l'utilisateur est toujours le même)
      if (event == AuthChangeEvent.tokenRefreshed) {
        _user = newUser; // Mettre à jour l'objet User sans recharger le profil
        return;
      }

      final wasAuthenticated = _user != null;
      final isNowAuthenticated = newUser != null;
      _user = newUser;

      if (isNowAuthenticated && !wasAuthenticated) {
        // Nouvelle connexion → charger le profil
        await _loadProfile();
      } else if (!isNowAuthenticated) {
        // Déconnexion → vider le profil
        _profile = null;
      }
      // Si même utilisateur déjà connecté → ne pas recharger le profil

      _loading = false;
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
  Future<void> fetchProfile() => _loadProfile();

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

  @override
  void dispose() {
    _authSubscription?.cancel();
    super.dispose();
  }
}
