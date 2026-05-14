import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import '../core/theme.dart';

class AppAvatar extends StatelessWidget {
  final String? url;
  final String initials;
  final double size;
  final bool isOnline;

  const AppAvatar({
    super.key,
    this.url,
    required this.initials,
    this.size = 40,
    this.isOnline = false,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: kOrange.withOpacity(0.15),
          ),
          child: ClipOval(
            child: url != null && url!.isNotEmpty
                ? CachedNetworkImage(
                    imageUrl: url!,
                    fit: BoxFit.cover,
                    placeholder: (_, __) => _initials(),
                    errorWidget: (_, __, ___) => _initials(),
                  )
                : _initials(),
          ),
        ),
        if (isOnline)
          Positioned(
            right: 0,
            bottom: 0,
            child: Container(
              width: size * 0.25,
              height: size * 0.25,
              decoration: BoxDecoration(
                color: kGreen,
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 1.5),
              ),
            ),
          ),
      ],
    );
  }

  Widget _initials() => Center(
        child: Text(
          initials,
          style: TextStyle(
            color: kOrange,
            fontWeight: FontWeight.w700,
            fontSize: size * 0.35,
          ),
        ),
      );
}
