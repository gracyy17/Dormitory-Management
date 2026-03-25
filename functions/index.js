const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onRequest } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const EMAIL_API_URL = process.env.EMAIL_API_URL || '';
const EMAIL_API_KEY = process.env.EMAIL_API_KEY || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@dormitory.local';

function normalizeDate(value) {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (value instanceof Date) return value;
  return null;
}

function shouldSkipDuplicateReminder(lastNotifiedAt) {
  if (!lastNotifiedAt) return false;
  const last = normalizeDate(lastNotifiedAt);
  if (!last) return false;

  const now = new Date();
  const diffMs = now.getTime() - last.getTime();
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;

  return diffMs < twentyFourHoursMs;
}

async function sendEmailReminder({ to, subject, message }) {
  if (!EMAIL_API_URL || !EMAIL_API_KEY || !to) return false;

  try {
    const response = await fetch(EMAIL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${EMAIL_API_KEY}`,
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to,
        subject,
        text: message,
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

async function processDueReminders() {
  const today = new Date();
  const dueSnapshot = await db
    .collection('dues')
    .where('status', 'in', ['Pending', 'Overdue'])
    .get();

  let checked = 0;
  let emailSent = 0;
  const emailProviderConfigured = Boolean(EMAIL_API_URL && EMAIL_API_KEY);

  for (const dueDoc of dueSnapshot.docs) {
    checked += 1;
    const due = dueDoc.data();

    const dueDate = normalizeDate(due.dueDate);
    if (!dueDate || dueDate > today) {
      continue;
    }

    if (shouldSkipDuplicateReminder(due.lastNotifiedAt)) {
      continue;
    }

    const tenantUid = due.tenantUid;
    if (!tenantUid) {
      continue;
    }

    const userSnap = await db.collection('users').doc(tenantUid).get();
    if (!userSnap.exists) {
      continue;
    }

    const user = userSnap.data() || {};
    const tenantName = user.fullName || user.email || 'Tenant';

    const amount = due.amount || 'N/A';
    const dueDateText = dueDate.toISOString().slice(0, 10);
    const billingMonth = due.billingMonth || 'Current Bill';

    const message = `Hi ${tenantName}, reminder: your dorm due (${billingMonth}) amount ${amount} is due on ${dueDateText}. Please settle your payment.`;

    const emailOk = user.notifyEmail !== false
      ? await sendEmailReminder({
          to: user.email,
          subject: `Dormitory Due Reminder - ${billingMonth}`,
          message,
        })
      : false;

    if (emailOk) {
      emailSent += 1;
    }

    await dueDoc.ref.set(
      {
        lastNotifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastNotifiedChannels: {
          email: emailOk,
        },
      },
      { merge: true }
    );
  }

  logger.info('Due reminders complete', { checked, emailSent, emailProviderConfigured });
  return { checked, emailSent, emailProviderConfigured };
}

async function isAdminUser(uid) {
  if (!uid) return false;
  const userSnap = await db.collection('users').doc(uid).get();
  if (!userSnap.exists) return false;
  const user = userSnap.data() || {};
  return user.role === 'admin';
}

exports.sendDueRemindersScheduled = onSchedule(
  {
    schedule: '0 9 * * *',
    timeZone: 'Asia/Manila',
    region: 'asia-southeast1',
  },
  async () => processDueReminders()
);

exports.sendDueRemindersNow = onRequest(
  {
    region: 'asia-southeast1',
    cors: true,
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ message: 'Method not allowed' });
      return;
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

    if (!token) {
      res.status(401).json({ message: 'Missing authorization token' });
      return;
    }

    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch {
      res.status(401).json({ message: 'Invalid authorization token' });
      return;
    }

    const isAdmin = await isAdminUser(decodedToken.uid);
    if (!isAdmin) {
      res.status(403).json({ message: 'Admin access required' });
      return;
    }

    const result = await processDueReminders();
    res.status(200).json({ ok: true, ...result });
  }
);

exports.deleteUserAccountNow = onRequest(
  {
    region: 'asia-southeast1',
    cors: true,
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ message: 'Method not allowed' });
      return;
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

    if (!token) {
      res.status(401).json({ message: 'Missing authorization token' });
      return;
    }

    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch {
      res.status(401).json({ message: 'Invalid authorization token' });
      return;
    }

    const isAdmin = await isAdminUser(decodedToken.uid);
    if (!isAdmin) {
      res.status(403).json({ message: 'Admin access required' });
      return;
    }

    const targetUid = String(req.body?.targetUid || '').trim();
    if (!targetUid) {
      res.status(400).json({ message: 'targetUid is required' });
      return;
    }

    if (targetUid === decodedToken.uid) {
      res.status(400).json({ message: 'You cannot delete your own admin account.' });
      return;
    }

    const targetUserRef = db.collection('users').doc(targetUid);
    const targetUserSnap = await targetUserRef.get();

    if (!targetUserSnap.exists) {
      res.status(404).json({ message: 'User record not found' });
      return;
    }

    const targetUser = targetUserSnap.data() || {};
    const roomNo = String(targetUser.roomNo || '').trim();

    try {
      const duesSnap = await db.collection('dues').where('tenantUid', '==', targetUid).get();
      for (const dueDoc of duesSnap.docs) {
        await dueDoc.ref.delete();
      }

      const paymentsSnap = await db.collection('payments').where('tenantUid', '==', targetUid).get();
      for (const paymentDoc of paymentsSnap.docs) {
        await paymentDoc.ref.delete();
      }

      const maintenanceSnap = await db.collection('maintenanceRequests').where('tenantUid', '==', targetUid).get();
      for (const maintenanceDoc of maintenanceSnap.docs) {
        await maintenanceDoc.ref.delete();
      }

      if (roomNo) {
        const roomsSnap = await db.collection('rooms').where('roomNo', '==', roomNo).get();
        for (const roomDoc of roomsSnap.docs) {
          const roomData = roomDoc.data() || {};
          const capacity = Number(roomData.capacity || 0);
          const occupiedBeds = Math.max(0, Number(roomData.occupiedBeds || 0) - 1);

          let status = 'Available';
          if (String(roomData.status || '') === 'Maintenance') {
            status = 'Maintenance';
          } else if (occupiedBeds >= capacity && capacity > 0) {
            status = 'Occupied';
          }

          await roomDoc.ref.set(
            {
              occupiedBeds,
              status,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        }
      }

      await targetUserRef.delete();

      try {
        await admin.auth().deleteUser(targetUid);
      } catch (authError) {
        const code = String(authError?.code || '');
        if (!code.includes('user-not-found')) {
          throw authError;
        }
      }

      res.status(200).json({ ok: true, message: 'User permanently deleted.' });
    } catch (error) {
      logger.error('deleteUserAccountNow failed', {
        targetUid,
        actorUid: decodedToken.uid,
        error: error?.message || String(error),
      });
      res.status(500).json({ message: 'Failed to permanently delete user account.' });
    }
  }
);
