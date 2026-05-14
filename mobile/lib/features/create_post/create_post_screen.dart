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
  String _postType = 'general';
  String? _level;
  List<File> _images = [];
  bool _posting = false;

  static const _types = [
    ('general', 'Général', Icons.edit),
    ('exam_subject', 'Sujet d\'examen', Icons.quiz),
    ('course_document', 'Document', Icons.description),
    ('event', 'Événement', Icons.event),
    ('announcement', 'Annonce', Icons.campaign),
  ];

  static const _levels = [
    ('terminale', 'Terminale'), ('bts_1', 'BTS 1'), ('bts_2', 'BTS 2'),
    ('licence_1', 'L1'), ('licence_2', 'L2'), ('licence_3', 'L3'),
    ('master_1', 'M1'), ('master_2', 'M2'), ('doctorat', 'Doctorat'),
  ];

  Future<void> _pickImages() async {
    final picker = ImagePicker();
    final files = await picker.pickMultiImage(imageQuality: 80);
    if (files.isNotEmpty) {
      setState(() => _images = files.map((x) => File(x.path)).take(4).toList());
    }
  }

  Future<void> _publish() async {
    if (_contentCtrl.text.trim().isEmpty && _images.isEmpty) return;
    setState(() => _posting = true);

    try {
      final userId = _sb.auth.currentUser?.id;
      if (userId == null) return;

      // Create post
      final postData = await _sb.from('posts').insert({
        'author_id': userId,
        'content': _contentCtrl.text.trim().isEmpty ? null : _contentCtrl.text.trim(),
        'post_type': _postType,
        'moderation_status': 'approved',
        if (_postType == 'exam_subject' && _subjectCtrl.text.isNotEmpty) 'subject_name': _subjectCtrl.text.trim(),
        if (_postType == 'exam_subject' && _profCtrl.text.isNotEmpty) 'professor_name': _profCtrl.text.trim(),
        if (_level != null) 'academic_level': _level,
      }).select('id').single();

      final postId = postData['id'] as String;

      // Upload images
      if (_images.isNotEmpty) {
        for (int i = 0; i < _images.length; i++) {
          final bytes = await _images[i].readAsBytes();
          final path = '$userId/posts/$postId/$i.jpg';
          await _sb.storage.from(AppConstants.storageBucket).uploadBinary(path, bytes);
          final url = _sb.storage.from(AppConstants.storageBucket).getPublicUrl(path);
          await _sb.from('post_media').insert({
            'post_id': postId,
            'media_type': 'image',
            'url': url,
            'position': i,
          });
        }
      }

      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur : $e')));
      }
    } finally {
      if (mounted) setState(() => _posting = false);
    }
  }

  @override
  void dispose() {
    _contentCtrl.dispose();
    _subjectCtrl.dispose();
    _profCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Nouvelle publication'),
        leading: IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12, top: 8, bottom: 8),
            child: ElevatedButton(
              onPressed: _posting ? null : _publish,
              style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 16)),
              child: _posting
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Publier'),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Type selector
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _types.map((t) => GestureDetector(
                  onTap: () => setState(() => _postType = t.$1),
                  child: Container(
                    margin: const EdgeInsets.only(right: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                    decoration: BoxDecoration(
                      color: _postType == t.$1 ? kOrange : Colors.transparent,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: _postType == t.$1 ? kOrange : Colors.grey.shade300),
                    ),
                    child: Row(
                      children: [
                        Icon(t.$3, size: 14, color: _postType == t.$1 ? Colors.white : Colors.grey.shade600),
                        const SizedBox(width: 6),
                        Text(t.$2, style: TextStyle(fontSize: 12, color: _postType == t.$1 ? Colors.white : Colors.grey.shade600, fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ),
                )).toList(),
              ),
            ),
            const SizedBox(height: 16),

            // Author
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AppAvatar(url: auth.profile?.avatarUrl, initials: auth.profile?.initials ?? 'U', size: 40),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: _contentCtrl,
                    maxLines: null,
                    minLines: 4,
                    style: const TextStyle(fontSize: 16),
                    decoration: InputDecoration(
                      hintText: _postType == 'exam_subject'
                          ? 'Décrivez le sujet d\'examen...'
                          : 'Qu\'avez-vous à partager ?',
                      border: InputBorder.none,
                      enabledBorder: InputBorder.none,
                      focusedBorder: InputBorder.none,
                      fillColor: Colors.transparent,
                    ),
                  ),
                ),
              ],
            ),

            // Academic fields for exam_subject
            if (_postType == 'exam_subject') ...[
              const Divider(),
              TextField(
                controller: _subjectCtrl,
                decoration: const InputDecoration(
                  hintText: 'Matière (ex: Mathématiques)',
                  prefixIcon: Icon(Icons.menu_book, size: 18, color: kOrange),
                  border: InputBorder.none, enabledBorder: InputBorder.none,
                ),
              ),
              TextField(
                controller: _profCtrl,
                decoration: const InputDecoration(
                  hintText: 'Nom du professeur (optionnel)',
                  prefixIcon: Icon(Icons.person_outline, size: 18),
                  border: InputBorder.none, enabledBorder: InputBorder.none,
                ),
              ),
              DropdownButtonFormField<String>(
                value: _level,
                hint: const Text('Niveau académique'),
                decoration: const InputDecoration(
                  prefixIcon: Icon(Icons.school_outlined, size: 18),
                  border: InputBorder.none, enabledBorder: InputBorder.none,
                ),
                items: _levels.map((l) => DropdownMenuItem(value: l.$1, child: Text(l.$2))).toList(),
                onChanged: (v) => setState(() => _level = v),
              ),
            ],

            // Images preview
            if (_images.isNotEmpty) ...[
              const SizedBox(height: 12),
              SizedBox(
                height: 80,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: _images.length,
                  itemBuilder: (_, i) => Stack(
                    children: [
                      Container(
                        margin: const EdgeInsets.only(right: 8),
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(borderRadius: BorderRadius.circular(10)),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: Image.file(_images[i], fit: BoxFit.cover),
                        ),
                      ),
                      Positioned(
                        top: 2,
                        right: 10,
                        child: GestureDetector(
                          onTap: () => setState(() => _images.removeAt(i)),
                          child: Container(
                            width: 20,
                            height: 20,
                            decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                            child: const Icon(Icons.close, size: 12, color: Colors.white),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],

            const Divider(height: 32),
            Row(
              children: [
                _MediaBtn(icon: Icons.image_outlined, label: 'Photo', onTap: _pickImages),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _MediaBtn extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _MediaBtn({required this.icon, required this.label, required this.onTap});
  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Row(
      children: [
        Icon(icon, size: 22, color: kOrange),
        const SizedBox(width: 6),
        Text(label, style: const TextStyle(color: kOrange, fontWeight: FontWeight.w600, fontSize: 13)),
      ],
    ),
  );
}
