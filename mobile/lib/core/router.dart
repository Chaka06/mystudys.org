import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../features/auth/login_screen.dart';
import '../features/auth/register_screen.dart';
import '../features/auth/otp_screen.dart';
import '../features/auth/forgot_password_screen.dart';
import '../shell.dart';
import '../features/feed/feed_screen.dart';
import '../features/messages/conversations_screen.dart';
import '../features/messages/chat_screen.dart';
import '../features/friends/friends_screen.dart';
import '../features/notifications/notifications_screen.dart';
import '../features/settings/settings_screen.dart';
import '../features/profile/profile_screen.dart';
import '../features/search/search_screen.dart';
import '../features/create_post/create_post_screen.dart';

final _rootKey = GlobalKey<NavigatorState>();
final _shellKey = GlobalKey<NavigatorState>();

GoRouter buildRouter() {
  return GoRouter(
    navigatorKey: _rootKey,
    initialLocation: '/feed',
    redirect: (context, state) {
      final isAuth = Supabase.instance.client.auth.currentUser != null;
      final path = state.matchedLocation;
      final isAuthRoute = path.startsWith('/login') || path.startsWith('/register') ||
          path.startsWith('/otp') || path.startsWith('/forgot-password');
      if (!isAuth && !isAuthRoute) return '/login';
      if (isAuth && isAuthRoute) return '/feed';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
      GoRoute(path: '/otp', builder: (_, state) => OtpScreen(email: state.extra as String)),
      GoRoute(path: '/forgot-password', builder: (_, __) => const ForgotPasswordScreen()),

      ShellRoute(
        navigatorKey: _shellKey,
        builder: (_, state, child) => AppShell(child: child),
        routes: [
          GoRoute(path: '/feed', builder: (_, __) => const FeedScreen()),
          GoRoute(path: '/messages', builder: (_, __) => const ConversationsScreen()),
          GoRoute(path: '/friends', builder: (_, __) => const FriendsScreen()),
          GoRoute(path: '/notifications', builder: (_, __) => const NotificationsScreen()),
          GoRoute(path: '/create', builder: (_, __) => const CreatePostScreen()),
          GoRoute(path: '/settings', builder: (_, __) => const SettingsScreen()),
          GoRoute(path: '/profile/me', builder: (_, __) => const _ProfileMe()),
        ],
      ),

      // Routes plein écran (sans shell nav)
      GoRoute(
        path: '/profile/:username',
        builder: (_, state) => ProfileScreen(username: state.pathParameters['username']!),
      ),
      GoRoute(path: '/search', builder: (_, __) => const SearchScreen()),
    ],
  );
}

class _ProfileMe extends StatelessWidget {
  const _ProfileMe();
  @override
  Widget build(BuildContext context) {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return const SizedBox();
    return FutureBuilder(
      future: Supabase.instance.client.from('profiles').select('username').eq('id', user.id).single(),
      builder: (ctx, snap) {
        if (!snap.hasData) return const Scaffold(body: Center(child: CircularProgressIndicator(strokeWidth: 2)));
        return ProfileScreen(username: snap.data!['username'] as String);
      },
    );
  }
}
