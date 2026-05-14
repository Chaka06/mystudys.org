import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_pdfview/flutter_pdfview.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import '../../core/theme.dart';

class PdfViewerScreen extends StatefulWidget {
  final String url;
  final String title;
  const PdfViewerScreen({super.key, required this.url, required this.title});
  @override
  State<PdfViewerScreen> createState() => _PdfViewerScreenState();
}

class _PdfViewerScreenState extends State<PdfViewerScreen> {
  String? _localPath;
  bool _loading = true;
  String? _error;
  int _totalPages = 0;
  int _currentPage = 0;

  @override
  void initState() {
    super.initState();
    _download();
  }

  Future<void> _download() async {
    try {
      final response = await http.get(Uri.parse(widget.url));
      if (response.statusCode != 200) throw Exception('Erreur ${response.statusCode}');
      final dir = await getTemporaryDirectory();
      final name = widget.url.split('/').last.split('?').first;
      final file = File('${dir.path}/$name');
      await file.writeAsBytes(response.bodyBytes);
      if (!mounted) return;
      setState(() { _localPath = file.path; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = 'Impossible de charger le PDF'; _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F1117) : const Color(0xFFF8F9FA),
      appBar: AppBar(
        title: Text(
          widget.title,
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        actions: [
          if (_totalPages > 0)
            Center(
              child: Padding(
                padding: const EdgeInsets.only(right: 16),
                child: Text(
                  '${_currentPage + 1} / $_totalPages',
                  style: TextStyle(fontSize: 13, color: Colors.grey.shade500),
                ),
              ),
            ),
        ],
      ),
      body: _loading
          ? Center(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                const CircularProgressIndicator(color: kOrange),
                const SizedBox(height: 16),
                Text('Chargement du document…', style: TextStyle(color: Colors.grey.shade500, fontSize: 13)),
              ]),
            )
          : _error != null
              ? Center(
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    Icon(Icons.error_outline, size: 48, color: Colors.red.shade400),
                    const SizedBox(height: 12),
                    Text(_error!, style: TextStyle(color: Colors.grey.shade500)),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: () { setState(() { _loading = true; _error = null; }); _download(); },
                      child: const Text('Réessayer'),
                    ),
                  ]),
                )
              : PDFView(
                  filePath: _localPath!,
                  enableSwipe: true,
                  swipeHorizontal: false,
                  autoSpacing: true,
                  pageFling: true,
                  pageSnap: true,
                  defaultPage: 0,
                  fitPolicy: FitPolicy.BOTH,
                  preventLinkNavigation: false,
                  onRender: (pages) => setState(() => _totalPages = pages ?? 0),
                  onPageChanged: (page, total) => setState(() { _currentPage = page ?? 0; _totalPages = total ?? 0; }),
                  onError: (e) => setState(() => _error = 'Erreur lors de l\'affichage'),
                ),
    );
  }
}
