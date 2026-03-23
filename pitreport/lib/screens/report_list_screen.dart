import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/report.dart';
import '../services/firestore_service.dart';
import '../theme.dart';
import 'report_detail_screen.dart';

class ReportListScreen extends StatelessWidget {
  const ReportListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final userId = FirebaseAuth.instance.currentUser!.uid;
    final service = FirestoreService();

    return Scaffold(
      backgroundColor: kNavyBlue,
      appBar: AppBar(
        backgroundColor: kNavyBlue,
        elevation: 0,
        title: const Text('As minhas Denúncias',
            style: TextStyle(color: Colors.white)),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: StreamBuilder<List<Report>>(
        stream: service.getUserReports(userId),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(
                child: CircularProgressIndicator(color: kOrange));
          }
          if (snapshot.hasError) {
            return Center(
              child: Text('Erro ao carregar denúncias',
                  style: TextStyle(color: Colors.red[300])),
            );
          }
          final reports = snapshot.data ?? [];
          if (reports.isEmpty) {
            return const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.inbox_outlined, size: 64, color: Colors.white24),
                  SizedBox(height: 12),
                  Text('Ainda não tens denúncias',
                      style: TextStyle(color: Colors.white54, fontSize: 16)),
                ],
              ),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: reports.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, i) => GestureDetector(
              onTap: () => Navigator.of(context).push(MaterialPageRoute(
                builder: (_) => ReportDetailScreen(report: reports[i]),
              )),
              child: _ReportCard(report: reports[i]),
            ),
          );
        },
      ),
    );
  }
}

class _ReportCard extends StatelessWidget {
  final Report report;
  const _ReportCard({required this.report});

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
    final statusColor = _statusColor(report.status);
    final dateStr = DateFormat('dd/MM/yyyy HH:mm').format(report.createdAt);

    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.07),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white12),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Thumbnail
          ClipRRect(
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(14),
              bottomLeft: Radius.circular(14),
            ),
            child: report.imageUrls.isNotEmpty
                ? Image.network(
                    report.imageUrls.first,
                    width: 100,
                    height: 110,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => _placeholder(),
                  )
                : _placeholder(),
          ),
          // Info
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Status + categoria
                  Row(
                    children: [
                      _Badge(label: _statusLabel(report.status), color: statusColor),
                      const SizedBox(width: 6),
                      Expanded(
                        child: _Badge(
                            label: report.category,
                            color: Colors.white30,
                            textColor: Colors.white70),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  // Título
                  Text(
                    report.title,
                    style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                        fontSize: 14),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  // Morada
                  if (report.address.isNotEmpty)
                    Row(
                      children: [
                        const Icon(Icons.location_on_outlined,
                            size: 12, color: Colors.white38),
                        const SizedBox(width: 2),
                        Expanded(
                          child: Text(
                            report.address,
                            style: const TextStyle(
                                color: Colors.white38, fontSize: 11),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  const SizedBox(height: 4),
                  // Data
                  Text(dateStr,
                      style: const TextStyle(
                          color: Colors.white38, fontSize: 11)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _placeholder() {
    return Container(
      width: 100,
      height: 110,
      color: Colors.white10,
      child: const Icon(Icons.image_outlined, color: Colors.white24, size: 32),
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
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: color.withOpacity(0.85),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: TextStyle(
            fontSize: 10, fontWeight: FontWeight.w600, color: textColor),
        overflow: TextOverflow.ellipsis,
      ),
    );
  }
}
