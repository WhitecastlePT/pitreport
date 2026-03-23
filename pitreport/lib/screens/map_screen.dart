import 'dart:async';
import 'dart:math';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import '../models/report.dart';
import '../services/firestore_service.dart';
import '../theme.dart';
import 'report_detail_screen.dart';

const _defaultPosition = LatLng(38.7169, -9.1395);

const _kCategories = [
  'Pavimento danificado',
  'Iluminação pública',
  'Resíduos/Lixo',
  'Vandalismo',
  'Sinalização',
  'Espaços verdes',
  'Outro',
];

class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final _mapController = MapController();
  LatLng _center = _defaultPosition;
  LatLng? _userPosition;
  bool _loading = true;

  List<Report> _reports = [];
  StreamSubscription<List<Report>>? _reportsSub;

  String? _expandedReportId;
  Report? _selectedReport;
  String? _filterStatus;
  String? _filterCategory;

  @override
  void initState() {
    super.initState();
    _locateUser();
    _loadReports();
  }

  @override
  void dispose() {
    _reportsSub?.cancel();
    _mapController.dispose();
    super.dispose();
  }

  void _loadReports() {
    final userId = FirebaseAuth.instance.currentUser!.uid;
    _reportsSub = FirestoreService().getUserReports(userId).listen((reports) {
      if (mounted) setState(() => _reports = reports);
    });
  }

  Future<void> _locateUser() async {
    try {
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.deniedForever ||
          permission == LocationPermission.denied) {
        if (mounted) setState(() => _loading = false);
        return;
      }
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.high,
            timeLimit: Duration(seconds: 10)),
      );
      if (mounted) {
        setState(() {
          _userPosition = LatLng(position.latitude, position.longitude);
          _center = _userPosition!;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<Report> get _filteredReports {
    return _reports.where((r) {
      if (_filterStatus != null && r.status != _filterStatus) return false;
      if (_filterCategory != null && r.category != _filterCategory) return false;
      return true;
    }).toList();
  }

  void _onReportTap(Report report) {
    setState(() {
      if (_expandedReportId == report.id) {
        _expandedReportId = null;
        _selectedReport = null;
      } else {
        _expandedReportId = report.id;
        _selectedReport = report;
        _mapController.move(LatLng(report.latitude, report.longitude), 16);
      }
    });
  }

  List<Marker> _buildMarkers() {
    final markers = <Marker>[];

    // Posição do utilizador
    if (_userPosition != null) {
      markers.add(Marker(
        point: _userPosition!,
        width: 32,
        height: 32,
        child: Container(
          decoration: BoxDecoration(
            color: Colors.blue,
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 2),
          ),
        ),
      ));
    }

    for (final report in _filteredReports) {
      final isExpanded = _expandedReportId == report.id;

      // Pin principal da denúncia
      markers.add(Marker(
        point: LatLng(report.latitude, report.longitude),
        width: 44,
        height: 44,
        child: GestureDetector(
          onTap: () => _onReportTap(report),
          child: Icon(
            Icons.location_pin,
            color: isExpanded ? Colors.amber : kOrange,
            size: 44,
          ),
        ),
      ));

      // Pins das fotos (apenas se expandido)
      if (isExpanded) {
        for (final meta in report.photoMetadata) {
          final lat = (meta['latitude'] as num?)?.toDouble();
          final lng = (meta['longitude'] as num?)?.toDouble();
          final heading = (meta['heading'] as num?)?.toDouble();
          if (lat == null || lng == null) continue;

          markers.add(Marker(
            point: LatLng(lat, lng),
            width: 34,
            height: 34,
            child: Container(
              decoration: BoxDecoration(
                color: const Color(0xFF1E2540),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.lightBlueAccent, width: 2),
              ),
              child: Transform.rotate(
                angle: (heading ?? 0) * (pi / 180),
                child: const Icon(Icons.navigation,
                    color: Colors.lightBlueAccent, size: 18),
              ),
            ),
          ));
        }
      }
    }

    return markers;
  }

  void _showCategoryFilter() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1E2540),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(16, 14, 16, 6),
              child: Text('Filtrar por categoria',
                  style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 15)),
            ),
            const Divider(color: Colors.white12),
            ListTile(
              title: const Text('Todas as categorias',
                  style: TextStyle(color: Colors.white)),
              trailing: _filterCategory == null
                  ? const Icon(Icons.check, color: kOrange)
                  : null,
              onTap: () {
                setState(() => _filterCategory = null);
                Navigator.pop(context);
              },
            ),
            ..._kCategories.map((cat) => ListTile(
                  title: Text(cat,
                      style: const TextStyle(color: Colors.white70)),
                  trailing: _filterCategory == cat
                      ? const Icon(Icons.check, color: kOrange)
                      : null,
                  onTap: () {
                    setState(() => _filterCategory = cat);
                    Navigator.pop(context);
                  },
                )),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: kOrange));
    }

    final cardVisible = _selectedReport != null;

    return Stack(
      children: [
        // Mapa
        FlutterMap(
          mapController: _mapController,
          options: MapOptions(
            initialCenter: _center,
            initialZoom: 15,
            onTap: (_, __) => setState(() {
              _expandedReportId = null;
              _selectedReport = null;
            }),
          ),
          children: [
            TileLayer(
              urlTemplate:
                  'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.example.pitreport',
            ),
            MarkerLayer(markers: _buildMarkers()),
          ],
        ),

        // Barra de filtros — topo
        Positioned(
          top: 8,
          left: 8,
          right: 8,
          child: _FilterBar(
            selectedStatus: _filterStatus,
            filterCategoryActive: _filterCategory != null,
            onStatusChanged: (s) => setState(() {
              _filterStatus = s;
              _expandedReportId = null;
              _selectedReport = null;
            }),
            onCategoryTap: _showCategoryFilter,
          ),
        ),

        // Botão localizar
        Positioned(
          bottom: cardVisible ? 180 : 16,
          right: 16,
          child: FloatingActionButton.small(
            heroTag: 'locate',
            backgroundColor: const Color(0xFF1E2540),
            onPressed: () {
              if (_userPosition != null) {
                _mapController.move(_userPosition!, 15);
              }
            },
            child:
                const Icon(Icons.my_location, color: Colors.white, size: 20),
          ),
        ),

        // Card da denúncia selecionada
        if (cardVisible)
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: _ReportCard(
              report: _selectedReport!,
              photoCount: _selectedReport!.photoMetadata.length,
              onClose: () => setState(() {
                _expandedReportId = null;
                _selectedReport = null;
              }),
              onDetail: () => Navigator.of(context).push(MaterialPageRoute(
                builder: (_) =>
                    ReportDetailScreen(report: _selectedReport!),
              )),
            ),
          ),
      ],
    );
  }
}

