import 'dart:math';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/report.dart';
import '../services/firestore_service.dart';
import '../theme.dart';

const _palette = [
  Color(0xFFF5A623),
  Color(0xFF4FC3F7),
  Color(0xFF81C784),
  Color(0xFFE57373),
  Color(0xFFBA68C8),
  Color(0xFF4DB6AC),
  Color(0xFFFFD54F),
];

class StatsScreen extends StatelessWidget {
  const StatsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final userId = FirebaseAuth.instance.currentUser!.uid;
    return Scaffold(
      backgroundColor: kNavyBlue,
      appBar: AppBar(
        backgroundColor: kNavyBlue,
        elevation: 0,
        title: const Text('Estatísticas',
            style: TextStyle(color: Colors.white)),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: StreamBuilder<List<Report>>(
        stream: FirestoreService().getUserReports(userId),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(
                child: CircularProgressIndicator(color: kOrange));
          }
          final reports = snapshot.data ?? [];
          if (reports.isEmpty) {
            return const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.bar_chart_outlined,
                      size: 64, color: Colors.white24),
                  SizedBox(height: 12),
                  Text('Sem dados para mostrar',
                      style:
                          TextStyle(color: Colors.white54, fontSize: 16)),
                ],
              ),
            );
          }
          return _StatsBody(reports: reports);
        },
      ),
    );
  }
}

// ── Body ──────────────────────────────────────────────────────────────────────

class _StatsBody extends StatelessWidget {
  final List<Report> reports;
  const _StatsBody({required this.reports});

  // ── computed ──────────────────────────────────────────────────────────────

  int get total => reports.length;
  int get pending =>
      reports.where((r) => r.status == 'pending').length;
  int get inProgress =>
      reports.where((r) => r.status == 'in_progress').length;
  int get resolved =>
      reports.where((r) => r.status == 'resolved').length;
  double get resolutionPct =>
      total > 0 ? resolved / total * 100 : 0;

  Map<String, int> get byCategory {
    final map = <String, int>{};
    for (final r in reports) {
      map[r.category] = (map[r.category] ?? 0) + 1;
    }
    final entries = map.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    return Map.fromEntries(entries);
  }

  List<MapEntry<DateTime, int>> get byMonth {
    final now = DateTime.now();
    final map = <String, int>{};
    for (final r in reports) {
      final key =
          '${r.createdAt.year}-${r.createdAt.month.toString().padLeft(2, '0')}';
      map[key] = (map[key] ?? 0) + 1;
    }
    return List.generate(6, (i) {
      final m = DateTime(now.year, now.month - (5 - i));
      final key =
          '${m.year}-${m.month.toString().padLeft(2, '0')}';
      return MapEntry(m, map[key] ?? 0);
    });
  }

  List<Map<String, dynamic>> get allPhotoMeta =>
      reports.expand((r) => r.photoMetadata).toList();

  int get totalPhotos => allPhotoMeta.length;
  double get avgPhotos => total > 0 ? totalPhotos / total : 0;

  Map<String, int> get byOrientation {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    final map = {for (final d in dirs) d: 0};
    for (final meta in allPhotoMeta) {
      final h = (meta['heading'] as num?)?.toDouble();
      if (h == null) continue;
      double deg = h % 360;
      if (deg < 0) deg += 360;
      final idx = ((deg + 22.5) / 45).floor() % 8;
      map[dirs[idx]] = map[dirs[idx]]! + 1;
    }
    return map;
  }

  Map<String, int> get byZone {
    final map = <String, int>{};
    for (final r in reports) {
      if (r.address.isEmpty) continue;
      final parts = r.address.split(',');
      final zone =
          parts.length > 1 ? parts.last.trim() : parts.first.trim();
      if (zone.isEmpty) continue;
      map[zone] = (map[zone] ?? 0) + 1;
    }
    final entries = map.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    return Map.fromEntries(entries);
  }

  // ── build ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _sectionTitle('Resumo'),
        const SizedBox(height: 8),
        _summaryRow(),
        const SizedBox(height: 20),

        _sectionTitle('Por Estado'),
        const SizedBox(height: 8),
        _statusRow(),
        const SizedBox(height: 20),

        _sectionTitle('Por Categoria'),
        const SizedBox(height: 8),
        _categoryChart(),
        const SizedBox(height: 20),

