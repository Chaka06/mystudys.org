import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'dart:io';
import '../../core/theme.dart';
import '../../core/constants.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/app_avatar.dart';

class CreatePostScreen extends StatefulWidget {
  const CreatePostScreen({super.key});
  @override
  State<CreatePostScreen> createState() => _CreatePostScreenState();
}

class _CreatePostScreenState extends State<CreatePostScreen> {
  final _sb = Supabase.instance.client;
  final _contentCtrl = TextEditingController();
  final _subjectCtrl = TextEditingController();
  final _profCtrl = TextEditingController();
  final _eventLocCtrl = TextEditingController();
  String _postType = 'general';
  String? _level;
  List<File> _images = [];
  bool _posting = false;

  static const _types = [
    ('general', 'Publication', Icons.edit_outlined),
    ('exam_subject', 'Sujet d\'examen', Icons.quiz_outlined),
    ('course_document', 'Document', Icons.description_outlined),
    ('event', 'Événement', Icons.event_outlined),
    ('announcement', 'Annonce', Icons.campaign_outlined),
    ('conference', 'Conférence', Icons.groups_outlined),
    ('soutenance', 'Soutenance', Icons.school_outlined),
  ];

  static const _levels = [
    ('terminale', 'Terminale'), ('bts_1', 'BTS 1'), ('bts_2', 'BTS 2'),
    ('licence_1', 'Licence 1 (L1)'), ('licence_2', 'Licence 2 (L2)'), ('licence_3', 'Licence 3 (L3)'),
    ('master_1', 'Master 1 (M1)'), ('master_2', 'Master 2 (M2)'), ('doctorat', 'Doctorat'),
  ];

  bool get _needsAcademic => _postType == 'exam_subject' || _postType == 'course_document';
  bool get _needsEvent => _postType == 'event' || _postType == 'conference' || _postType == 'soutenance';

  String get _contentHint {
    switch (_postType) {
      case 'exam_subject': return 'Décrivez ce sujet d\'examen, ajoutez des indications...';
      case 'course_document': return 'Décrivez ce document de cours...';
      case 'event': return 'Décrivez cet événement...';
      case 'announcement': return 'Rédigez votre annonce...';
      case 'conference': return 'Décrivez cette conférence...';
      case 'soutenance': return 'Informations sur la soutenance...';
      default: return 'Qu\'avez-vous à partager ?';
    }
  }

  Future<void> _pickImages() async {
    final picker = ImagePicker();
    final files = await picker.pickMultiImage(imageQuality: 80);
    if (files.isNotEmpty && mounted) {
      setState(() {
        _images = [..._images, ...files.map((x) => File(x.path))].take(5).toList();
      });
    }
  }

