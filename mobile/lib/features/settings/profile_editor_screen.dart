import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/theme.dart';
import '../../core/constants.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/app_avatar.dart';

class ProfileEditorScreen extends StatefulWidget {
  const ProfileEditorScreen({super.key});
  @override
  State<ProfileEditorScreen> createState() => _ProfileEditorScreenState();
}

class _ProfileEditorScreenState extends State<ProfileEditorScreen> {
  final _sb = Supabase.instance.client;
  final _picker = ImagePicker();

  late final TextEditingController _firstCtrl, _lastCtrl, _bioCtrl,
      _phoneCtrl, _cityCtrl, _websiteCtrl, _fieldCtrl, _instCtrl;
  String? _level;
  bool _isPublic = true;
  bool _saving = false;

  // Photos
  File? _avatarFile;
  File? _coverFile;
  String? _avatarPreviewUrl;
  String? _coverPreviewUrl;
  bool _uploadingAvatar = false;
  bool _uploadingCover = false;

  static const _levels = [
    ('terminale', 'Terminale'), ('bts_1', 'BTS 1'), ('bts_2', 'BTS 2'),
    ('licence_1', 'Licence 1'), ('licence_2', 'Licence 2'), ('licence_3', 'Licence 3'),
    ('master_1', 'Master 1'), ('master_2', 'Master 2'), ('doctorat', 'Doctorat'),
  ];

  @override
  void initState() {
    super.initState();
    final p = context.read<AuthProvider>().profile;
    _firstCtrl = TextEditingController(text: p?.firstName ?? '');
    _lastCtrl = TextEditingController(text: p?.fullName.replaceFirst(p.firstName, '').trim() ?? '');
    _bioCtrl = TextEditingController(text: p?.bio ?? '');
    _phoneCtrl = TextEditingController(text: p?.phone ?? '');
    _cityCtrl = TextEditingController(text: p?.city ?? '');
    _websiteCtrl = TextEditingController(text: p?.website ?? '');
    _fieldCtrl = TextEditingController(text: p?.fieldOfStudy ?? '');
    _instCtrl = TextEditingController(text: p?.institution ?? '');
    _level = p?.academicLevel;
    _isPublic = p?.isPublic ?? true;
    _avatarPreviewUrl = p?.avatarUrl;
    _coverPreviewUrl = p?.coverUrl;
  }

  Future<void> _pickAvatar() async {
    final file = await _picker.pickImage(source: ImageSource.gallery, imageQuality: 85, maxWidth: 800);
    if (file == null) return;
    setState(() { _avatarFile = File(file.path); _uploadingAvatar = true; });
    try {
      final userId = _sb.auth.currentUser?.id ?? '';
      final bytes = await _avatarFile!.readAsBytes();
      final path = '$userId/avatar_${DateTime.now().millisecondsSinceEpoch}.jpg';
      await _sb.storage.from('avatars').uploadBinary(path, bytes, fileOptions: const FileOptions(upsert: true, contentType: 'image/jpeg'));
      final url = _sb.storage.from('avatars').getPublicUrl(path);
      if (mounted) setState(() { _avatarPreviewUrl = url; _uploadingAvatar = false; });
    } catch (_) {
      if (mounted) setState(() { _avatarFile = null; _uploadingAvatar = false; });
    }
  }

  Future<void> _pickCover() async {
    final file = await _picker.pickImage(source: ImageSource.gallery, imageQuality: 85, maxWidth: 1200);
    if (file == null) return;
    setState(() { _coverFile = File(file.path); _uploadingCover = true; });
    try {
      final userId = _sb.auth.currentUser?.id ?? '';
      final bytes = await _coverFile!.readAsBytes();
      final path = '$userId/cover_${DateTime.now().millisecondsSinceEpoch}.jpg';
      await _sb.storage.from(AppConstants.storageBucket).uploadBinary(path, bytes, fileOptions: const FileOptions(upsert: true, contentType: 'image/jpeg'));
      final url = _sb.storage.from(AppConstants.storageBucket).getPublicUrl(path);
      if (mounted) setState(() { _coverPreviewUrl = url; _uploadingCover = false; });
    } catch (_) {
      if (mounted) setState(() { _coverFile = null; _uploadingCover = false; });
    }
  }

