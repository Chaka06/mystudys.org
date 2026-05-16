import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:timeago/timeago.dart' as timeago;
import 'package:http/http.dart' as http;
import 'package:image_gallery_saver/image_gallery_saver.dart';
import 'package:permission_handler/permission_handler.dart';
import '../models/models.dart';
import '../core/theme.dart';
import 'app_avatar.dart';
import '../features/profile/profile_screen.dart';
import 'comment_thread.dart';
import '../features/pdf_viewer/pdf_viewer_screen.dart';

// Wrapper pour naviguer vers ProfileScreen depuis PostCard
// (évite l'import circulaire — PostCard est utilisé dans ProfileScreen)
class _ProfileScreenWrapper extends StatelessWidget {
  final String username;
  const _ProfileScreenWrapper({required this.username});
  @override
  Widget build(BuildContext context) => ProfileScreen(username: username);
}

class PostCard extends StatefulWidget {
  final Post post;
  final VoidCallback? onTap;
  final VoidCallback? onDeleted;

  const PostCard({super.key, required this.post, this.onTap, this.onDeleted});

  @override
  State<PostCard> createState() => _PostCardState();
}

class _PostCardState extends State<PostCard> {
  late bool _liked;
  late int _likeCount;
  late bool _saved;
  bool _liking = false;
  bool _showComments = false;
  final _sb = Supabase.instance.client;

  @override
  void initState() {
    super.initState();
    _liked = widget.post.likedByUser;
    _likeCount = widget.post.likeCount;
    _saved = widget.post.savedByUser;
  }

  @override
  void didUpdateWidget(PostCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Resync si le post change (refresh du feed) sans changer de widget
    if (oldWidget.post.id != widget.post.id) {
      _liked = widget.post.likedByUser;
      _likeCount = widget.post.likeCount;
      _saved = widget.post.savedByUser;
    }
  }

  Future<void> _toggleLike() async {
    if (_liking) return;
    final userId = _sb.auth.currentUser?.id;
    if (userId == null) return;
    final oldLiked = _liked;
    final oldCount = _likeCount; // Sauvegarde exacte du compteur
    setState(() { _liking = true; _liked = !_liked; _likeCount += _liked ? 1 : -1; });
    try {
      if (_liked) {
        await _sb.from('post_likes').insert({'post_id': widget.post.id, 'user_id': userId});
      } else {
        await _sb.from('post_likes').delete().eq('post_id', widget.post.id).eq('user_id', userId);
      }
    } catch (_) {
      // Restaurer EXACTEMENT l'état précédent
      if (mounted) setState(() { _liked = oldLiked; _likeCount = oldCount; });
    } finally {
      if (mounted) setState(() => _liking = false);
    }
  }

  Future<void> _toggleSave() async {
    final userId = _sb.auth.currentUser?.id;
    if (userId == null) return;
    setState(() => _saved = !_saved);
    try {
      if (_saved) {
        await _sb.from('post_saves').insert({'post_id': widget.post.id, 'user_id': userId});
      } else {
        await _sb.from('post_saves').delete().eq('post_id', widget.post.id).eq('user_id', userId);
      }
    } catch (_) {
      setState(() => _saved = !_saved);
    }
  }

  String _postTypeLabel(String type) {
    switch (type) {
      case 'exam_subject': return 'Sujet d\'examen';
      case 'course_document': return 'Document';
      case 'event': return 'Événement';
      case 'announcement': return 'Annonce';
      case 'conference': return 'Conférence';
      case 'soutenance': return 'Soutenance';
      default: return '';
    }
  }

  (Color, Color) _postTypeColors(String type) {
    switch (type) {
      case 'exam_subject': return (kOrange.withValues(alpha: 0.1), kOrange);
      case 'course_document': return (kGreen.withValues(alpha: 0.1), kGreen);
      case 'event': return (Colors.blue.withValues(alpha: 0.1), Colors.blue.shade700);
      case 'announcement': return (Colors.purple.withValues(alpha: 0.1), Colors.purple.shade700);
      case 'conference': return (Colors.indigo.withValues(alpha: 0.1), Colors.indigo.shade700);
      case 'soutenance': return (Colors.pink.withValues(alpha: 0.1), Colors.pink.shade700);
      default: return (Colors.grey.shade100, Colors.grey.shade600);
    }
  }

