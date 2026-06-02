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

        let title;
        let body;
        switch (notif.type) {
          case 'feedback':
            title = 'Novo feedback na sua denúncia';
            body =
              notif.messageText ||
              `A sua denúncia "${notif.reportTitle}" recebeu um comentário`;
            break;
          case 'archived':
            title = 'Denúncia arquivada';
            body = `A sua denúncia "${notif.reportTitle}" foi arquivada. O caso foi tratado.`;
            break;
          case 'unarchived':
            title = 'Denúncia restaurada';
            body = `A sua denúncia "${notif.reportTitle}" foi restaurada e está novamente ativa.`;
            break;
          default:
            title = 'Denúncia atualizada';
            body = `"${notif.reportTitle}" → ${STATUS_LABELS[notif.newStatus] ?? notif.newStatus}`;
        }

        await messaging.send({
          token: fcmToken,
          notification: { title, body },
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
