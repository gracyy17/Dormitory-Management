# Dormitory Email Backend (REST/API)

This service sends automated due reminder emails using SMTP + Firestore.

## Endpoints

- `GET /health`
- `POST /api/email/test`
- `POST /api/reminders/run`
- `POST /api/reminders/scheduled`

## Setup

1. Open this folder:
   - `cd email-backend`
2. Install dependencies:
   - `npm install`
3. Copy env template:
   - copy `.env.example` to `.env`
4. Fill required env values:
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
   - `FIREBASE_SERVICE_ACCOUNT_JSON` (single-line JSON)
   - `ALLOWED_ORIGINS` include your frontend URL (for example `https://dorm-27fe2-eb047.web.app`)
5. Run locally:
   - `npm run dev`

## Frontend Connection

Set this in root frontend env:

- `VITE_SEND_DUE_REMINDERS_URL=http://localhost:5001/api/reminders/run`

For deployed backend, replace with your live API URL.

## Auth

- `POST /api/reminders/run` expects Firebase ID token by default:
  - `Authorization: Bearer <idToken>`
- This matches current admin frontend behavior.
- To disable token requirement (not recommended), set:
  - `REQUIRE_ADMIN_AUTH=false`

## Scheduler

Internal cron can run daily reminders.

- `ENABLE_INTERNAL_CRON=true`
- `CRON_SCHEDULE=0 9 * * *`
- `CRON_TIMEZONE=Asia/Manila`

You can also trigger externally via:

- `POST /api/reminders/scheduled`
- Header: `x-cron-secret: <CRON_SECRET>`

## Security Notes

- Never commit `.env`.
- If any SMTP password was exposed, rotate it immediately.
- Keep `REQUIRE_ADMIN_AUTH=true` in production.