  String _formatEventDate(String iso) {
    final dt = DateTime.parse(iso).toLocal();
    const months = ['jan.','fév.','mar.','avr.','mai','juin','juil.','aoû.','sep.','oct.','nov.','déc.'];
    return '${dt.day} ${months[dt.month-1]} ${dt.year} à ${dt.hour.toString().padLeft(2,'0')}:${dt.minute.toString().padLeft(2,'0')}';
  }

  @override
  Widget build(BuildContext context) {
    final post = widget.post;
    final author = post.author;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardBg = isDark ? const Color(0xFF1E2025) : Colors.white;
    final border = isDark ? const Color(0xFF2D3139) : const Color(0xFFE5E7EB);
    final images = post.media.where((m) => m.mediaType == 'image').toList();
    final isOwner = _sb.auth.currentUser?.id == post.authorId;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 0, vertical: 4),
      decoration: BoxDecoration(
        color: cardBg,
        border: Border.all(color: border),
        borderRadius: BorderRadius.circular(16),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Header ──────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 14, 14, 10),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                GestureDetector(
                  onTap: () {
                    if (author?.username != null) {
                      Navigator.of(context, rootNavigator: true).push(MaterialPageRoute(
                        builder: (_) => _ProfileScreenWrapper(username: author!.username),
                      ));
                    }
                  },
                  child: AppAvatar(url: author?.avatarUrl, initials: author?.initials ?? 'U', size: 40),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      GestureDetector(
                        onTap: () {
                          if (author?.username != null) {
                            Navigator.of(context, rootNavigator: true).push(MaterialPageRoute(
                              builder: (_) => _ProfileScreenWrapper(username: author!.username),
                            ));
                          }
                        },
                        child: Row(children: [
                          Flexible(
                            child: Text(author?.fullName ?? 'Utilisateur',
                              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                              overflow: TextOverflow.ellipsis),
                          ),
                          if (author?.isVerified == true) ...[
                            const SizedBox(width: 4),
                            const Icon(Icons.verified, color: kOrange, size: 14),
                          ],
                        ]),
                      ),
                      const SizedBox(height: 1),
                      Text(
                        [
                          timeago.format(DateTime.parse(post.createdAt), locale: 'fr'),
                          if (author?.institution != null) author!.institution!,
                        ].join(' · '),
                        style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                if (post.postType != 'general') ...[
                  const SizedBox(width: 8),
                  Builder(builder: (_) {
                    final colors = _postTypeColors(post.postType);
                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(color: colors.$1, borderRadius: BorderRadius.circular(8)),
                      child: Text(_postTypeLabel(post.postType),
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: colors.$2)),
                    );
                  }),
                ],
                // Menu 3-points
                PopupMenuButton<String>(
                  icon: Icon(Icons.more_horiz, size: 18, color: Colors.grey.shade400),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  itemBuilder: (_) => [
                    if (isOwner) PopupMenuItem(value: 'delete', child: Row(children: [
                      Icon(Icons.delete_outline, size: 16, color: Colors.red.shade500),
                      const SizedBox(width: 8),
                      Text('Supprimer', style: TextStyle(color: Colors.red.shade500, fontSize: 13)),
                    ])),
                    const PopupMenuItem(value: 'report', child: Row(children: [
                      Icon(Icons.flag_outlined, size: 16),
                      SizedBox(width: 8),
                      Text('Signaler', style: TextStyle(fontSize: 13)),
                    ])),
                  ],
                  onSelected: (v) async {
                    if (v == 'delete') {
                      final confirm = await showDialog<bool>(
                        context: context,
                        builder: (ctx) => AlertDialog(
                          title: const Text('Supprimer ?'),
                          content: const Text('Cette publication sera supprimée définitivement.'),
                          actions: [
                            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
                            TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Supprimer', style: TextStyle(color: Colors.red))),
                          ],
                        ),
                      );
                      if (confirm == true && mounted) {
                        await _sb.from('posts').update({'is_deleted': true}).eq('id', post.id).eq('author_id', _sb.auth.currentUser?.id ?? '');
                        widget.onDeleted?.call();
                      }
                    } else if (v == 'report') {
                      await _sb.from('post_reports').insert({'post_id': post.id, 'reporter_id': _sb.auth.currentUser?.id, 'reason': 'Contenu inapproprié'});
                      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Publication signalée, merci !')));
                    }
                  },
                ),
              ],
            ),
          ),

          // ── Métadonnées académiques ──────────────────────────
          if (post.subjectName != null || post.professorName != null || post.academicLevel != null)
            Container(
              margin: const EdgeInsets.fromLTRB(14, 0, 14, 10),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: kOrange.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: kOrange.withValues(alpha: 0.2)),
              ),
              child: Wrap(
                spacing: 12, runSpacing: 4,
                children: [
                  if (post.subjectName != null)
                    Row(mainAxisSize: MainAxisSize.min, children: [
                      const Icon(Icons.menu_book, color: kOrange, size: 13),
                      const SizedBox(width: 4),
                      Text(post.subjectName!, style: const TextStyle(fontSize: 12, color: kOrange, fontWeight: FontWeight.w600)),
                    ]),
                  if (post.professorName != null)
                    Text('Pr. ${post.professorName}', style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                ],
              ),
            ),

          // ── Métadonnées événement ─────────────────────────────
          if (post.postType == 'event' && (post.eventDate != null || post.eventLocation != null))
            Container(
              margin: const EdgeInsets.fromLTRB(14, 0, 14, 10),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.blue.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.blue.withValues(alpha: 0.2)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (post.eventDate != null) Row(children: [
                    Icon(Icons.event, color: Colors.blue.shade600, size: 13),
                    const SizedBox(width: 4),
                    Flexible(child: Text(_formatEventDate(post.eventDate!),
                      style: TextStyle(fontSize: 12, color: Colors.blue.shade700))),
                  ]),
                  if (post.eventLocation != null) ...[
                    const SizedBox(height: 3),
                    Row(children: [
                      Icon(Icons.location_on, color: Colors.grey.shade500, size: 13),
                      const SizedBox(width: 4),
                      Flexible(child: Text(post.eventLocation!,
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade500))),
                    ]),
                  ],
                ],
              ),
            ),

          // ── Contenu texte ─────────────────────────────────────
          if (post.content != null && post.content!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 10),
              child: Text(post.content!, softWrap: true, style: const TextStyle(fontSize: 14, height: 1.5)),
            ),

          // ── PDF card (style LinkedIn) ────────────────────────
          ...post.media.where((m) => m.mediaType == 'pdf').map((pdf) =>
            _PdfCard(pdf: pdf, isDark: isDark)),

          // ── Images avec lightbox ─────────────────────────────
          if (images.isNotEmpty)
            _ImageGrid(
              images: images,
              onTap: (index) => Navigator.of(context, rootNavigator: true).push(MaterialPageRoute(
                builder: (_) => _ImageLightbox(images: images.map((i) => i.url).toList(), initialIndex: index),
                fullscreenDialog: true,
              )),
            ),

          // ── Actions ───────────────────────────────────────────
          Container(
            padding: const EdgeInsets.fromLTRB(6, 6, 10, 10),
            decoration: BoxDecoration(
              border: Border(top: BorderSide(color: isDark ? const Color(0xFF2D3139) : Colors.grey.shade100)),
            ),
            child: Row(
              children: [
                _ActionBtn(
                  icon: _liked ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                  iconColor: _liked ? Colors.red : null,
                  label: _likeCount > 0 ? _likeCount.toString() : '',
                  onTap: _toggleLike,
                  hoverColor: Colors.red.shade50,
                ),
                _ActionBtn(
                  icon: Icons.chat_bubble_outline_rounded,
                  label: post.commentCount > 0 ? post.commentCount.toString() : '',
                  onTap: () => setState(() => _showComments = !_showComments),
                  hoverColor: kOrange.withValues(alpha: 0.1),
                ),
                _ActionBtn(
                  icon: Icons.share_outlined,
                  hoverColor: kGreen.withValues(alpha: 0.1),
                  onTap: () async {
                    const baseUrl = 'https://www.mystudys.org/post/';
                    await Clipboard.setData(ClipboardData(text: '$baseUrl${widget.post.id}'));
                    if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Lien copié !'), duration: Duration(seconds: 2)),
                    );
                  },
                ),
                const Spacer(),
                GestureDetector(
                  onTap: _toggleSave,
                  child: Padding(
                    padding: const EdgeInsets.all(8),
                    child: Icon(
                      _saved ? Icons.bookmark_rounded : Icons.bookmark_border_rounded,
                      size: 20,
                      color: _saved ? kOrange : Colors.grey.shade400,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // ── Commentaires (expandable) ─────────────────────────
          if (_showComments) _CommentSection(postId: post.id),
        ],
      ),
    );
  }
}