        _sectionTitle('Evolução Mensal'),
        const SizedBox(height: 8),
        _monthlyChart(),
        const SizedBox(height: 20),

        _sectionTitle('Fotografias'),
        const SizedBox(height: 8),
        _photosRow(),
        const SizedBox(height: 20),

        _sectionTitle('Rosa dos Ventos'),
        const SizedBox(height: 2),
        const Text('Distribuição das orientações das fotografias',
            style: TextStyle(color: Colors.white38, fontSize: 12)),
        const SizedBox(height: 8),
        _compassRose(),
        const SizedBox(height: 20),

        _sectionTitle('Zonas com mais Denúncias'),
        const SizedBox(height: 8),
        _zonesSection(),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _sectionTitle(String text) => Text(
        text,
        style: const TextStyle(
            color: Colors.white,
            fontSize: 16,
            fontWeight: FontWeight.bold),
      );

  // ── summary ───────────────────────────────────────────────────────────────

  Widget _summaryRow() => Row(
        children: [
          Expanded(
              child: _StatCard(
                  label: 'Total', value: '$total', color: Colors.white)),
          const SizedBox(width: 12),
          Expanded(
              child: _StatCard(
                  label: 'Resolução',
                  value: '${resolutionPct.toStringAsFixed(0)}%',
                  color: Colors.greenAccent)),
        ],
      );

  Widget _statusRow() => Row(
        children: [
          Expanded(
              child: _StatCard(
                  label: 'Pendentes',
                  value: '$pending',
                  color: kOrange)),
          const SizedBox(width: 8),
          Expanded(
              child: _StatCard(
                  label: 'Em análise',
                  value: '$inProgress',
                  color: Colors.lightBlueAccent)),
          const SizedBox(width: 8),
          Expanded(
              child: _StatCard(
                  label: 'Resolvidas',
                  value: '$resolved',
                  color: Colors.greenAccent)),
        ],
      );

  // ── category pie ──────────────────────────────────────────────────────────

