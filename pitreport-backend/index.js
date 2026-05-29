const admin = require('firebase-admin');
const express = require('express');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();
const messaging = admin.messaging();
const app = express();

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const STATUS_LABELS = {
  pending: 'Pendente',
  in_progress: 'Em progresso',
  resolved: 'Resolvido',
};

db.collection('notifications')
  .where('sent', '==', false)
  .onSnapshot(async (snapshot) => {
    for (const change of snapshot.docChanges()) {
      if (change.type !== 'added') continue;
      const notif = change.doc.data();

      try {
        const userDoc = await db.collection('users').doc(notif.userId).get();
        const fcmToken = userDoc.data()?.fcmToken;

        if (!fcmToken) {
          await change.doc.ref.update({ sent: true, error: 'no_token' });
          continue;
        }

        const isFeedback = notif.type === 'feedback';
        await messaging.send({
          token: fcmToken,
          notification: {
            title: isFeedback ? 'Novo feedback na sua denúncia' : 'Denúncia atualizada',
            body: isFeedback
              ? `A sua denúncia "${notif.reportTitle}" recebeu um comentário`
              : `"${notif.reportTitle}" → ${STATUS_LABELS[notif.newStatus] ?? notif.newStatus}`,
          },
          data: {
            reportId: notif.reportId,
            type: notif.type ?? 'status_change',
          },
        });

        await change.doc.ref.update({ sent: true });
        console.log(`FCM sent → user ${notif.userId}, report ${notif.reportId}`);
      } catch (err) {
        console.error('FCM error:', err.message);
        await change.doc.ref.update({ sent: true, error: err.message });
      }
    }
  });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`PitReport backend on port ${PORT}`));