class _ActionBtn extends StatelessWidget {
  final IconData icon;
  final Color? iconColor;
  final String label;
  final VoidCallback? onTap;
  final Color? hoverColor;

  const _ActionBtn({required this.icon, this.iconColor, this.label = '', this.onTap, this.hoverColor});

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(10)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 19, color: iconColor ?? Colors.grey.shade500),
        if (label.isNotEmpty) ...[
          const SizedBox(width: 5),
          Text(label, style: TextStyle(fontSize: 13, color: Colors.grey.shade500)),
        ],
      ]),
    ),
  );
}

// ─── Carte PDF style LinkedIn ─────────────────────────────────────────────────

class _PdfCard extends StatelessWidget {
  final PostMedia pdf;
  final bool isDark;
  const _PdfCard({required this.pdf, required this.isDark});

  String get _name => (pdf.fileName ?? 'Document PDF').replaceAll(RegExp(r'\.[^/.]+$'), '');
  String? get _size => pdf.fileSize != null ? '${(pdf.fileSize! / 1024 / 1024).toStringAsFixed(1)} MB' : null;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      // Ouvre le PDF in-app (plus de navigateur externe)
      onTap: () => Navigator.of(context, rootNavigator: true).push(MaterialPageRoute(
        builder: (_) => PdfViewerScreen(url: pdf.url, title: _name),
        fullscreenDialog: true,
      )),
      child: Container(
        margin: const EdgeInsets.fromLTRB(14, 0, 14, 10),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isDark ? const Color(0xFF2D3139) : Colors.grey.shade300),
          color: isDark ? const Color(0xFF2D3139) : const Color(0xFFF8F9FA),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          children: [
            // Zone aperçu avec dégradé rouge bien visible
            Container(
              height: 130,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [Colors.red.shade700, Colors.red.shade400],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 60, height: 60,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: const Icon(Icons.picture_as_pdf, color: Colors.white, size: 34),
                    ),
                    const SizedBox(height: 8),
                    const Text('Document PDF', style: TextStyle(fontSize: 12, color: Colors.white, fontWeight: FontWeight.w600, letterSpacing: 0.5)),
                  ],
                ),
              ),
            ),
            // Pied de carte
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              child: Row(
                children: [
                  Container(
                    width: 36, height: 36,
                    decoration: BoxDecoration(
                      color: Colors.red.shade100,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(Icons.description_outlined, color: Colors.red.shade700, size: 20),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(_name,
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: isDark ? Colors.white : Colors.black87),
                          maxLines: 1, overflow: TextOverflow.ellipsis),
                        Text('PDF${_size != null ? ' · $_size' : ''} · Appuyer pour ouvrir',
                          style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                      ],
                    ),
                  ),
                  Icon(Icons.open_in_new, size: 16, color: Colors.red.shade400),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Grille d'images cliquable ────────────────────────────────────────────────

class _ImageGrid extends StatelessWidget {
  final List<PostMedia> images;
  final void Function(int index) onTap;
  const _ImageGrid({required this.images, required this.onTap});

  Widget _img(String url, int index) => GestureDetector(
    onTap: () => onTap(index),
    child: CachedNetworkImage(
      imageUrl: url, fit: BoxFit.cover,
      placeholder: (_, __) => Container(color: const Color(0xFFF0F0F0)),
      errorWidget: (_, __, ___) => Container(
        color: const Color(0xFFF0F0F0),
        child: const Icon(Icons.broken_image, color: Colors.grey),
      ),
    ),
  );

  @override
  Widget build(BuildContext context) {
    final count = images.length;
    if (count == 1) {
      return AspectRatio(
        aspectRatio: 16 / 9,
        child: _img(images[0].url, 0),
      );
    }
    if (count == 2) {
      return SizedBox(
        height: 200,
        child: Row(children: [
          Expanded(child: _img(images[0].url, 0)),
          const SizedBox(width: 2),
          Expanded(child: _img(images[1].url, 1)),
        ]),
      );
    }
    if (count == 3) {
      return SizedBox(
        height: 220,
        child: Row(children: [
          Expanded(flex: 2, child: _img(images[0].url, 0)),
          const SizedBox(width: 2),
          Expanded(child: Column(children: [
            Expanded(child: _img(images[1].url, 1)),
            const SizedBox(height: 2),
            Expanded(child: _img(images[2].url, 2)),
          ])),
        ]),
      );
    }
    return SizedBox(
      height: 200,
      child: GridView.count(
        crossAxisCount: 2, crossAxisSpacing: 2, mainAxisSpacing: 2,
        physics: const NeverScrollableScrollPhysics(), padding: EdgeInsets.zero,
        children: [
          ...List.generate(3, (i) => _img(images[i].url, i)),
          GestureDetector(
            onTap: () => onTap(3),
            child: Stack(children: [
              Positioned.fill(child: CachedNetworkImage(imageUrl: images[3].url, fit: BoxFit.cover)),
              if (count > 4)
                Positioned.fill(child: Container(
                  color: Colors.black54,
                  child: Center(child: Text('+${count - 4}',
                    style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w700))),
                )),
            ]),
          ),
        ],
      ),
    );
  }
}

