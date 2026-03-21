const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const admin = require('firebase-admin');
const fs = require('fs');

require('dotenv').config();

const {
  PORT = '5001',
  ALLOWED_ORIGINS = '',
  ENABLE_INTERNAL_CRON = 'true',
  CRON_SCHEDULE = '0 9 * * *',
  CRON_TIMEZONE = 'Asia/Manila',
  CRON_SECRET = '',
  SMTP_HOST,
  SMTP_PORT = '587',
  SMTP_SECURE = 'false',
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
  SMTP_FROM_NAME = 'MZ Dormitory',
  FIREBASE_SERVICE_ACCOUNT_JSON,
  FIREBASE_SERVICE_ACCOUNT_PATH,
  REMINDER_LEAD_DAYS = '7',
  REQUIRE_ADMIN_AUTH = 'true',
  TENANT_PORTAL_URL = 'https://dorm-27fe2-eb047.web.app/tenant/login',
  CONTACT_EMAIL = '',
  CONTACT_PHONE = '',
  DORM_NAME = 'MZ Dormitory',
} = process.env;

function getAllowedOrigins() {
  const defaults = ['http://localhost:5173', 'http://127.0.0.1:5173'];
  const envOrigins = ALLOWED_ORIGINS
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return Array.from(new Set([...defaults, ...envOrigins]));
}

function parseBoolean(value, fallback = false) {
  if (typeof value !== 'string') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function parseNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatCurrencyPhp(value) {
  const amount = parseNumber(value, 0);
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatLongDate(value) {
  const date = normalizeDate(value);
  if (!date) return 'N/A';

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function createFirebaseApp() {
  if (admin.apps.length) return admin.app();

  if (FIREBASE_SERVICE_ACCOUNT_JSON) {
    const parsed = JSON.parse(FIREBASE_SERVICE_ACCOUNT_JSON);
    return admin.initializeApp({
      credential: admin.credential.cert(parsed),
    });
  }

  if (FIREBASE_SERVICE_ACCOUNT_PATH) {
    const raw = fs.readFileSync(FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return admin.initializeApp({
      credential: admin.credential.cert(parsed),
    });
  }

  return admin.initializeApp();
}

function normalizeDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function shouldSkipDuplicateReminder(lastNotifiedAt) {
  const previous = normalizeDate(lastNotifiedAt);
  if (!previous) return false;

  const now = Date.now();
  const diffMs = now - previous.getTime();
  return diffMs < 24 * 60 * 60 * 1000;
}

function canSendNow(dueDate) {
  const parsed = normalizeDate(dueDate);
  if (!parsed) return false;

  const leadDays = Math.max(0, parseNumber(REMINDER_LEAD_DAYS, 7));
  const leadWindowMs = leadDays * 24 * 60 * 60 * 1000;
  const now = Date.now();

  return parsed.getTime() - now <= leadWindowMs;
}

function getTransporter() {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: parseBoolean(SMTP_SECURE, false),
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    connectionTimeout: 10000,
  });
}

const app = express();
const allowedOrigins = getAllowedOrigins();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-cron-secret'],
  })
);
app.use(express.json());

createFirebaseApp();
const db = admin.firestore();

const transporter = getTransporter();

async function isAdminFromToken(authHeader) {
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return { ok: false, message: 'Missing authorization token' };

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const userSnap = await db.collection('users').doc(decoded.uid).get();
    if (!userSnap.exists) return { ok: false, message: 'Admin user profile not found' };

    const user = userSnap.data() || {};
    if (user.role !== 'admin') return { ok: false, message: 'Admin access required' };

    return { ok: true, uid: decoded.uid };
  } catch {
    return { ok: false, message: 'Invalid authorization token' };
  }
}

