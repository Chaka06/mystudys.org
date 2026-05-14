import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/theme_provider.dart';
import '../../widgets/app_avatar.dart';
import 'profile_editor_screen.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final themeP = context.watch<ThemeProvider>();
    final isDark = themeP.isDark;
    final p = auth.profile;

    return Scaffold(
      appBar: AppBar(title: const Text('Paramètres')),
      body: ListView(
        children: [
          // Profile card
          if (p != null)
            Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: kOrange.withOpacity(0.05),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: kOrange.withOpacity(0.2)),
              ),
              child: Row(
                children: [
                  AppAvatar(url: p.avatarUrl, initials: p.initials, size: 52),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(p.fullName, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                        Text('@${p.username}', style: TextStyle(color: Colors.grey.shade500, fontSize: 13)),
                        if (p.institution != null)
                          Text(p.institution!, style: TextStyle(color: Colors.grey.shade500, fontSize: 12)),
                      ],
                    ),
                  ),
                ],
              ),
            ),

          _Section(title: 'Apparence'),
          _SettingsTile(
            icon: isDark ? Icons.dark_mode : Icons.light_mode,
            iconColor: kOrange,
            title: 'Thème',
            subtitle: isDark ? 'Sombre' : 'Clair',
            trailing: Switch(
              value: isDark,
              onChanged: (_) => context.read<ThemeProvider>().toggle(),
              activeColor: kOrange,
            ),
          ),

          _Section(title: 'Compte'),
          _SettingsTile(
            icon: Icons.person_outline,
            title: 'Modifier le profil',
            onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfileEditorScreen())),
          ),
          _SettingsTile(
            icon: Icons.lock_outline,
            title: 'Confidentialité',
            onTap: () {},
          ),
          _SettingsTile(
            icon: Icons.notifications_outlined,
            title: 'Notifications',
            onTap: () {},
          ),

          _Section(title: 'À propos'),
          _SettingsTile(
            icon: Icons.info_outline,
            title: "À propos de STUDY'S",
            subtitle: 'Version 1.0.0',
            onTap: () {},
          ),
          _SettingsTile(
            icon: Icons.shield_outlined,
            title: 'Politique de confidentialité',
            onTap: () {},
          ),
          _SettingsTile(
            icon: Icons.description_outlined,
            title: "Conditions d'utilisation",
            onTap: () {},
          ),

          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: OutlinedButton.icon(
              onPressed: () async {
                final confirm = await showDialog<bool>(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: const Text('Déconnexion'),
                    content: const Text('Êtes-vous sûr de vouloir vous déconnecter ?'),
                    actions: [
                      TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
                      TextButton(
                        onPressed: () => Navigator.pop(ctx, true),
                        child: const Text('Déconnecter', style: TextStyle(color: Colors.red)),
                      ),
                    ],
                  ),
                );
                if (confirm == true) {
                  await auth.signOut();
                  if (context.mounted) context.go('/login');
                }
              },
              icon: const Icon(Icons.logout, color: Colors.red, size: 18),
              label: const Text('Se déconnecter', style: TextStyle(color: Colors.red)),
              style: OutlinedButton.styleFrom(
                side: BorderSide(color: Colors.red.shade300),
                minimumSize: const Size.fromHeight(48),
              ),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}

class _Section extends StatelessWidget {
  final String title;
  const _Section({required this.title});
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(16, 20, 16, 6),
    child: Text(title, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.grey.shade500, letterSpacing: 0.8)),
  );
}

class _SettingsTile extends StatelessWidget {
  final IconData icon;
  final Color? iconColor;
  final String title;
  final String? subtitle;
  final Widget? trailing;
  final VoidCallback? onTap;

  const _SettingsTile({
    required this.icon,
    this.iconColor,
    required this.title,
    this.subtitle,
    this.trailing,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) => ListTile(
    leading: Icon(icon, size: 22, color: iconColor ?? Colors.grey.shade600),
    title: Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
    subtitle: subtitle != null ? Text(subtitle!, style: TextStyle(fontSize: 12, color: Colors.grey.shade500)) : null,
    trailing: trailing ?? (onTap != null ? Icon(Icons.chevron_right, size: 18, color: Colors.grey.shade400) : null),
    onTap: onTap,
  );
}
