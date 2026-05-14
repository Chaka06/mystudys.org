import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/theme.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});
  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _step1Form = GlobalKey<FormState>();
  final _step2Form = GlobalKey<FormState>();
  int _step = 1;

  // Step 1
  final _firstCtrl = TextEditingController();
  final _lastCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();

  // Step 2
  String? _level;
  final _fieldCtrl = TextEditingController();
  final _instCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  bool _showPass = false;
  bool _showConfirm = false;

  bool _loading = false;
  String? _error;

  static const _levels = [
    ('terminale', 'Terminale'),
    ('bts_1', 'BTS 1'), ('bts_2', 'BTS 2'),
    ('licence_1', 'Licence 1 (L1)'), ('licence_2', 'Licence 2 (L2)'), ('licence_3', 'Licence 3 (L3)'),
    ('master_1', 'Master 1 (M1)'), ('master_2', 'Master 2 (M2)'),
    ('doctorat', 'Doctorat'),
  ];

  Future<void> _register() async {
    if (!_step2Form.currentState!.validate()) return;
    setState(() { _loading = true; _error = null; });
    try {
      await Supabase.instance.client.auth.signUp(
        email: _emailCtrl.text.trim(),
        password: _passCtrl.text,
        data: {
          'full_name': '${_firstCtrl.text.trim()} ${_lastCtrl.text.trim()}',
          'first_name': _firstCtrl.text.trim(),
          'last_name': _lastCtrl.text.trim(),
          if (_phoneCtrl.text.isNotEmpty) 'phone': _phoneCtrl.text.trim(),
          if (_level != null) 'academic_level': _level,
          if (_fieldCtrl.text.isNotEmpty) 'field_of_study': _fieldCtrl.text.trim(),
          if (_instCtrl.text.isNotEmpty) 'institution': _instCtrl.text.trim(),
        },
      );
      if (mounted) context.push('/otp', extra: _emailCtrl.text.trim());
    } on AuthException catch (e) {
      setState(() => _error = e.message.contains('already') ? 'Cet email est déjà utilisé' : e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _firstCtrl.dispose(); _lastCtrl.dispose(); _emailCtrl.dispose();
    _phoneCtrl.dispose(); _fieldCtrl.dispose(); _instCtrl.dispose();
    _passCtrl.dispose(); _confirmCtrl.dispose();
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
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 512),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Image.asset('assets/images/logostudys.png', height: 56, width: 56),
                    const SizedBox(height: 8),
                    RichText(
                      text: const TextSpan(children: [
                        TextSpan(text: 'STUDY', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: kOrange)),
                        TextSpan(text: "'S", style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: kGreen)),
                      ]),
                    ),
                    const SizedBox(height: 4),
                    Text('Rejoignez la communauté étudiante', style: TextStyle(fontSize: 13, color: Colors.grey.shade500)),
                    const SizedBox(height: 20),

                    // Indicateurs d'étape
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        _StepDot(active: _step == 1, done: _step > 1),
                        const SizedBox(width: 8),
                        _StepDot(active: _step == 2, done: false),
                      ],
                    ),
                    const SizedBox(height: 24),

                    if (_step == 1) _buildStep1() else _buildStep2(),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStep1() {
    return Form(
      key: _step1Form,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Vos informations', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
          const SizedBox(height: 20),
          Row(children: [
            Expanded(child: TextFormField(
              controller: _firstCtrl,
              decoration: const InputDecoration(
                hintText: 'Prénom *',
                prefixIcon: Icon(Icons.person_outline, size: 18),
              ),
              validator: (v) => v == null || v.length < 2 ? 'Min 2 caractères' : null,
            )),
            const SizedBox(width: 12),
            Expanded(child: TextFormField(
              controller: _lastCtrl,
              decoration: const InputDecoration(hintText: 'Nom *'),
              validator: (v) => v == null || v.length < 2 ? 'Min 2 caractères' : null,
            )),
          ]),
          const SizedBox(height: 12),
          TextFormField(
            controller: _emailCtrl,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(
              hintText: 'Adresse email *',
              prefixIcon: Icon(Icons.email_outlined, size: 18),
            ),
            validator: (v) {
              if (v == null || v.isEmpty) return 'Requis';
              if (!v.contains('@')) return 'Email invalide';
              return null;
            },
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _phoneCtrl,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(
              hintText: 'Téléphone (+225 07...)',
              prefixIcon: Icon(Icons.phone_outlined, size: 18),
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity, height: 50,
            child: ElevatedButton(
              onPressed: () {
                if (_step1Form.currentState!.validate()) setState(() => _step = 2);
              },
              child: const Text('Continuer', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            ),
          ),
          const SizedBox(height: 16),
          Center(
            child: GestureDetector(
              onTap: () => context.go('/login'),
              child: RichText(
                text: const TextSpan(
                  style: TextStyle(fontSize: 14),
                  children: [
                    TextSpan(text: 'Déjà un compte ? '),
                    TextSpan(text: 'Se connecter', style: TextStyle(color: kOrange, fontWeight: FontWeight.w700)),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStep2() {
    return Form(
      key: _step2Form,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Votre parcours académique', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
          const SizedBox(height: 20),

          DropdownButtonFormField<String>(
            value: _level,
            hint: const Text('Niveau académique *'),
            decoration: InputDecoration(
              filled: true,
              fillColor: Theme.of(context).inputDecorationTheme.fillColor,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
            ),
            items: _levels.map((l) => DropdownMenuItem(value: l.$1, child: Text(l.$2))).toList(),
            onChanged: (v) => setState(() => _level = v),
            validator: (v) => v == null ? 'Sélectionnez un niveau' : null,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _fieldCtrl,
            decoration: const InputDecoration(
              hintText: 'Filière (ex: Informatique, Droit...) *',
              prefixIcon: Icon(Icons.menu_book_outlined, size: 18),
            ),
            validator: (v) => v == null || v.length < 2 ? 'Min 2 caractères' : null,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _instCtrl,
            decoration: const InputDecoration(
              hintText: 'Établissement (ex: UVCI, INPHB...) *',
              prefixIcon: Icon(Icons.business_outlined, size: 18),
            ),
            validator: (v) => v == null || v.length < 2 ? 'Min 2 caractères' : null,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _passCtrl,
            obscureText: !_showPass,
            decoration: InputDecoration(
              hintText: 'Mot de passe *',
              prefixIcon: const Icon(Icons.lock_outline, size: 18),
              suffixIcon: IconButton(
                icon: Icon(_showPass ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 18),
                onPressed: () => setState(() => _showPass = !_showPass),
              ),
            ),
            validator: (v) {
              if (v == null || v.length < 8) return 'Min 8 caractères';
              if (!v.contains(RegExp(r'[A-Z]'))) return 'Doit contenir une majuscule';
              if (!v.contains(RegExp(r'[0-9]'))) return 'Doit contenir un chiffre';
              return null;
            },
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _confirmCtrl,
            obscureText: !_showConfirm,
            decoration: InputDecoration(
              hintText: 'Confirmer le mot de passe *',
              prefixIcon: const Icon(Icons.lock_outline, size: 18),
              suffixIcon: IconButton(
                icon: Icon(_showConfirm ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 18),
                onPressed: () => setState(() => _showConfirm = !_showConfirm),
              ),
            ),
            validator: (v) => v != _passCtrl.text ? 'Les mots de passe ne correspondent pas' : null,
          ),

          if (_error != null) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(10)),
              child: Text(_error!, style: TextStyle(color: Colors.red.shade700, fontSize: 13)),
            ),
          ],

          const SizedBox(height: 24),
          Row(children: [
            Expanded(
              child: OutlinedButton(
                onPressed: () => setState(() { _step = 1; _error = null; }),
                style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(50)),
                child: const Text('Retour'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: ElevatedButton(
                onPressed: _loading ? null : _register,
                style: ElevatedButton.styleFrom(minimumSize: const Size.fromHeight(50)),
                child: _loading
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Text('Créer mon compte', style: TextStyle(fontWeight: FontWeight.w600)),
              ),
            ),
          ]),
          const SizedBox(height: 12),
          Center(
            child: Text.rich(
              const TextSpan(
                text: 'En vous inscrivant, vous acceptez nos ',
                style: TextStyle(fontSize: 11, color: Colors.grey),
                children: [TextSpan(text: 'CGU', style: TextStyle(color: kOrange))],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StepDot extends StatelessWidget {
  final bool active;
  final bool done;
  const _StepDot({required this.active, required this.done});
  @override
  Widget build(BuildContext context) => AnimatedContainer(
    duration: const Duration(milliseconds: 300),
    width: active ? 32 : 16,
    height: 8,
    decoration: BoxDecoration(
      color: active ? kOrange : done ? kGreen : Colors.grey.shade300,
      borderRadius: BorderRadius.circular(4),
    ),
  );
}
