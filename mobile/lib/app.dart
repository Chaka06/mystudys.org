import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/theme.dart';
import 'core/router.dart';
import 'providers/theme_provider.dart';

class StudysApp extends StatefulWidget {
  const StudysApp({super.key});
  @override
  State<StudysApp> createState() => _StudysAppState();
}

class _StudysAppState extends State<StudysApp> {
  late final _router = buildRouter();

  @override
  Widget build(BuildContext context) {
    final themeP = context.watch<ThemeProvider>();
    return MaterialApp.router(
      title: "STUDY'S",
      debugShowCheckedModeBanner: false,
      theme: lightTheme(),
      darkTheme: darkTheme(),
      themeMode: themeP.mode,
      routerConfig: _router,
    );
  }
}
