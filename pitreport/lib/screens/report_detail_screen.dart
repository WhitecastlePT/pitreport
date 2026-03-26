import 'dart:math';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/report.dart';
import '../theme.dart';

Color _decibelColor(double db) {
  if (db < 50) return Colors.greenAccent;
  if (db < 70) return Colors.yellowAccent;
  if (db < 85) return kOrange;
  return Colors.redAccent;
}

String _decibelLabel(double db) {
  if (db < 50) return 'Ambiente silencioso';
  if (db < 70) return 'Ruído moderado';
  if (db < 85) return 'Ruído elevado';
  return 'Ruído muito elevado';
}

class ReportDetailScreen extends StatelessWidget {
  final Report report;
  const ReportDetailScreen({super.key, required this.report});

  Color _statusColor(String status) {
    switch (status) {
      case 'in_progress':
        return Colors.lightBlueAccent;
      case 'resolved':
        return Colors.greenAccent;
      default:
        return kOrange;
    }
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'in_progress':
        return 'Em análise';
      case 'resolved':
        return 'Resolvido';
      default:
        return 'Pendente';
    }
  }

  @override
  Widget build(BuildContext context) {
    final dateStr = DateFormat('dd/MM/yyyy HH:mm').format(report.createdAt);
    final statusColor = _statusColor(report.status);

    return Scaffold(
      backgroundColor: kNavyBlue,
      appBar: AppBar(
        backgroundColor: kNavyBlue,
        elevation: 0,
        title: const Text('Detalhe da Denúncia',
            style: TextStyle(color: Colors.white)),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Estado + Categoria
          Row(
            children: [
              _Badge(label: _statusLabel(report.status), color: statusColor),
              const SizedBox(width: 8),
              _Badge(
                  label: report.category,
                  color: Colors.white24,
                  textColor: Colors.white70),
            ],
          ),
          const SizedBox(height: 12),

          // Título
          Text(
            report.title,
            style: const TextStyle(
                color: Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),

          // Descrição
          if (report.description.isNotEmpty) ...[
            Text(
              report.description,
              style: const TextStyle(color: Colors.white70, fontSize: 14),
            ),
            const SizedBox(height: 12),
          ],

          // Localização + Data
          _InfoRow(icon: Icons.location_on_outlined, text: report.address),
          const SizedBox(height: 8),
          GestureDetector(
            onTap: () async {
              final uri = Uri.parse(
                'https://www.google.com/maps/dir/?api=1&destination=${report.latitude},${report.longitude}',
              );
              if (await canLaunchUrl(uri)) {
                await launchUrl(uri, mode: LaunchMode.externalApplication);
              }
            },
            child: Row(
              children: [
                const Icon(Icons.directions, size: 15, color: Colors.lightBlueAccent),
                const SizedBox(width: 6),
                const Text(
                  'Abrir no Google Maps',
                  style: TextStyle(
                    color: Colors.lightBlueAccent,
                    fontSize: 13,
                    decoration: TextDecoration.underline,
                    decorationColor: Colors.lightBlueAccent,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          _InfoRow(icon: Icons.calendar_today_outlined, text: dateStr),
          const SizedBox(height: 20),

          // Nível de Ruído — só para categoria Poluição Sonora
          if (report.category == 'Poluição Sonora' &&
              report.decibelLevel != null) ...[
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.07),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.white30),
              ),
              child: Row(
                children: [
                  Icon(Icons.graphic_eq,
                      color: _decibelColor(report.decibelLevel!), size: 32),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${report.decibelLevel!.toStringAsFixed(1)} dB',
                        style: TextStyle(
                          color: _decibelColor(report.decibelLevel!),
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        _decibelLabel(report.decibelLevel!),
                        style: const TextStyle(
                            color: Colors.white54, fontSize: 13),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
          ],

          // Fotografias
          const Text(
            'Fotografias',
            style: TextStyle(
                color: Colors.white70,
                fontSize: 13,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.5),
          ),
          const SizedBox(height: 8),

          if (report.photoMetadata.isNotEmpty)
            ...report.photoMetadata.map((meta) => _PhotoCard(meta: meta))
          else if (report.imageUrls.isNotEmpty)
            // fallback para denúncias antigas sem metadata
            ...report.imageUrls.map((url) => _PhotoCard(meta: {'url': url}))
          else
            const Text('Sem fotografias',
                style: TextStyle(color: Colors.white38)),
        ],
      ),
    );
  }
}

class _PhotoCard extends StatelessWidget {
  final Map<String, dynamic> meta;
  const _PhotoCard({required this.meta});

  void _openPhotoViewer(BuildContext context, String url) {
    Navigator.of(context).push(
      PageRouteBuilder(
        opaque: false,
        barrierColor: Colors.black87,
        pageBuilder: (_, __, ___) => _PhotoViewerPage(url: url),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final url = meta['url'] as String? ?? '';
    final heading = (meta['heading'] as num?)?.toDouble();
    final headingLabel = meta['headingLabel'] as String? ?? '';
    final lat = (meta['latitude'] as num?)?.toDouble();
    final lng = (meta['longitude'] as num?)?.toDouble();

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.07),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Metadados da foto
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Orientação
                Row(
                  children: [
                    Transform.rotate(
                      angle: (heading ?? 0) * (pi / 180),
                      child: Icon(Icons.navigation,
                          color: heading != null ? kOrange : Colors.white24,
                          size: 20),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      heading != null
                          ? (headingLabel.isNotEmpty
                              ? '$headingLabel  (${heading.toStringAsFixed(0)}°)'
                              : '${heading.toStringAsFixed(0)}°')
                          : 'Orientação não disponível',
                      style: TextStyle(
                          color: heading != null ? Colors.white : Colors.white38,
                          fontSize: 14),
                    ),
                  ],
                ),
                const SizedBox(height: 6),

                // Coordenadas
                if (lat != null && lng != null)
                  Row(
                    children: [
                      const Icon(Icons.location_on_outlined,
                          color: Colors.white38, size: 16),
                      const SizedBox(width: 4),
                      Text(
                        '${lat.toStringAsFixed(5)}, ${lng.toStringAsFixed(5)}',
                        style: const TextStyle(
                            color: Colors.white38, fontSize: 12),
                      ),
                    ],
                  ),
              ],
            ),
          ),

          // Foto
          ClipRRect(
            borderRadius:
                const BorderRadius.vertical(bottom: Radius.circular(12)),
            child: url.isNotEmpty
                ? GestureDetector(
                    onTap: () => _openPhotoViewer(context, url),
                    child: Image.network(
                      url,
                      width: double.infinity,
                      fit: BoxFit.contain,
                      errorBuilder: (_, __, ___) => Container(
                        height: 200,
                        color: Colors.white10,
                        child: const Icon(Icons.broken_image_outlined,
                            color: Colors.white24, size: 48),
                      ),
                    ),
                  )
                : Container(
                    height: 200,
                    color: Colors.white10,
                    child: const Icon(Icons.image_outlined,
                        color: Colors.white24, size: 48),
                  ),
          ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String text;
  const _InfoRow({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 15, color: Colors.white38),
        const SizedBox(width: 6),
        Expanded(
          child: Text(text,
              style: const TextStyle(color: Colors.white54, fontSize: 13)),
        ),
      ],
    );
  }
}

class _PhotoViewerPage extends StatelessWidget {
  final String url;
  const _PhotoViewerPage({required this.url});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black87,
      body: GestureDetector(
        onTap: () => Navigator.of(context).pop(),
        child: Center(
          child: InteractiveViewer(
            minScale: 0.5,
            maxScale: 5.0,
            child: Image.network(
              url,
              fit: BoxFit.contain,
              errorBuilder: (_, __, ___) => const Icon(
                Icons.broken_image_outlined,
                color: Colors.white24,
                size: 64,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  final String label;
  final Color color;
  final Color textColor;

  const _Badge({
    required this.label,
    required this.color,
    this.textColor = Colors.black87,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.85),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: TextStyle(
            fontSize: 11, fontWeight: FontWeight.w600, color: textColor),
      ),
    );
  }
}