// ── Filter bar ────────────────────────────────────────────────────────────────

class _FilterBar extends StatelessWidget {
  final String? selectedStatus;
  final bool filterCategoryActive;
  final ValueChanged<String?> onStatusChanged;
  final VoidCallback onCategoryTap;

  const _FilterBar({
    required this.selectedStatus,
    required this.filterCategoryActive,
    required this.onStatusChanged,
    required this.onCategoryTap,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          _StatusChip(
            label: 'Todos',
            selected: selectedStatus == null,
            onTap: () => onStatusChanged(null),
          ),
          const SizedBox(width: 6),
          _StatusChip(
            label: 'Pendente',
            selected: selectedStatus == 'pending',
            color: kOrange,
            onTap: () => onStatusChanged(
                selectedStatus == 'pending' ? null : 'pending'),
          ),
          const SizedBox(width: 6),
          _StatusChip(
            label: 'Em análise',
            selected: selectedStatus == 'in_progress',
            color: Colors.lightBlueAccent,
            onTap: () => onStatusChanged(
                selectedStatus == 'in_progress' ? null : 'in_progress'),
          ),
          const SizedBox(width: 6),
          _StatusChip(
            label: 'Resolvido',
            selected: selectedStatus == 'resolved',
            color: Colors.greenAccent,
            onTap: () => onStatusChanged(
                selectedStatus == 'resolved' ? null : 'resolved'),
          ),
          const SizedBox(width: 8),
          // Botão categoria
          GestureDetector(
            onTap: onCategoryTap,
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
              decoration: BoxDecoration(
                color: filterCategoryActive
                    ? kOrange
                    : const Color(0xFF1E2540).withOpacity(0.9),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                    color: filterCategoryActive
                        ? kOrange
                        : Colors.white30),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.filter_list,
                      size: 14,
                      color: filterCategoryActive
                          ? Colors.white
                          : Colors.white70),
                  const SizedBox(width: 4),
                  Text('Categoria',
                      style: TextStyle(
                          fontSize: 12,
                          color: filterCategoryActive
                              ? Colors.white
                              : Colors.white70,
                          fontWeight: FontWeight.w600)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final String label;
  final bool selected;
  final Color color;
  final VoidCallback onTap;

  const _StatusChip({
    required this.label,
    required this.selected,
    this.color = Colors.white,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: selected
              ? color.withOpacity(0.9)
              : const Color(0xFF1E2540).withOpacity(0.9),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
              color: selected ? color : Colors.white30, width: 1.2),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: selected
                ? (color == Colors.white ? Colors.black87 : Colors.white)
                : Colors.white70,
          ),
        ),
      ),
    );
  }
}

