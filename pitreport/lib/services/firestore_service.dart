import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:geoflutterfire_plus/geoflutterfire_plus.dart';
import '../models/report.dart';

class FirestoreService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  Future<void> createReport(Report report) async {
    final data = report.toMap();
    final geo = GeoFirePoint(GeoPoint(report.latitude, report.longitude));
    data['geo'] = geo.data;
    await _db.collection('reports').add(data);
  }

  Stream<List<Report>> getUserReports(String userId) {
    return _db
        .collection('reports')
        .where('userId', isEqualTo: userId)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snap) => snap.docs.map(Report.fromFirestore).toList());
  }

  Stream<List<Report>> getAllReports() {
    return _db
        .collection('reports')
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snap) => snap.docs.map(Report.fromFirestore).toList());
  }

  Stream<List<Report>> getReportsInRadius({
    required double latitude,
    required double longitude,
    required double radiusKm,
  }) {
    final center = GeoFirePoint(GeoPoint(latitude, longitude));
    return GeoCollectionReference<Map<String, dynamic>>(
      _db.collection('reports'),
    )
        .subscribeWithin(
          center: center,
          radiusInKm: radiusKm,
          field: 'geo',
          geopointFrom: (data) =>
              (data['geo'] as Map<String, dynamic>)['geopoint'] as GeoPoint,
          strictMode: true,
        )
        .map((docs) => docs.map(Report.fromFirestore).toList());
  }

  /// Adiciona o campo 'geo' (geohash + geopoint) aos reports existentes
  /// que ainda não o têm. Chamar uma vez após fazer deploy desta versão.
  Future<void> migrateReportsGeohash() async {
    final snap = await _db.collection('reports').get();
    final batch = _db.batch();
    for (final doc in snap.docs) {
      final data = doc.data();
      if (data.containsKey('geo')) continue;
      final lat = (data['latitude'] as num?)?.toDouble();
      final lng = (data['longitude'] as num?)?.toDouble();
      if (lat == null || lng == null) continue;
      final geo = GeoFirePoint(GeoPoint(lat, lng));
      batch.update(doc.reference, {'geo': geo.data});
    }
    await batch.commit();
  }
}
