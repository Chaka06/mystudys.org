import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/theme.dart';
import '../../providers/auth_provider.dart';

class ProfileEditorScreen extends StatefulWidget {
  const ProfileEditorScreen({super.key});
  @override
  State<ProfileEditorScreen> createState() => _ProfileEditorScreenState();
}

class _ProfileEditorScreenState extends State<ProfileEditorScreen> {
  final _sb = Supabase.instance.client;
  late final TextEditingController _firstCtrl, _lastCtrl, _bioCtrl,
      _phoneCtrl, _cityCtrl, _websiteCtrl, _fieldCtrl, _instCtrl;
  String? _level;
  bool _isPublic = true;
  bool _saving = false;

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
  }

  Future<void> _save() async {
    final userId = _sb.auth.currentUser?.id;
    if (userId == null) return;
    setState(() => _saving = true);
    try {
      await _sb.from('profiles').update({
        'first_name': _firstCtrl.text.trim(),
        'last_name': _lastCtrl.text.trim(),
        'full_name': '${_firstCtrl.text.trim()} ${_lastCtrl.text.trim()}',
        if (_bioCtrl.text.isNotEmpty) 'bio': _bioCtrl.text.trim(),
        if (_phoneCtrl.text.isNotEmpty) 'phone': _phoneCtrl.text.trim(),
        if (_cityCtrl.text.isNotEmpty) 'city': _cityCtrl.text.trim(),
        if (_websiteCtrl.text.isNotEmpty) 'website': _websiteCtrl.text.trim(),
        if (_fieldCtrl.text.isNotEmpty) 'field_of_study': _fieldCtrl.text.trim(),
        if (_instCtrl.text.isNotEmpty) 'institution': _instCtrl.text.trim(),
        if (_level != null) 'academic_level': _level,
        'is_public': _isPublic,
      }).eq('id', userId);
      if (!mounted) return;
      await context.read<AuthProvider>().refreshProfile();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Profil mis à jour !'), backgroundColor: kGreen),
      );
      Navigator.pop(context);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erreur : $e')),
      );
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

  Widget _field(String label, TextEditingController ctrl, {int maxLines = 1, TextInputType? type}) =>
      Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: TextField(
          controller: ctrl,
          maxLines: maxLines,
          keyboardType: type,
          decoration: InputDecoration(labelText: label),
        ),
      );

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Modifier le profil')),
    body: ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const Text('Informations personnelles', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(child: _field('Prénom *', _firstCtrl)),
          const SizedBox(width: 12),
          Expanded(child: _field('Nom *', _lastCtrl)),
        ]),
        _field('Bio', _bioCtrl, maxLines: 3),
        _field('Téléphone', _phoneCtrl, type: TextInputType.phone),
        _field('Ville', _cityCtrl),
        _field('Site web', _websiteCtrl, type: TextInputType.url),
        const SizedBox(height: 8),
        const Text('Parcours académique', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
        const SizedBox(height: 12),
        _field('Filière', _fieldCtrl),
        _field('Établissement', _instCtrl),
        DropdownButtonFormField<String>(
          value: _level,
          hint: const Text('Niveau académique'),
          decoration: InputDecoration(
            filled: true,
            fillColor: Theme.of(context).inputDecorationTheme.fillColor,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
          ),
          items: _levels.map((l) => DropdownMenuItem(value: l.$1, child: Text(l.$2))).toList(),
          onChanged: (v) => setState(() => _level = v),
        ),
        const SizedBox(height: 20),
        const Text('Confidentialité', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Profil public', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
              Text('Visible par tous les utilisateurs', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
            ]),
            Switch(value: _isPublic, onChanged: (v) => setState(() => _isPublic = v), activeColor: kGreen),
          ],
        ),
        const SizedBox(height: 28),
        SizedBox(
          width: double.infinity, height: 50,
          child: ElevatedButton(
            onPressed: _saving ? null : _save,
            child: _saving
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : const Text('Sauvegarder les modifications', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
          ),
        ),
        const SizedBox(height: 20),
      ],
    ),
  );
}
