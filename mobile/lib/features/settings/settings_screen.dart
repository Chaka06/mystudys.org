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
    final bg = isDark ? const Color(0xFF0F1117) : const Color(0xFFF8F9FB);
    final cardBg = isDark ? const Color(0xFF1E2025) : Colors.white;
    final border = isDark ? const Color(0xFF2D3139) : Colors.grey.shade200;

    return Scaffold(
      backgroundColor: bg,
      appBar: AppBar(
        title: const Text('Paramètres'),
        backgroundColor: isDark ? const Color(0xFF1E2025) : Colors.white,
        surfaceTintColor: Colors.transparent,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [

          // ── Carte profil ──────────────────────────────────
          if (p != null) ...[
            GestureDetector(
              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfileEditorScreen())),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: cardBg,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: border),
                ),
                child: Row(
                  children: [
                    AppAvatar(url: p.avatarUrl, initials: p.initials, size: 56),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(children: [
                            Flexible(child: Text(p.fullName, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16))),
                            if (p.isVerified) ...[const SizedBox(width: 6), const Icon(Icons.verified, color: kOrange, size: 15)],
                          ]),
                          Text('@${p.username}', style: TextStyle(color: Colors.grey.shade500, fontSize: 12)),
                          if (p.institution != null)
                            Text(p.institution!, style: TextStyle(color: Colors.grey.shade500, fontSize: 11)),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: kOrange.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text('Modifier', style: TextStyle(color: kOrange, fontSize: 12, fontWeight: FontWeight.w600)),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),
          ],

          // ── Apparence ─────────────────────────────────────
          _SectionLabel('Apparence'),
          Container(
            decoration: BoxDecoration(color: cardBg, borderRadius: BorderRadius.circular(14), border: Border.all(color: border)),
            child: _Tile(
              icon: isDark ? Icons.dark_mode_outlined : Icons.light_mode_outlined,
              iconBg: const Color(0xFFF97316),
              title: 'Thème',
              subtitle: isDark ? 'Mode sombre activé' : 'Mode clair activé',
              trailing: Switch(
                value: isDark,
                onChanged: (_) => context.read<ThemeProvider>().toggle(),
                activeColor: kOrange,
              ),
            ),
          ),
          const SizedBox(height: 20),

          // ── Compte ────────────────────────────────────────
          _SectionLabel('Compte'),
          Container(
            decoration: BoxDecoration(color: cardBg, borderRadius: BorderRadius.circular(14), border: Border.all(color: border)),
            child: Column(
              children: [
                _Tile(
                  icon: Icons.person_outline,
                  iconBg: Colors.blue,
                  title: 'Modifier le profil',
                  subtitle: 'Nom, bio, photo, établissement...',
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfileEditorScreen())),
                ),
                _divider(border),
                _Tile(
                  icon: Icons.bookmark_outline,
                  iconBg: kOrange,
                  title: 'Publications sauvegardées',
                  subtitle: 'Vos posts mis en favoris',
                  onTap: () => context.go('/saved'),
                ),
                _divider(border),
                _Tile(
                  icon: Icons.trending_up,
                  iconBg: Colors.purple,
                  title: 'Tendances',
                  subtitle: 'Les publications les plus populaires',
                  onTap: () => context.go('/trending'),
                ),
                _divider(border),
                _Tile(
                  icon: Icons.people_outline,
                  iconBg: kGreen,
                  title: 'Amis',
                  subtitle: 'Gérer vos connexions',
                  onTap: () => context.go('/friends'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // ── Notifications ──────────────────────────────────
          _SectionLabel('Notifications'),
          Container(
            decoration: BoxDecoration(color: cardBg, borderRadius: BorderRadius.circular(14), border: Border.all(color: border)),
            child: _Tile(
              icon: Icons.notifications_outlined,
              iconBg: Colors.red,
              title: 'Notifications',
              subtitle: 'Gérer les alertes',
              onTap: () => context.go('/notifications'),
            ),
          ),
          const SizedBox(height: 20),

          // ── À propos ──────────────────────────────────────
          _SectionLabel('À propos'),
          Container(
            decoration: BoxDecoration(color: cardBg, borderRadius: BorderRadius.circular(14), border: Border.all(color: border)),
            child: Column(
              children: [
                _Tile(
                  icon: Icons.info_outline,
                  iconBg: Colors.teal,
                  title: "À propos de STUDY'S",
                  subtitle: 'Version 1.0.0 • Made in Côte d\'Ivoire 🇨🇮',
                  onTap: () => _showAbout(context),
                ),
                _divider(border),
                _Tile(
                  icon: Icons.shield_outlined,
                  iconBg: Colors.indigo,
                  title: 'Politique de confidentialité',
                  onTap: () {},
                ),
                _divider(border),
                _Tile(
                  icon: Icons.description_outlined,
                  iconBg: Colors.orange,
                  title: "Conditions d'utilisation",
                  onTap: () {},
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // ── Déconnexion ────────────────────────────────────
          Container(
            decoration: BoxDecoration(
              color: cardBg,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.red.withValues(alpha: 0.2)),
            ),
            child: ListTile(
              leading: Container(
                width: 36, height: 36,
                decoration: BoxDecoration(color: Colors.red.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                child: const Icon(Icons.logout, size: 20, color: Colors.red),
              ),
              title: const Text('Se déconnecter', style: TextStyle(color: Colors.red, fontWeight: FontWeight.w600, fontSize: 14)),
              subtitle: Text('Quitter votre session', style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
              trailing: Icon(Icons.chevron_right, size: 18, color: Colors.red.shade300),
              onTap: () async {
                final confirm = await showDialog<bool>(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    title: const Text('Se déconnecter ?', style: TextStyle(fontWeight: FontWeight.w700)),
                    content: const Text('Vous devrez vous reconnecter pour accéder à votre compte.'),
                    actions: [
                      TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
                      ElevatedButton(
                        onPressed: () => Navigator.pop(ctx, true),
                        style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
                        child: const Text('Déconnecter'),
                      ),
                    ],
                  ),
                );
                if (confirm == true) {
                  await auth.signOut();
                  if (context.mounted) context.go('/login');
                }
              },
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _divider(Color color) => Divider(height: 1, indent: 60, color: color);

  void _showAbout(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text("STUDY'S", style: TextStyle(fontWeight: FontWeight.w800, color: kOrange)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Le premier réseau social étudiant ivoirien.', style: TextStyle(height: 1.5)),
            const SizedBox(height: 12),
            Text('Version 1.0.0', style: TextStyle(color: Colors.grey.shade500, fontSize: 12)),
            Text('Made with ❤️ in Abidjan', style: TextStyle(color: Colors.grey.shade500, fontSize: 12)),
          ],
        ),
        actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Fermer'))],
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(left: 4, bottom: 8),
    child: Text(text.toUpperCase(), style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.grey.shade500, letterSpacing: 0.8)),
  );
}

class _Tile extends StatelessWidget {
  final IconData icon;
  final Color iconBg;
  final String title;
  final String? subtitle;
  final Widget? trailing;
  final VoidCallback? onTap;

  const _Tile({
    required this.icon,
    required this.iconBg,
    required this.title,
    this.subtitle,
    this.trailing,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) => ListTile(
    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
    leading: Container(
      width: 36, height: 36,
      decoration: BoxDecoration(color: iconBg.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(10)),
      child: Icon(icon, size: 20, color: iconBg),
    ),
    title: Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
    subtitle: subtitle != null ? Text(subtitle!, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)) : null,
    trailing: trailing ?? (onTap != null ? Icon(Icons.chevron_right, size: 18, color: Colors.grey.shade400) : null),
    onTap: onTap,
  );
}
