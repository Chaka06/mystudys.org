import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/theme.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _form = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _loading = false;
  bool _showPass = false;
  String? _error;

  Future<void> _login() async {
    if (!_form.currentState!.validate()) return;
    setState(() { _loading = true; _error = null; });
    try {
      await Supabase.instance.client.auth.signInWithPassword(
        email: _emailCtrl.text.trim(),
        password: _passCtrl.text,
      );
      if (mounted) context.go('/feed');
    } on AuthException catch (e) {
      setState(() => _error = 'Email ou mot de passe incorrect');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: isDark
                ? [const Color(0xFF0F1117), const Color(0xFF0F1117)]
                : [const Color(0xFFFFF7ED), Colors.white, const Color(0xFFF0FDF4)],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 448),
                child: Form(
                  key: _form,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      // Logo
                      Image.asset('assets/images/logostudys.png', height: 64, width: 64),
                      const SizedBox(height: 12),
                      RichText(
                        text: const TextSpan(
                          children: [
                            TextSpan(text: 'STUDY', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: kOrange)),
                            TextSpan(text: "'S", style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: kGreen)),
                          ],
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text('Le réseau social étudiant ivoirien',
                        style: TextStyle(fontSize: 13, color: Colors.grey.shade500)),
                      const SizedBox(height: 40),

                      // Titre
                      const Align(
                        alignment: Alignment.centerLeft,
                        child: Text('Se connecter', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
                      ),
                      const SizedBox(height: 20),

                      // Email
                      TextFormField(
                        controller: _emailCtrl,
                        keyboardType: TextInputType.emailAddress,
                        decoration: const InputDecoration(
                          hintText: 'Adresse email',
                          prefixIcon: Icon(Icons.email_outlined, size: 18),
                        ),
                        validator: (v) {
                          if (v == null || v.isEmpty) return 'Email requis';
                          if (!v.contains('@')) return 'Email invalide';
                          return null;
                        },
                      ),
                      const SizedBox(height: 12),

                      // Mot de passe
                      TextFormField(
                        controller: _passCtrl,
                        obscureText: !_showPass,
                        decoration: InputDecoration(
                          hintText: 'Mot de passe',
                          prefixIcon: const Icon(Icons.lock_outline, size: 18),
                          suffixIcon: IconButton(
                            icon: Icon(_showPass ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 18),
                            onPressed: () => setState(() => _showPass = !_showPass),
                          ),
                        ),
                        validator: (v) => v == null || v.isEmpty ? 'Mot de passe requis' : null,
                      ),

                      // Mot de passe oublié
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton(
                          onPressed: () => context.push('/forgot-password'),
                          style: TextButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 4)),
                          child: const Text('Mot de passe oublié ?',
                            style: TextStyle(color: kOrange, fontSize: 12)),
                        ),
                      ),

                      // Erreur
                      if (_error != null) ...[
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.red.shade50,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(_error!, style: TextStyle(color: Colors.red.shade700, fontSize: 13)),
                        ),
                        const SizedBox(height: 12),
                      ],

                      const SizedBox(height: 8),
                      SizedBox(
                        width: double.infinity,
                        height: 50,
                        child: ElevatedButton(
                          onPressed: _loading ? null : _login,
                          child: _loading
                              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                              : const Text('Se connecter', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                        ),
                      ),

                      const SizedBox(height: 24),
                      Row(children: [
                        Expanded(child: Divider(color: Colors.grey.shade300)),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          child: Text('ou', style: TextStyle(color: Colors.grey.shade400, fontSize: 13)),
                        ),
                        Expanded(child: Divider(color: Colors.grey.shade300)),
                      ]),
                      const SizedBox(height: 16),
                      GestureDetector(
                        onTap: () => context.go('/register'),
                        child: RichText(
                          text: const TextSpan(
                            style: TextStyle(fontSize: 14, color: Colors.black87),
                            children: [
                              TextSpan(text: "Pas encore de compte ? "),
                              TextSpan(text: "S'inscrire",
                                style: TextStyle(color: kOrange, fontWeight: FontWeight.w700)),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