// ─── Lightbox images plein écran ──────────────────────────────────────────────

class _ImageLightbox extends StatefulWidget {
  final List<String> images;
  final int initialIndex;
  const _ImageLightbox({required this.images, required this.initialIndex});

  @override
  State<_ImageLightbox> createState() => _ImageLightboxState();
}

class _ImageLightboxState extends State<_ImageLightbox> {
  late final PageController _page;
  late int _current;
  bool _downloading = false;

  @override
  void initState() {
    super.initState();
    _current = widget.initialIndex;
    _page = PageController(initialPage: widget.initialIndex);
  }

  @override
  void dispose() { _page.dispose(); super.dispose(); }

  Future<void> _downloadImage(String url) async {
    setState(() => _downloading = true);
    try {
      // Demander permission sur Android < 13
      final status = await Permission.photos.request();
      if (!status.isGranted && !status.isLimited) {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Permission galerie refusée')),
        );
        return;
      }
      final resp = await http.get(Uri.parse(url));
      final result = await ImageGallerySaver.saveImage(
        resp.bodyBytes,
        quality: 100,
        name: 'studys_${DateTime.now().millisecondsSinceEpoch}',
      );
      if (!mounted) return;
      final success = result['isSuccess'] == true || result['filePath'] != null;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(success ? 'Image enregistrée dans la galerie !' : 'Erreur lors de l\'enregistrement'),
        backgroundColor: success ? kGreen : Colors.red,
      ));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Impossible de télécharger l\'image')),
      );
    } finally {
      if (mounted) setState(() => _downloading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Images avec zoom + swipe
          PageView.builder(
            controller: _page,
            itemCount: widget.images.length,
            onPageChanged: (i) => setState(() => _current = i),
            itemBuilder: (_, i) => InteractiveViewer(
              minScale: 0.8,
              maxScale: 4.0,
              child: Center(
                child: CachedNetworkImage(
                  imageUrl: widget.images[i],
                  fit: BoxFit.contain,
                  placeholder: (_, __) => const Center(child: CircularProgressIndicator(color: Colors.white)),
                  errorWidget: (_, __, ___) => const Icon(Icons.broken_image, color: Colors.white, size: 48),
                ),
              ),
            ),
          ),

          // Barre supérieure : fermer + compteur + télécharger
          Positioned(
            top: 0, left: 0, right: 0,
            child: SafeArea(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter, end: Alignment.bottomCenter,
                    colors: [Colors.black.withValues(alpha: 0.6), Colors.transparent],
                  ),
                ),
                child: Row(
                  children: [
                    // Bouton fermer
                    IconButton(
                      icon: const Icon(Icons.close, color: Colors.white, size: 24),
                      onPressed: () => Navigator.pop(context),
                    ),
                    const Spacer(),
                    // Compteur
                    if (widget.images.length > 1)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.5),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text('${_current + 1} / ${widget.images.length}',
                          style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500)),
                      ),
                    const Spacer(),
                    // Bouton télécharger
                    IconButton(
                      icon: _downloading
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Icon(Icons.download_outlined, color: Colors.white, size: 24),
                      onPressed: _downloading ? null : () => _downloadImage(widget.images[_current]),
                      tooltip: 'Enregistrer dans la galerie',
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CommentSection extends StatefulWidget {
  final String postId;
  const _CommentSection({required this.postId});
  @override
  State<_CommentSection> createState() => _CommentSectionState();
}

class _CommentSectionState extends State<_CommentSection> {
  final _sb = Supabase.instance.client;
  final _ctrl = TextEditingController();
  List<Comment> _comments = [];
  bool _loading = true;
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final data = await _sb.from('comments')
        .select('*, author:profiles(id,username,full_name,avatar_url)')
        .eq('post_id', widget.postId)
        .eq('is_deleted', false)
        .isFilter('parent_id', null)
        .order('created_at', ascending: true)
        .limit(20);
    setState(() {
      _comments = (data as List).map((c) => Comment.fromJson(c)).toList();
      _loading = false;
    });
  }

  Future<void> _send() async {
    final text = _ctrl.text.trim();
    if (text.isEmpty || _sending) return;
    final userId = _sb.auth.currentUser?.id;
    if (userId == null) return;
    setState(() => _sending = true);
    _ctrl.clear();
    try {
      final data = await _sb.from('comments')
          .insert({'post_id': widget.postId, 'content': text, 'author_id': userId})
          .select('*, author:profiles(id,username,full_name,first_name,avatar_url)')
          .single();
      if (mounted) setState(() => _comments.add(Comment.fromJson(data)));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur : $e')));
        _ctrl.text = text; // Restaurer le texte
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: isDark ? const Color(0xFF2D3139) : Colors.grey.shade100)),
      ),
      child: Column(
        children: [
          if (_loading)
            const Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator(color: kOrange, strokeWidth: 2))
          else if (_comments.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Text('Aucun commentaire. Soyez le premier !',
                style: TextStyle(color: Colors.grey.shade400, fontSize: 13)),
            )
          else
            ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 300),
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: _comments.length,
                itemBuilder: (_, i) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: CommentThread(
                    comment: _comments[i],
                    postId: widget.postId,
                    isDark: isDark,
                    onCommentAdded: () {},
                  ),
                ),
              ),
            ),
          const SizedBox(height: 8),
          Row(children: [
            AppAvatar(
              url: _sb.auth.currentUser?.userMetadata?['avatar_url'],
              initials: 'M', size: 28,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: TextField(
                controller: _ctrl,
                style: const TextStyle(fontSize: 13),
                decoration: InputDecoration(
                  hintText: 'Écrire un commentaire…',
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  fillColor: isDark ? const Color(0xFF2D3139) : const Color(0xFFF3F4F6),
                  suffixIcon: IconButton(
                    icon: Icon(Icons.send_rounded, size: 18, color: kOrange.withValues(alpha: _ctrl.text.isEmpty ? 0.3 : 1)),
                    onPressed: _send,
                  ),
                ),
                onSubmitted: (_) => _send(),
                onChanged: (_) => setState(() {}),
              ),
            ),
          ]),
        ],
      ),
    );
  }
}
