import 'dart:io';
import 'package:firebase_storage/firebase_storage.dart';

class StorageService {
  final FirebaseStorage _storage = FirebaseStorage.instance;

  Future<String> uploadReportImage(File image, String userId) async {
    final fileName = '${DateTime.now().millisecondsSinceEpoch}.jpg';
    final ref = _storage.ref().child('reports/$userId/$fileName');
    await ref.putFile(image);
    return await ref.getDownloadURL();
  }

  Future<List<String>> uploadReportImages(List<File> images, String userId) async {
    final urls = <String>[];
    for (final image in images) {
      urls.add(await uploadReportImage(image, userId));
    }
    return urls;
  }
}
