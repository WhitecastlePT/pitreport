import 'package:cloud_firestore/cloud_firestore.dart';

class Report {
  final String id;
  final String title;
  final String description;
  final String category;
  final List<String> imageUrls;
  final double latitude;
  final double longitude;
  final String address;
  final String status;
  final DateTime createdAt;
  final String userId;
  final double? heading;
  final String headingLabel;
  final List<Map<String, dynamic>> photoMetadata;

  Report({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.imageUrls,
    required this.latitude,
    required this.longitude,
    required this.address,
    required this.status,
    required this.createdAt,
    required this.userId,
    this.heading,
    this.headingLabel = '',
    this.photoMetadata = const [],
  });

  factory Report.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Report(
      id: doc.id,
      title: data['title'] ?? '',
      description: data['description'] ?? '',
      category: data['category'] ?? '',
      imageUrls: data['imageUrls'] != null
          ? List<String>.from(data['imageUrls'])
          : (data['imageUrl'] != null ? [data['imageUrl'] as String] : []),
      latitude: (data['latitude'] ?? 0).toDouble(),
      longitude: (data['longitude'] ?? 0).toDouble(),
      address: data['address'] ?? '',
      status: data['status'] ?? 'pending',
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      userId: data['userId'] ?? '',
      heading: (data['heading'] as num?)?.toDouble(),
      headingLabel: data['headingLabel'] ?? '',
      photoMetadata: (data['photoMetadata'] as List<dynamic>?)
              ?.map((e) => Map<String, dynamic>.from(e as Map))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'title': title,
      'description': description,
      'category': category,
      'imageUrls': imageUrls,
      'latitude': latitude,
      'longitude': longitude,
      'address': address,
      'status': status,
      'createdAt': FieldValue.serverTimestamp(),
      'userId': userId,
      if (heading != null) 'heading': heading,
      'headingLabel': headingLabel,
      'photoMetadata': photoMetadata,
    };
  }
}