  Widget _categoryChart() {
    final entries = byCategory.entries.toList();
    if (entries.isEmpty) return const SizedBox.shrink();

    final sections = entries.asMap().entries.map((e) {
      final color = _palette[e.key % _palette.length];
      return PieChartSectionData(
        value: e.value.value.toDouble(),
        color: color,
        title: '${e.value.value}',
        titleStyle: const TextStyle(
            color: Colors.white,
            fontSize: 12,
            fontWeight: FontWeight.bold),
        radius: 65,
      );
    }).toList();

    return _ChartCard(
      child: Column(
        children: [
          SizedBox(
            height: 200,
            child: PieChart(PieChartData(
                sections: sections,
                sectionsSpace: 2,
                centerSpaceRadius: 30)),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 10,
            runSpacing: 6,
            children: entries.asMap().entries.map((e) {
              final color = _palette[e.key % _palette.length];
              return Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(
                          color: color, shape: BoxShape.circle)),
                  const SizedBox(width: 4),
                  Text(e.value.key,
                      style: const TextStyle(
                          color: Colors.white54, fontSize: 11)),
                ],
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  // ── monthly bar chart ─────────────────────────────────────────────────────

  Widget _monthlyChart() {
    final data = byMonth;
    final maxVal =
        data.map((e) => e.value).fold(0, max).toDouble();

    final groups = data.asMap().entries.map((e) {
      return BarChartGroupData(
        x: e.key,
        barRods: [
          BarChartRodData(
            toY: e.value.value.toDouble(),
            color: kOrange,
            width: 22,
            borderRadius: BorderRadius.circular(4),
          ),
        ],
      );
    }).toList();

    return _ChartCard(
      child: SizedBox(
        height: 180,
        child: BarChart(BarChartData(
          maxY: maxVal < 1 ? 2 : maxVal + 1,
          barGroups: groups,
          gridData: FlGridData(
            show: true,
            drawVerticalLine: false,
            getDrawingHorizontalLine: (_) =>
                const FlLine(color: Colors.white12, strokeWidth: 1),
          ),
          borderData: FlBorderData(show: false),
          titlesData: FlTitlesData(
            leftTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 24,
                interval: 1,
                getTitlesWidget: (v, _) => Text(
                  v.toInt().toString(),
                  style: const TextStyle(
                      color: Colors.white38, fontSize: 10),
                ),
              ),
            ),
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 20,
                getTitlesWidget: (v, _) {
                  final idx = v.toInt();
                  if (idx < 0 || idx >= data.length) {
                    return const SizedBox.shrink();
                  }
                  return Text(
                    DateFormat('MMM').format(data[idx].key),
                    style: const TextStyle(
                        color: Colors.white54, fontSize: 10),
                  );
                },
              ),
            ),
            topTitles: const AxisTitles(
                sideTitles: SideTitles(showTitles: false)),
            rightTitles: const AxisTitles(
                sideTitles: SideTitles(showTitles: false)),
          ),
        )),
      ),
    );
  }

  // ── photos ────────────────────────────────────────────────────────────────

  Widget _photosRow() => Row(
        children: [
          Expanded(
              child: _StatCard(
                  label: 'Total fotos',
                  value: '$totalPhotos',
                  color: Colors.lightBlueAccent)),
          const SizedBox(width: 12),
          Expanded(
              child: _StatCard(
                  label: 'Média/denúncia',
                  value: avgPhotos.toStringAsFixed(1),
                  color: Colors.lightBlueAccent)),
        ],
      );

  // ── compass rose (radar chart) ────────────────────────────────────────────

  Widget _compassRose() {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    final data = byOrientation;
    final maxVal = data.values.fold(0, max).toDouble();

    if (maxVal == 0) {
      return _ChartCard(
        child: const SizedBox(
          height: 200,
          child: Center(
            child: Text('Sem dados de orientação',
                style: TextStyle(color: Colors.white38)),
          ),
        ),
      );
    }

    return _ChartCard(
      child: SizedBox(
        height: 240,
        child: RadarChart(
          RadarChartData(
            radarShape: RadarShape.polygon,
            tickCount: 3,
            ticksTextStyle: const TextStyle(
                color: Colors.transparent, fontSize: 0),
            tickBorderData:
                const BorderSide(color: Colors.white12, width: 1),
            gridBorderData:
                const BorderSide(color: Colors.white12, width: 1),
            radarBorderData:
                const BorderSide(color: Colors.white24, width: 1),
            titleTextStyle:
                const TextStyle(color: Colors.white54, fontSize: 12),
            getTitle: (index, angle) =>
                RadarChartTitle(text: dirs[index], angle: 0),
            dataSets: [
              RadarDataSet(
                dataEntries: dirs
                    .map((d) =>
                        RadarEntry(value: data[d]!.toDouble()))
                    .toList(),
                fillColor: kOrange.withOpacity(0.25),
                borderColor: kOrange,
                borderWidth: 2,
                entryRadius: 3,
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── zones ─────────────────────────────────────────────────────────────────

  Widget _zonesSection() {
    final zones = byZone.entries.take(5).toList();
    if (zones.isEmpty) {
      return const Text('Sem dados de zona',
          style: TextStyle(color: Colors.white38));
    }
    final maxCount = zones.first.value;

    return _ChartCard(
      child: Column(
        children: zones.asMap().entries.map((entry) {
          final i = entry.key;
          final zone = entry.value;
          final pct = maxCount > 0 ? zone.value / maxCount : 0.0;
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        '${i + 1}. ${zone.key}',
                        style: const TextStyle(
                            color: Colors.white70, fontSize: 13),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Text('${zone.value}',
                        style: const TextStyle(
                            color: kOrange,
                            fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 5),
                LinearProgressIndicator(
                  value: pct,
                  backgroundColor: Colors.white12,
                  valueColor: AlwaysStoppedAnimation<Color>(
                      _palette[i % _palette.length]),
                  minHeight: 6,
                  borderRadius: BorderRadius.circular(3),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }
}

// ── reusable widgets ──────────────────────────────────────────────────────────

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _StatCard(
      {required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.07),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.4)),
      ),
      child: Column(
        children: [
          Text(value,
              style: TextStyle(
                  color: color,
                  fontSize: 26,
                  fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          Text(label,
              style: const TextStyle(
                  color: Colors.white54, fontSize: 12)),
        ],
      ),
    );
  }
}

class _ChartCard extends StatelessWidget {
  final Widget child;
  const _ChartCard({required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.07),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white12),
      ),
      child: child,
    );
  }
}
