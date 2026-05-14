import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'core/theme.dart';
import 'providers/notification_provider.dart';

class AppShell extends StatefulWidget {
  final Widget child;
  const AppShell({super.key, required this.child});
  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  bool _isOnline = true;
  late StreamSubscription<List<ConnectivityResult>> _connectivitySub;

  static const _tabs = [
    (path: '/feed',          icon: Icons.home_outlined,          activeIcon: Icons.home,           label: 'Accueil'),
    (path: '/messages',      icon: Icons.chat_bubble_outline,    activeIcon: Icons.chat_bubble,    label: 'Messages'),
    (path: '/create',        icon: Icons.add_box_outlined,       activeIcon: Icons.add_box,        label: ''),
    (path: '/notifications', icon: Icons.notifications_outlined, activeIcon: Icons.notifications,  label: 'Alertes'),
    (path: '/profile/me',    icon: Icons.person_outline,         activeIcon: Icons.person,         label: 'Profil'),
  ];

  @override
  void initState() {
    super.initState();
    _connectivitySub = Connectivity().onConnectivityChanged.listen((results) {
      final online = !results.contains(ConnectivityResult.none);
      if (online != _isOnline && mounted) setState(() => _isOnline = online);
    });
  }

  @override
  void dispose() {
    _connectivitySub.cancel();
    super.dispose();
  }

  int _tabIndex(String location) {
    if (location.startsWith('/feed')) return 0;
    if (location.startsWith('/messages')) return 1;
    if (location.startsWith('/create')) return 2;
    if (location.startsWith('/notifications')) return 3;
    if (location.startsWith('/profile')) return 4;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    final index = _tabIndex(location);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Consumer<NotificationProvider>(
      builder: (context, notifProvider, _) => Stack(
        children: [
          Scaffold(
            body: widget.child,
            bottomNavigationBar: Container(
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1E2025) : Colors.white,
                border: Border(top: BorderSide(color: isDark ? const Color(0xFF2D3139) : Colors.grey.shade200)),
              ),
              child: SafeArea(
                top: false,
                child: SizedBox(
                  height: 64,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: List.generate(_tabs.length, (i) {
                      final tab = _tabs[i];
                      final isActive = i == index;
                      final isCreate = i == 2;

                      if (isCreate) {
                        return GestureDetector(
                          onTap: () => context.go(tab.path),
                          child: Container(
                            width: 48, height: 48,
                            margin: const EdgeInsets.only(bottom: 16),
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(colors: [kOrange, Color(0xFFEA580C)], begin: Alignment.topLeft, end: Alignment.bottomRight),
                              borderRadius: BorderRadius.circular(14),
                              boxShadow: [BoxShadow(color: kOrange.withValues(alpha: 0.35), blurRadius: 12, offset: const Offset(0, 4))],
                            ),
                            child: const Icon(Icons.add, color: Colors.white, size: 26),
                          ),
                        );
                      }

                      final badgeCount = tab.path == '/notifications'
                          ? notifProvider.unreadCount
                          : tab.path == '/messages'
                              ? notifProvider.unreadMessages
                              : 0;

                      return GestureDetector(
                        onTap: () => context.go(tab.path),
                        child: SizedBox(
                          width: 60,
                          child: Stack(
                            alignment: Alignment.center,
                            children: [
                              Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(isActive ? tab.activeIcon : tab.icon,
                                    color: isActive ? kOrange : Colors.grey.shade500, size: 22),
                                  const SizedBox(height: 2),
                                  if (tab.label.isNotEmpty)
                                    Text(tab.label, style: TextStyle(
                                      fontSize: 10,
                                      color: isActive ? kOrange : Colors.grey.shade500,
                                      fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
                                    )),
                                  if (isActive)
                                    Container(
                                      margin: const EdgeInsets.only(top: 2),
                                      width: 16, height: 2,
                                      decoration: BoxDecoration(color: kOrange, borderRadius: BorderRadius.circular(1)),
                                    ),
                                ],
                              ),
                              if (badgeCount > 0)
                                Positioned(
                                  top: 2, right: 8,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                    decoration: BoxDecoration(color: kOrange, borderRadius: BorderRadius.circular(8)),
                                    constraints: const BoxConstraints(minWidth: 16, minHeight: 14),
                                    child: Text(badgeCount > 99 ? '99+' : '$badgeCount',
                                      style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w700),
                                      textAlign: TextAlign.center),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      );
                    }),
                  ),
                ),
              ),
            ),
          ),

          // Bannière offline
          if (!_isOnline)
            Positioned(
              top: 0, left: 0, right: 0,
              child: SafeArea(
                bottom: false,
                child: Container(
                  color: Colors.red.shade600,
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: const Text(
                    'Pas de connexion internet',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