  Future<void> _save() async {
    final userId = _sb.auth.currentUser?.id;
    if (userId == null) return;
    if (_firstCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Le prénom est requis')));
      return;
    }
    setState(() => _saving = true);
    try {
      await _sb.from('profiles').update({
        'first_name': _firstCtrl.text.trim(),
        'last_name': _lastCtrl.text.trim(),
        'full_name': '${_firstCtrl.text.trim()} ${_lastCtrl.text.trim()}'.trim(),
        if (_bioCtrl.text.isNotEmpty) 'bio': _bioCtrl.text.trim() else 'bio': null,
        if (_phoneCtrl.text.isNotEmpty) 'phone': _phoneCtrl.text.trim() else 'phone': null,
        if (_cityCtrl.text.isNotEmpty) 'city': _cityCtrl.text.trim() else 'city': null,
        if (_websiteCtrl.text.isNotEmpty) 'website': _websiteCtrl.text.trim() else 'website': null,
        if (_fieldCtrl.text.isNotEmpty) 'field_of_study': _fieldCtrl.text.trim() else 'field_of_study': null,
        if (_instCtrl.text.isNotEmpty) 'institution': _instCtrl.text.trim() else 'institution': null,
        'academic_level': _level,
        'is_public': _isPublic,
        if (_avatarPreviewUrl != null) 'avatar_url': _avatarPreviewUrl,
        if (_coverPreviewUrl != null) 'cover_url': _coverPreviewUrl,
      }).eq('id', userId);
      if (!mounted) return;
      await context.read<AuthProvider>().refreshProfile();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Profil mis à jour !'), backgroundColor: kGreen),
      );
      Navigator.pop(context);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur : $e')));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  void dispose() {
    for (final c in [_firstCtrl, _lastCtrl, _bioCtrl, _phoneCtrl, _cityCtrl, _websiteCtrl, _fieldCtrl, _instCtrl]) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? const Color(0xFF0F1117) : const Color(0xFFF8F9FB);
    final cardBg = isDark ? const Color(0xFF1E2025) : Colors.white;
    final border = isDark ? const Color(0xFF2D3139) : Colors.grey.shade200;

    return Scaffold(
      backgroundColor: bg,
      appBar: AppBar(
        title: const Text('Modifier le profil'),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12, top: 10, bottom: 10),
            child: ElevatedButton(
              onPressed: (_saving || _uploadingAvatar || _uploadingCover) ? null : _save,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                minimumSize: const Size(0, 36),
              ),
              child: _saving
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Sauvegarder', style: TextStyle(fontWeight: FontWeight.w600)),
            ),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [

          // ── Photos (cover + avatar) ───────────────────────
          Container(
            decoration: BoxDecoration(color: cardBg, borderRadius: BorderRadius.circular(16), border: Border.all(color: border)),
            clipBehavior: Clip.antiAlias,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Cover photo
                GestureDetector(
                  onTap: _pickCover,
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      // Image cover
                      Container(
                        height: 140,
                        width: double.infinity,
                        color: isDark ? const Color(0xFF2D3139) : Colors.grey.shade100,
                        child: _coverFile != null
                            ? Image.file(_coverFile!, fit: BoxFit.cover)
                            : _coverPreviewUrl != null
                                ? Image.network(_coverPreviewUrl!, fit: BoxFit.cover, errorBuilder: (_, __, ___) => _coverPlaceholder())
                                : _coverPlaceholder(),
                      ),
                      // Overlay modifier
                      Container(
                        height: 140,
                        width: double.infinity,
                        color: Colors.black.withValues(alpha: 0.3),
                        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                          if (_uploadingCover)
                            const CircularProgressIndicator(color: Colors.white, strokeWidth: 2)
                          else ...[
                            const Icon(Icons.camera_alt, color: Colors.white, size: 28),
                            const SizedBox(height: 6),
                            const Text('Changer la photo de couverture',
                              style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
                          ],
                        ]),
                      ),
                    ],
                  ),
                ),