async function sendEmailReminder({ to, subject, text }) {
  if (!to || !SMTP_FROM) return { ok: false, message: 'Missing recipient or SMTP_FROM' };

  try {
    await transporter.sendMail({
      from: `"${SMTP_FROM_NAME}" <${SMTP_FROM}>`,
      to,
      subject,
      text,
    });

    return { ok: true };
  } catch (error) {
    return { ok: false, message: error?.message || 'SMTP send failed' };
  }
}

function buildDueReminderMessage({
  tenantName,
  billingPeriod,
  dueDate,
  amount,
  isOverdue,
  lateFee = 0,
}) {
  const safeTenantName = tenantName || 'Tenant';
  const safeBillingPeriod = billingPeriod || 'Current Billing Period';
  const safePortalUrl = TENANT_PORTAL_URL || '[Tenant Portal Link]';
  const safeContactEmail = CONTACT_EMAIL || SMTP_FROM || '[Contact Email]';
  const safeContactPhone = CONTACT_PHONE || '[Contact Phone Number]';
  const safeDormName = DORM_NAME || 'MZ Dormitory';

  const baseAmountText = formatCurrencyPhp(amount);
  const lateFeeText = formatCurrencyPhp(lateFee);
  const totalAmountText = formatCurrencyPhp(parseNumber(amount, 0) + parseNumber(lateFee, 0));
  const dueDateText = formatLongDate(dueDate);

  if (isOverdue) {
    return {
      subject: `URGENT: Overdue Payment Notice - ${safeBillingPeriod} Dormitory Fees`,
      text: `Dear ${safeTenantName},

This is an official notice that your dormitory account currently shows an outstanding balance for the ${safeBillingPeriod} billing cycle. As of our latest records, we have not received your payment.

Please review your past-due account details below:

Billing Period: ${safeBillingPeriod}

Original Due Date: ${dueDateText}

Base Amount Due: ${baseAmountText}

Late Fee (if applicable): ${lateFeeText}

Total Balance Due: ${totalAmountText}

To ensure your account remains in good standing and to avoid any further penalties or service interruptions, please settle this balance immediately. You can securely process your payment by logging into your account here: ${safePortalUrl}.

If you have already submitted your payment within the last 24 hours, please disregard this notice and accept our thanks.

If you are experiencing issues with the payment gateway or believe you have received this notice in error, please contact the administration office immediately so we can assist you.

Sincerely,

Management Team
${safeDormName}
${safeContactEmail}
${safeContactPhone}`,
    };
  }

  return {
    subject: `Notice of Payment Due: Dormitory Fees for ${safeBillingPeriod}`,
    text: `Dear ${safeTenantName},

This email serves as a formal reminder regarding your upcoming dormitory fees for the billing month of ${safeBillingPeriod}.

Please be advised of your current statement details:

Billing Period: ${safeBillingPeriod}

Amount Due: ${baseAmountText}

Due Date: ${dueDateText}

We kindly request that you settle your account on or before the stated due date to avoid any late fees. You may securely process your payment by logging into the Tenant Portal: ${safePortalUrl}.

If you have already submitted your payment, please disregard this notice. Should you have any questions or require assistance, please do not hesitate to contact our administration office.

Thank you for being a valued resident of ${safeDormName}.

Sincerely,

Management Team
${safeDormName}
${safeContactEmail}
${safeContactPhone}`,
  };
}

