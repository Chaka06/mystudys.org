import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/theme.dart';

class OtpScreen extends StatefulWidget {
  final String email;
  const OtpScreen({super.key, required this.email});
  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {
  final List<TextEditingController> _ctrls = List.generate(6, (_) => TextEditingController());
  final List<FocusNode> _nodes = List.generate(6, (_) => FocusNode());
  bool _loading = false;
  bool _resending = false;
  String? _error;
  int _countdown = 60;

  @override
  void initState() {
    super.initState();
    _startCountdown();
  }

  void _startCountdown() {
    Future.delayed(const Duration(seconds: 1), () {
      if (mounted && _countdown > 0) {
        setState(() => _countdown--);
        _startCountdown();
      }
    });
  }

  String get _otp => _ctrls.map((c) => c.text).join();

  Future<void> _verify() async {
    final otp = _otp;
    if (otp.length < 6) return;
    setState(() { _loading = true; _error = null; });
    try {
      await Supabase.instance.client.auth.verifyOTP(
        email: widget.email,
        token: otp,
        type: OtpType.email,
      );
      if (mounted) context.go('/feed');
    } on AuthException {
      setState(() {
        _error = 'Code incorrect ou expiré. Réessayez.';
        for (final c in _ctrls) c.clear();
      });
      _nodes[0].requestFocus();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _resend() async {
    if (_resending) return;
    setState(() => _resending = true);
    await Supabase.instance.client.auth.resend(
      type: OtpType.signup,
      email: widget.email,
    );
    setState(() { _resending = false; _countdown = 60; });
    _startCountdown();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Code renvoyé !'), backgroundColor: kGreen),
      );
    }
  }

  void _onDigit(int index, String value) {
    if (value.length > 1) {
      // Paste: remplir tous les champs
      for (int i = 0; i < 6 && i < value.length; i++) {
        _ctrls[i].text = value[i];
      }
      _nodes[5].requestFocus();
    } else if (value.isNotEmpty && index < 5) {
      _nodes[index + 1].requestFocus();
    }
    if (_otp.length == 6) _verify();
  }

  @override
  void dispose() {
    for (final c in _ctrls) c.dispose();
    for (final n in _nodes) n.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      appBar: AppBar(
        leading: BackButton(onPressed: () => context.go('/login')),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 384),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  const SizedBox(height: 20),
                  Container(
                    width: 56, height: 56,
                    decoration: BoxDecoration(
                      color: kOrange.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Icon(Icons.mark_email_read_outlined, color: kOrange, size: 28),
                  ),
                  const SizedBox(height: 16),
                  const Text('Vérification du compte',
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  Text.rich(
                    TextSpan(
                      text: 'Entrez le code à 6 chiffres envoyé à\n',
                      style: TextStyle(color: Colors.grey.shade500, fontSize: 14, height: 1.5),
                      children: [
                        TextSpan(text: widget.email,
                          style: const TextStyle(fontWeight: FontWeight.w700, color: kOrange)),
                      ],
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 32),

                  // 6 boxes OTP
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: List.generate(6, (i) => SizedBox(
                      width: 44,
                      height: 52,
                      child: TextFormField(
                        controller: _ctrls[i],
                        focusNode: _nodes[i],
                        keyboardType: TextInputType.number,
                        textAlign: TextAlign.center,
                        maxLength: i == 0 ? 6 : 1,
                        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
                        decoration: InputDecoration(
                          counterText: '',
                          contentPadding: EdgeInsets.zero,
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: BorderSide(color: Colors.grey.shade300, width: 2),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                            borderSide: const BorderSide(color: kOrange, width: 2),
                          ),
                        ),
                        onChanged: (v) => _onDigit(i, v),
                        onTap: () { _ctrls[i].clear(); },
                      ),
                    )),
                  ),

                  if (_error != null) ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(10)),
                      child: Text(_error!, style: TextStyle(color: Colors.red.shade700, fontSize: 13), textAlign: TextAlign.center),
                    ),
                  ],

                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity, height: 50,
                    child: ElevatedButton(
                      onPressed: _loading ? null : _verify,
                      child: _loading
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Text('Vérifier mon compte', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                    ),
                  ),

                  const SizedBox(height: 20),
                  _countdown > 0
                      ? Text.rich(TextSpan(
                          text: 'Pas reçu le code ? ',
                          style: TextStyle(color: Colors.grey.shade500, fontSize: 13),
                          children: [TextSpan(
                            text: 'Renvoyer dans ${_countdown}s',
                            style: const TextStyle(color: kOrange, fontWeight: FontWeight.w600),
                          )],
                        ))
                      : GestureDetector(
                          onTap: _resend,
                          child: Text.rich(TextSpan(
                            text: 'Pas reçu le code ? ',
                            style: TextStyle(color: Colors.grey.shade500, fontSize: 13),
                            children: const [TextSpan(
                              text: 'Renvoyer',
                              style: TextStyle(color: kOrange, fontWeight: FontWeight.w700),
                            )],
                          )),
                        ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
