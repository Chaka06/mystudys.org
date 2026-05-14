import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/theme.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});
  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _emailCtrl = TextEditingController();
  final _form = GlobalKey<FormState>();
  bool _loading = false;
  bool _sent = false;

  Future<void> _send() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _loading = true);
    await Supabase.instance.client.auth.resetPasswordForEmail(
      _emailCtrl.text.trim(),
    );
    if (mounted) setState(() { _loading = false; _sent = true; });
  }

  @override
  void dispose() { _emailCtrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft, end: Alignment.bottomRight,
            colors: isDark
                ? [const Color(0xFF0F1117), const Color(0xFF0F1117)]
                : [const Color(0xFFFFF7ED), Colors.white, const Color(0xFFF0FDF4)],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 384),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Image.asset('assets/images/logostudys.png', height: 56, width: 56),
                    const SizedBox(height: 8),
                    RichText(text: const TextSpan(children: [
                      TextSpan(text: 'STUDY', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: kOrange)),
                      TextSpan(text: "'S", style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: kGreen)),
                    ])),
                    const SizedBox(height: 32),

                    Container(
                      width: 56, height: 56,
                      decoration: BoxDecoration(
                        color: _sent ? Colors.green.shade50 : const Color(0xFFFFF7ED),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Icon(
                        _sent ? Icons.check_circle_outline : Icons.mail_outline,
                        color: _sent ? kGreen : kOrange, size: 28,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      _sent ? 'Email envoyé !' : 'Mot de passe oublié ?',
                      style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _sent
                          ? 'Si un compte existe pour ${_emailCtrl.text.trim()}, un lien de réinitialisation a été envoyé. Vérifiez votre boîte mail et les spams.'
                          : 'Entrez votre adresse email. Nous vous enverrons un lien pour réinitialiser votre mot de passe.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.grey.shade500, fontSize: 14, height: 1.5),
                    ),
                    const SizedBox(height: 28),

                    if (!_sent) ...[
                      Form(
                        key: _form,
                        child: TextFormField(
                          controller: _emailCtrl,
                          keyboardType: TextInputType.emailAddress,
                          decoration: const InputDecoration(
                            hintText: 'Votre adresse email',
                            prefixIcon: Icon(Icons.email_outlined, size: 18),
                          ),
                          validator: (v) {
                            if (v == null || v.isEmpty) return 'Requis';
                            if (!v.contains('@')) return 'Email invalide';
                            return null;
                          },
                        ),
                      ),
                      const SizedBox(height: 20),
                      SizedBox(
                        width: double.infinity, height: 50,
                        child: ElevatedButton(
                          onPressed: _loading ? null : _send,
                          child: _loading
                              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                              : const Text('Envoyer le lien', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                        ),
                      ),
                    ] else
                      SizedBox(
                        width: double.infinity, height: 50,
                        child: ElevatedButton(
                          onPressed: () => context.go('/login'),
                          child: const Text('Retour à la connexion', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                        ),
                      ),

                    const SizedBox(height: 16),
                    if (!_sent)
                      TextButton.icon(
                        onPressed: () => context.go('/login'),
                        icon: const Icon(Icons.arrow_back, size: 16, color: Colors.grey),
                        label: Text('Retour à la connexion', style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