async function processDueReminders({ dryRun = false, forceSend = false } = {}) {
  const dueSnapshot = await db
    .collection('dues')
    .where('status', 'in', ['Pending', 'Overdue'])
    .get();

  let checked = 0;
  let eligible = 0;
  let emailSent = 0;
  let skipped = 0;

  const failures = [];

  for (const dueDoc of dueSnapshot.docs) {
    checked += 1;
    const due = dueDoc.data() || {};

    if (!forceSend && !canSendNow(due.dueDate)) {
      skipped += 1;
      continue;
    }

    if (shouldSkipDuplicateReminder(due.lastNotifiedAt)) {
      skipped += 1;
      continue;
    }

    if (!due.tenantUid) {
      skipped += 1;
      continue;
    }

    const userSnap = await db.collection('users').doc(due.tenantUid).get();
    if (!userSnap.exists) {
      skipped += 1;
      continue;
    }

    const tenant = userSnap.data() || {};
    if (!tenant.email || tenant.notifyEmail === false) {
      skipped += 1;
      continue;
    }

    eligible += 1;

    const tenantName = tenant.fullName || tenant.email || 'Tenant';
    const dueDate = normalizeDate(due.dueDate);
    const billingPeriod = due.billingMonth || 'Current Billing Period';
    const amount = parseNumber(due.amount, 0);
    const lateFee = parseNumber(due.lateFee ?? due.penaltyAmount, 0);
    const isOverdue = String(due.status || '').toLowerCase() === 'overdue'
      || (dueDate ? dueDate.getTime() < Date.now() : false);

    const { subject, text } = buildDueReminderMessage({
      tenantName,
      billingPeriod,
      dueDate,
      amount,
      isOverdue,
      lateFee,
    });

    if (dryRun) {
      continue;
    }

    const sendResult = await sendEmailReminder({
      to: tenant.email,
      subject,
      text,
    });

    if (sendResult.ok) {
      emailSent += 1;
      await dueDoc.ref.set(
        {
          lastNotifiedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastNotifiedChannels: { email: true },
        },
        { merge: true }
      );
    } else {
      failures.push({
        dueId: dueDoc.id,
        email: tenant.email,
        message: sendResult.message,
      });
    }
  }

  return {
    checked,
    eligible,
    emailSent,
    skipped,
    dryRun,
    forceSend,
    failures,
  };
}

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'dormitory-email-backend',
    timestamp: new Date().toISOString(),
    smtpConfigured: Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS && SMTP_FROM),
  });
});

app.post('/api/email/test', async (req, res) => {
  const { to } = req.body || {};
  if (!to) {
    res.status(400).json({ ok: false, message: 'Missing test recipient email' });
    return;
  }

  const result = await sendEmailReminder({
    to,
    subject: 'MZ Dormitory Email Test',
    text: 'If you received this, your REST email backend is working.',
  });

  if (!result.ok) {
    res.status(500).json({ ok: false, message: result.message });
    return;
  }

  res.json({ ok: true, message: `Test email sent to ${to}` });
});

app.post('/api/reminders/run', async (req, res) => {
  if (parseBoolean(REQUIRE_ADMIN_AUTH, true)) {
    const authCheck = await isAdminFromToken(req.headers.authorization || '');
    if (!authCheck.ok) {
      res.status(401).json({ ok: false, message: authCheck.message });
      return;
    }
  }

  try {
    const result = await processDueReminders({
      dryRun: Boolean(req.body?.dryRun),
      forceSend: Boolean(req.body?.forceSend),
    });
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, message: error?.message || 'Failed to process reminders' });
  }
});

app.post('/api/reminders/scheduled', async (req, res) => {
  if (!CRON_SECRET || req.headers['x-cron-secret'] !== CRON_SECRET) {
    res.status(401).json({ ok: false, message: 'Invalid cron secret' });
    return;
  }

  try {
    const result = await processDueReminders();
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, message: error?.message || 'Failed scheduled reminder run' });
  }
});

if (parseBoolean(ENABLE_INTERNAL_CRON, true)) {
  cron.schedule(
    CRON_SCHEDULE,
    async () => {
      try {
        const result = await processDueReminders();
        console.log('[cron] reminder run complete:', result);
      } catch (error) {
        console.error('[cron] reminder run failed:', error?.message || error);
      }
    },
    {
      timezone: CRON_TIMEZONE,
    }
  );
}

app.listen(Number(PORT), () => {
  console.log(`Email backend listening on port ${PORT}`);
  console.log('Allowed origins:', allowedOrigins.join(', '));
});