// ── Report card (bottom sheet ao tocar no pin) ────────────────────────────────

class _ReportCard extends StatelessWidget {
  final Report report;
  final int photoCount;
  final VoidCallback onClose;
  final VoidCallback onDetail;

  const _ReportCard({
    required this.report,
    required this.photoCount,
    required this.onClose,
    required this.onDetail,
  });

  Color _statusColor(String s) {
    switch (s) {
      case 'in_progress':
        return Colors.lightBlueAccent;
      case 'resolved':
        return Colors.greenAccent;
      default:
        return kOrange;
    }
  }

  String _statusLabel(String s) {
    switch (s) {
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
    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFF1E2540),
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      child: SingleChildScrollView(
        child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Handle + fechar
          Row(
            children: [
              Expanded(
                child: Center(
                  child: Container(
                    width: 36,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.white24,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
              ),
              GestureDetector(
                onTap: onClose,
                child: const Icon(Icons.close,
                    color: Colors.white38, size: 20),
              ),
            ],
          ),
          const SizedBox(height: 10),
          // Badges
          Row(
            children: [
              _SmallBadge(
                  label: _statusLabel(report.status),
                  color: _statusColor(report.status)),
              const SizedBox(width: 6),
              _SmallBadge(
                  label: report.category,
                  color: Colors.white24,
                  textColor: Colors.white70),
            ],
          ),
          const SizedBox(height: 8),
          // Título
          Text(report.title,
              style: const TextStyle(
                  color: Colors.white,
                  fontSize: 15,
                  fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          // Morada
          if (report.address.isNotEmpty)
            Row(
              children: [
                const Icon(Icons.location_on_outlined,
                    size: 13, color: Colors.white38),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(report.address,
                      style: const TextStyle(
                          color: Colors.white38, fontSize: 12),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis),
                ),
              ],
            ),
          const SizedBox(height: 4),
          // Fotos
          Row(
            children: [
              const Icon(Icons.photo_camera_outlined,
                  size: 13, color: Colors.lightBlueAccent),
              const SizedBox(width: 4),
              Text(
                photoCount > 0
                    ? '$photoCount foto${photoCount > 1 ? 's' : ''} — pins azuis visíveis no mapa'
                    : 'Sem fotos com localização',
                style: const TextStyle(
                    color: Colors.lightBlueAccent, fontSize: 12),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Botão detalhe
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: onDetail,
              style: ElevatedButton.styleFrom(
                backgroundColor: kOrange,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10)),
              ),
              child: const Text('Ver Detalhe'),
            ),
          ),
        ],
      ),
      ),
    );
  }
}

class _SmallBadge extends StatelessWidget {
  final String label;
  final Color color;
  final Color textColor;

  const _SmallBadge(
      {required this.label,
      required this.color,
      this.textColor = Colors.black87});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withOpacity(0.85),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(label,
          style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: textColor)),
    );
  }
}
