import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../features/auth/login_screen.dart';
import '../features/auth/register_screen.dart';
import '../features/auth/otp_screen.dart';
import '../features/auth/forgot_password_screen.dart';
import '../features/auth/reset_password_screen.dart';
import '../shell.dart';
import '../features/feed/feed_screen.dart';
import '../features/messages/conversations_screen.dart';
import '../features/friends/friends_screen.dart';
import '../features/notifications/notifications_screen.dart';
import '../features/settings/settings_screen.dart';
import '../features/profile/profile_screen.dart';
import '../features/search/search_screen.dart';
import '../features/create_post/create_post_screen.dart';
import '../features/post_detail/post_detail_screen.dart';
import '../features/saved_posts/saved_posts_screen.dart';
import '../features/trending/trending_screen.dart';
import '../providers/auth_provider.dart';
import 'theme.dart';

final _rootKey = GlobalKey<NavigatorState>();
final _shellKey = GlobalKey<NavigatorState>();

GoRouter buildRouter() {
  return GoRouter(
    navigatorKey: _rootKey,
    initialLocation: '/feed',
    redirect: (context, state) {
      // Lire AuthProvider (non-racy) au lieu de currentUser synchrone
      final auth = context.read<AuthProvider>();
      if (auth.loading) return null; // Attendre la fin de l'init
      final isAuth = auth.isAuthenticated;
      final path = state.matchedLocation;
      final isAuthRoute = path.startsWith('/login') || path.startsWith('/register') ||
          path.startsWith('/otp') || path.startsWith('/forgot-password') ||
          path.startsWith('/reset-password');
      if (!isAuth && !isAuthRoute) return '/login';
      if (isAuth && isAuthRoute && !path.startsWith('/reset-password')) return '/feed';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
      GoRoute(
        path: '/otp',
        builder: (_, state) {
          final email = state.extra is String ? state.extra as String : '';
          if (email.isEmpty) return const LoginScreen();
          return OtpScreen(email: email);
        },
      ),
      GoRoute(path: '/forgot-password', builder: (_, __) => const ForgotPasswordScreen()),
      GoRoute(path: '/reset-password', builder: (_, __) => const ResetPasswordScreen()),

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
          GoRoute(path: '/saved', builder: (_, __) => const SavedPostsScreen()),
          GoRoute(path: '/trending', builder: (_, __) => const TrendingScreen()),
          GoRoute(path: '/profile/me', builder: (_, __) => const _ProfileMe()),
        ],
      ),

      // Plein écran (sans shell nav)
      GoRoute(
        path: '/profile/:username',
        builder: (_, state) => ProfileScreen(username: state.pathParameters['username']!),
      ),
      GoRoute(
        path: '/post/:postId',
        builder: (_, state) => PostDetailScreen(postId: state.pathParameters['postId']!),
      ),
      GoRoute(path: '/search', builder: (_, __) => const SearchScreen()),
    ],
  );
}

class _ProfileMe extends StatelessWidget {
  const _ProfileMe();
  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    if (auth.loading) return const Scaffold(body: Center(child: CircularProgressIndicator(strokeWidth: 2)));
    if (!auth.isAuthenticated) return const SizedBox();
    if (auth.profile?.username != null) {
      return ProfileScreen(username: auth.profile!.username);
    }
    return FutureBuilder(
      future: Supabase.instance.client.from('profiles').select('username').eq('id', auth.user!.id).single(),
      builder: (ctx, snap) {
        if (snap.hasError) return Scaffold(
          body: Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            Icon(Icons.error_outline, color: Colors.grey.shade400, size: 48),
            const SizedBox(height: 12),
            const Text('Impossible de charger le profil'),
            TextButton(onPressed: () => context.go('/feed'), child: const Text('Retour au feed')),
          ])),
        );
        if (!snap.hasData) return const Scaffold(body: Center(child: CircularProgressIndicator(color: kOrange)));
        return ProfileScreen(username: snap.data!['username'] as String);
      },
    );
  }
}