                // Avatar + bouton modifier
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                  child: Row(
                    children: [
                      // Avatar cliquable
                      GestureDetector(
                        onTap: _pickAvatar,
                        child: Stack(
                          children: [
                            Container(
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(color: border, width: 3),
                              ),
                              child: ClipOval(
                                child: SizedBox(
                                  width: 72, height: 72,
                                  child: _avatarFile != null
                                      ? Image.file(_avatarFile!, fit: BoxFit.cover)
                                      : _avatarPreviewUrl != null
                                          ? Image.network(_avatarPreviewUrl!, fit: BoxFit.cover, errorBuilder: (_, __, ___) => _avatarFallback())
                                          : _avatarFallback(),
                                ),
                              ),
                            ),
                            // Badge caméra
                            Positioned(
                              bottom: 0, right: 0,
                              child: Container(
                                width: 26, height: 26,
                                decoration: BoxDecoration(
                                  color: _uploadingAvatar ? Colors.grey : kOrange,
                                  shape: BoxShape.circle,
                                  border: Border.all(color: cardBg, width: 2),
                                ),
                                child: _uploadingAvatar
                                    ? const Padding(padding: EdgeInsets.all(5), child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                    : const Icon(Icons.camera_alt, color: Colors.white, size: 14),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          const Text('Photo de profil', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                          Text('JPG ou PNG · Max 5MB',
                            style: TextStyle(color: Colors.grey.shade500, fontSize: 12)),
                          const SizedBox(height: 6),
                          OutlinedButton.icon(
                            onPressed: _uploadingAvatar ? null : _pickAvatar,
                            icon: const Icon(Icons.photo_library_outlined, size: 15),
                            label: const Text('Choisir une photo', style: TextStyle(fontSize: 12)),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              minimumSize: const Size(0, 32),
                            ),
                          ),
                        ]),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // ── Informations personnelles ──────────────────────
          _SectionLabel('Informations personnelles'),
          Container(
            decoration: BoxDecoration(color: cardBg, borderRadius: BorderRadius.circular(14), border: Border.all(color: border)),
            padding: const EdgeInsets.all(14),
            child: Column(children: [
              Row(children: [
                Expanded(child: _TextField(ctrl: _firstCtrl, label: 'Prénom *')),
                const SizedBox(width: 10),
                Expanded(child: _TextField(ctrl: _lastCtrl, label: 'Nom')),
              ]),
              const SizedBox(height: 10),
              _TextField(ctrl: _bioCtrl, label: 'Bio', maxLines: 3, hint: 'Parlez de vous en quelques mots...'),
              const SizedBox(height: 10),
              _TextField(ctrl: _phoneCtrl, label: 'Téléphone', type: TextInputType.phone, hint: '+225 07 00 00 00 00'),
              const SizedBox(height: 10),
              _TextField(ctrl: _cityCtrl, label: 'Ville', hint: 'Abidjan, Bouaké...'),
              const SizedBox(height: 10),
              _TextField(ctrl: _websiteCtrl, label: 'Site web', type: TextInputType.url, hint: 'https://...'),
            ]),
          ),
          const SizedBox(height: 16),

          // ── Parcours académique ────────────────────────────
          _SectionLabel('Parcours académique'),
          Container(
            decoration: BoxDecoration(color: cardBg, borderRadius: BorderRadius.circular(14), border: Border.all(color: border)),
            padding: const EdgeInsets.all(14),
            child: Column(children: [
              _TextField(ctrl: _fieldCtrl, label: 'Filière', hint: 'Informatique, Droit, Médecine...'),
              const SizedBox(height: 10),
              _TextField(ctrl: _instCtrl, label: 'Établissement', hint: 'UVCI, INPHB, UGECI...'),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                value: _level,
                hint: const Text('Niveau académique', style: TextStyle(fontSize: 14)),
                decoration: InputDecoration(
                  labelText: 'Niveau académique',
                  filled: true,
                  fillColor: isDark ? const Color(0xFF2D3139) : Colors.grey.shade50,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: border)),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: border)),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kOrange, width: 1.5)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
                items: _levels.map((l) => DropdownMenuItem(value: l.$1, child: Text(l.$2, style: const TextStyle(fontSize: 14)))).toList(),
                onChanged: (v) => setState(() => _level = v),
              ),
            ]),
          ),
          const SizedBox(height: 16),

          // ── Confidentialité ────────────────────────────────
          _SectionLabel('Confidentialité'),
          Container(
            decoration: BoxDecoration(color: cardBg, borderRadius: BorderRadius.circular(14), border: Border.all(color: border)),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Profil public', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                  Text('Visible par tous les utilisateurs',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                ]),
                Switch(value: _isPublic, onChanged: (v) => setState(() => _isPublic = v), activeColor: kGreen),
              ],
            ),
          ),
          const SizedBox(height: 28),
        ],
      ),
    );
  }

  Widget _coverPlaceholder() => Container(
    color: kOrange.withValues(alpha: 0.15),
    child: const Center(child: Icon(Icons.image_outlined, size: 36, color: kOrange)),
  );

  Widget _avatarFallback() {
    final p = context.read<AuthProvider>().profile;
    return Container(
      color: kOrange.withValues(alpha: 0.15),
      child: Center(child: Text(p?.initials ?? 'U',
        style: const TextStyle(color: kOrange, fontWeight: FontWeight.w700, fontSize: 24))),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(left: 4, bottom: 8),
    child: Text(text, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.grey.shade500, letterSpacing: 0.8)),
  );
}

class _TextField extends StatelessWidget {
  final TextEditingController ctrl;
  final String label;
  final String? hint;
  final int maxLines;
  final TextInputType? type;
  const _TextField({required this.ctrl, required this.label, this.hint, this.maxLines = 1, this.type});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final borderColor = isDark ? const Color(0xFF2D3139) : Colors.grey.shade200;
    return TextField(
      controller: ctrl,
      maxLines: maxLines,
      keyboardType: type,
      style: const TextStyle(fontSize: 14),
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        filled: true,
        fillColor: isDark ? const Color(0xFF2D3139) : Colors.grey.shade50,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: borderColor)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: borderColor)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: kOrange, width: 1.5)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      ),
    );
  }
}