  Future<void> _publish() async {
    final content = _contentCtrl.text.trim();
    if (content.isEmpty && _images.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Ajoutez du contenu ou une image')));
      return;
    }
    if (_needsAcademic && _subjectCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('La matière est requise pour ce type')));
      return;
    }
    setState(() => _posting = true);
    try {
      final userId = _sb.auth.currentUser?.id;
      if (userId == null) return;

      final postData = await _sb.from('posts').insert({
        'author_id': userId,
        'content': content.isEmpty ? null : content,
        'post_type': _postType,
        'moderation_status': 'approved',
        if (_needsAcademic && _subjectCtrl.text.isNotEmpty) 'subject_name': _subjectCtrl.text.trim(),
        if (_needsAcademic && _profCtrl.text.isNotEmpty) 'professor_name': _profCtrl.text.trim(),
        if (_level != null) 'academic_level': _level,
        if (_needsEvent && _eventLocCtrl.text.isNotEmpty) 'event_location': _eventLocCtrl.text.trim(),
      }).select('id').single();

      final postId = postData['id'] as String;

      if (_images.isNotEmpty) {
        for (int i = 0; i < _images.length; i++) {
          final bytes = await _images[i].readAsBytes();
          final path = '$userId/posts/$postId/$i.jpg';
          await _sb.storage.from(AppConstants.storageBucket).uploadBinary(path, bytes);
          final url = _sb.storage.from(AppConstants.storageBucket).getPublicUrl(path);
          await _sb.from('post_media').insert({'post_id': postId, 'media_type': 'image', 'url': url, 'position': i});
        }
      }

      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur : $e')));
    } finally {
      if (mounted) setState(() => _posting = false);
    }
  }

  @override
  void dispose() {
    _contentCtrl.dispose();
    _subjectCtrl.dispose();
    _profCtrl.dispose();
    _eventLocCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardColor = isDark ? const Color(0xFF1E2025) : Colors.white;
    final dividerColor = isDark ? const Color(0xFF2D3139) : Colors.grey.shade200;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F1117) : const Color(0xFFF8F9FB),
      appBar: AppBar(
        title: const Text('Nouvelle publication'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12, top: 10, bottom: 10),
            child: ElevatedButton(
              onPressed: _posting ? null : _publish,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                minimumSize: const Size(0, 36),
              ),
              child: _posting
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Publier', style: TextStyle(fontWeight: FontWeight.w600)),
            ),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          // ── Sélecteur de type ──────────────────────────────
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: _types.map((t) {
                final isActive = _postType == t.$1;
                return GestureDetector(
                  onTap: () => setState(() => _postType = t.$1),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    margin: const EdgeInsets.only(right: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                    decoration: BoxDecoration(
                      color: isActive ? kOrange : (isDark ? const Color(0xFF2D3139) : Colors.grey.shade100),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: isActive ? kOrange : (isDark ? const Color(0xFF3D4149) : Colors.grey.shade200),
                      ),
                    ),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      Icon(t.$3, size: 14, color: isActive ? Colors.white : Colors.grey.shade600),
                      const SizedBox(width: 6),
                      Text(t.$2, style: TextStyle(
                        fontSize: 12, fontWeight: FontWeight.w600,
                        color: isActive ? Colors.white : Colors.grey.shade600,
                      )),
                    ]),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 12),

          // ── Zone de contenu principal ─────────────────────
          Container(
            decoration: BoxDecoration(
              color: cardColor,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: dividerColor),
            ),
            padding: const EdgeInsets.all(14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AppAvatar(url: auth.profile?.avatarUrl, initials: auth.profile?.initials ?? 'U', size: 40),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(auth.profile?.fullName ?? '', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _contentCtrl,
                        maxLines: null,
                        minLines: 4,
                        style: const TextStyle(fontSize: 15, height: 1.5),
                        decoration: InputDecoration(
                          hintText: _contentHint,
                          hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 14),
                          border: InputBorder.none,
                          enabledBorder: InputBorder.none,
                          focusedBorder: InputBorder.none,
                          contentPadding: EdgeInsets.zero,
                          fillColor: Colors.transparent,
                          filled: false,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // ── Champs académiques (exam_subject, course_document) ─
          if (_needsAcademic) ...[
            const SizedBox(height: 10),
            Container(
              decoration: BoxDecoration(
                color: kOrange.withValues(alpha: 0.04),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: kOrange.withValues(alpha: 0.2)),
              ),
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    const Icon(Icons.school_outlined, color: kOrange, size: 15),
                    const SizedBox(width: 6),
                    Text('Informations académiques *',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: kOrange)),
                  ]),
                  const SizedBox(height: 10),
                  // Matière
                  TextField(
                    controller: _subjectCtrl,
                    decoration: InputDecoration(
                      hintText: 'Matière *  (ex: Mathématiques, Droit...)',
                      prefixIcon: const Icon(Icons.menu_book_outlined, size: 18, color: kOrange),
                      filled: true,
                      fillColor: isDark ? const Color(0xFF2D3139) : Colors.white,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: BorderSide(color: Colors.grey.shade200),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: BorderSide(color: Colors.grey.shade200),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: kOrange, width: 1.5),
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    ),
                  ),
                  const SizedBox(height: 8),
                  // Professeur
                  TextField(
                    controller: _profCtrl,
                    decoration: InputDecoration(
                      hintText: 'Nom du professeur (optionnel)',
                      prefixIcon: Icon(Icons.person_outline, size: 18, color: Colors.grey.shade500),
                      filled: true,
                      fillColor: isDark ? const Color(0xFF2D3139) : Colors.white,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: BorderSide(color: Colors.grey.shade200),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: BorderSide(color: Colors.grey.shade200),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: kOrange, width: 1.5),
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    ),
                  ),
                  const SizedBox(height: 8),
                  // Niveau académique
                  DropdownButtonFormField<String>(
                    value: _level,
                    hint: const Text('Niveau académique', style: TextStyle(fontSize: 14)),
                    decoration: InputDecoration(
                      prefixIcon: Icon(Icons.grade_outlined, size: 18, color: Colors.grey.shade500),
                      filled: true,
                      fillColor: isDark ? const Color(0xFF2D3139) : Colors.white,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: BorderSide(color: Colors.grey.shade200),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: BorderSide(color: Colors.grey.shade200),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: kOrange, width: 1.5),
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                    ),
                    items: _levels.map((l) => DropdownMenuItem(value: l.$1, child: Text(l.$2, style: const TextStyle(fontSize: 14)))).toList(),
                    onChanged: (v) => setState(() => _level = v),
                  ),
                ],
              ),
            ),
          ],

          // ── Champs événement (event, conference, soutenance) ─
          if (_needsEvent) ...[
            const SizedBox(height: 10),
            Container(
              decoration: BoxDecoration(
                color: Colors.blue.withValues(alpha: 0.04),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.blue.withValues(alpha: 0.2)),
              ),
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    Icon(Icons.event_outlined, color: Colors.blue.shade600, size: 15),
                    const SizedBox(width: 6),
                    Text('Détails de l\'événement',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.blue.shade700)),
                  ]),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _eventLocCtrl,
                    decoration: InputDecoration(
                      hintText: 'Lieu (ex: Amphi A, UVCI, Abidjan...)',
                      prefixIcon: Icon(Icons.location_on_outlined, size: 18, color: Colors.grey.shade500),
                      filled: true,
                      fillColor: isDark ? const Color(0xFF2D3139) : Colors.white,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: BorderSide(color: Colors.grey.shade200),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: BorderSide(color: Colors.grey.shade200),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: kOrange, width: 1.5),
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    ),
                  ),
                ],
              ),
            ),
          ],

          // ── Aperçu images sélectionnées ─────────────────────
          if (_images.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              decoration: BoxDecoration(
                color: cardColor,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: dividerColor),
              ),
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('${_images.length} photo${_images.length > 1 ? 's' : ''}',
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12)),
                      TextButton(
                        onPressed: () => setState(() => _images.clear()),
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 0),
                          minimumSize: Size.zero,
                        ),
                        child: const Text('Tout supprimer', style: TextStyle(color: Colors.red, fontSize: 11)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    height: 88,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: _images.length,
                      itemBuilder: (_, i) => Stack(
                        children: [
                          Container(
                            margin: const EdgeInsets.only(right: 8),
                            width: 80, height: 80,
                            clipBehavior: Clip.antiAlias,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: dividerColor),
                            ),
                            child: Image.file(_images[i], fit: BoxFit.cover),
                          ),
                          Positioned(
                            top: 2, right: 10,
                            child: GestureDetector(
                              onTap: () => setState(() => _images.removeAt(i)),
                              child: Container(
                                width: 22, height: 22,
                                decoration: BoxDecoration(
                                  color: Colors.black.withValues(alpha: 0.6),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.close, size: 13, color: Colors.white),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],

          // ── Barre d'actions médias ──────────────────────────
          const SizedBox(height: 12),
          Container(
            decoration: BoxDecoration(
              color: cardColor,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: dividerColor),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              children: [
                _MediaBtn(
                  icon: Icons.image_outlined,
                  label: _images.isEmpty ? 'Photos' : 'Photos (${_images.length}/5)',
                  color: kGreen,
                  onTap: _images.length >= 5 ? null : _pickImages,
                ),
              ],
            ),
          ),

          // Aide
          Padding(
            padding: const EdgeInsets.fromLTRB(4, 10, 4, 20),
            child: Text(
              '⚠️  Les publications sont visibles par tous les étudiants. Respectez les règles de la communauté.',
              style: TextStyle(fontSize: 11, color: Colors.grey.shade400, height: 1.4),
            ),
          ),
        ],
      ),
    );
  }
}

class _MediaBtn extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback? onTap;
  const _MediaBtn({required this.icon, required this.label, required this.color, this.onTap});

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Opacity(
      opacity: onTap == null ? 0.4 : 1.0,
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 20, color: color),
        const SizedBox(width: 6),
        Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w600, fontSize: 13)),
      ]),
    ),
  );
}
