import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../models/report.dart';
import '../screens/report_detail_screen.dart';

@pragma('vm:entry-point')
Future<void> _backgroundHandler(RemoteMessage message) async {}

class NotificationService {
  static final FlutterLocalNotificationsPlugin _local =
      FlutterLocalNotificationsPlugin();
  static GlobalKey<NavigatorState>? _navigatorKey;

  static const AndroidNotificationChannel _channel = AndroidNotificationChannel(
    'pitreport_status',
    'Atualizações de Denúncias',
    description: 'Notificações de alteração de estado das denúncias',
    importance: Importance.high,
  );

  static Future<void> initialize(GlobalKey<NavigatorState> navigatorKey) async {
    _navigatorKey = navigatorKey;

    FirebaseMessaging.onBackgroundMessage(_backgroundHandler);

    await FirebaseMessaging.instance.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    const initSettings = InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
    );
    await _local.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (details) {
        if (details.payload != null) _navigateToReport(details.payload!);
      },
    );

    await _local
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(_channel);

    // App em background — utilizador tocou na notificação
    FirebaseMessaging.onMessageOpenedApp.listen((message) {
      final reportId = message.data['reportId'] as String?;
      if (reportId != null) _navigateToReport(reportId);
    });

    // App fechada — utilizador tocou na notificação
    final initial = await FirebaseMessaging.instance.getInitialMessage();
    if (initial != null) {
      final reportId = initial.data['reportId'] as String?;
      if (reportId != null) {
        Future.delayed(
          const Duration(seconds: 2),
          () => _navigateToReport(reportId),
        );
      }
    }

    FirebaseMessaging.onMessage.listen(_showLocal);
  }

  static Future<String?> getToken() =>
      FirebaseMessaging.instance.getToken();

  static Future<void> _navigateToReport(String reportId) async {
    try {
      final doc = await FirebaseFirestore.instance
          .collection('reports')
          .doc(reportId)
          .get();
      if (!doc.exists) return;
      final report = Report.fromFirestore(doc);
      _navigatorKey?.currentState?.push(
        MaterialPageRoute(builder: (_) => ReportDetailScreen(report: report)),
      );
    } catch (_) {}
  }

  static void _showLocal(RemoteMessage message) {
    final n = message.notification;
    if (n == null) return;
    _local.show(
      n.hashCode,
      n.title,
      n.body,
      NotificationDetails(
        android: AndroidNotificationDetails(
          _channel.id,
          _channel.name,
          channelDescription: _channel.description,
          importance: Importance.high,
          priority: Priority.high,
        ),
      ),
      payload: message.data['reportId'] as String?,
    );
  }
}
