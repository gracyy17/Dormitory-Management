# Dormitory-Management

A modern web app for dormitory management, built with React and Vite.

**ADMIN:** https://dorm-27fe2-eb047.web.app/admin/login
**TENANT:**dorm-27fe2-eb047.web.app/tenant/login

**Credentials**
admin-email: septimogracey@gmail.com 
admin-password: admin123

tenant-email: ztzu02@gmail.com 
tenant-password: hellene123
## Features
- **Public Website**: Mobile-friendly, clean design for visitors
- **Role-Based Login (Firebase Auth + Firestore)**
  - **Client/Admin** login at `/admin/login`
  - **Tenant** login at `/tenant/login`
  - Access control based on `users/{uid}.role` in Firestore (`admin` or `tenant`)
- **Admin Dashboard**: Private workspace for the client
  - Rooms management with filters and room details modal
  - Summary cards, tables, badges, and activity feed
- **Tenant Portal**
  - Dues view (`/tenant/dues`)
  - Maintenance view (`/tenant/maintenance`)
  - Profile view (`/tenant/profile`)
- **API Integration**: All admin actions (create, edit, delete, upload) are connected to backend endpoints

## Project Structure
- `src/components/public` — Public-facing components
- `src/components/admin` — Admin dashboard components
- `src/components/common` — Shared components
- `src/pages` — Route-level components
- `src/api` — API utilities
- `src/styles` — CSS modules and styles

## Getting Started
1. Clone the repo: `git clone https://github.com/gracyy17/Dormitory-Management.git`
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and fill in your Firebase project values
  - Add `VITE_PAYMONGO_CHECKOUT_URL` with your PayMongo payment link/checkout URL
  - Add `VITE_GCASH_QR_IMAGE_URL` with your admin GCash QR image URL
  - (Phase 2) Add `VITE_PAYMENT_VERIFY_API_URL` for automatic reference-number verification API
4. Create Firestore documents in `users/{uid}` with:
  - `role: "admin"` for client/admin accounts
  - `role: "tenant"` for tenant accounts
5. Start development server: `npm run dev`

## Firebase Hosting Deployment
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login to Firebase: `firebase login`
3. Build the app: `npm run build`
4. Deploy to your hosting target: `firebase deploy --only hosting:dorm-27fe2-eb047`

The project already includes:
- `firebase.json` configured for Vite output (`dist`) and SPA rewrites
- `.firebaserc` with project `dorm-27fe2` and hosting target `dorm-27fe2-eb047`

## API Endpoints (expected by frontend)
- `POST   /api/items`         — Create item
- `PUT    /api/items/:id`     — Edit item
- `DELETE /api/items/:id`     — Delete item
- `POST   /api/upload`        — Upload image

---
Replace placeholder content and connect to your backend as needed.

## PayMongo Notes
- PayMongo account setup has no setup or monthly fee on standard plans.
- Live payments are charged per successful transaction (MDR/processing fees apply).
- This project uses a redirect-style checkout link via `VITE_PAYMONGO_CHECKOUT_URL` for frontend-only integration.

## GCash Receipt Verification Flow
- Phase 1: Tenant scans GCash QR, uploads receipt image, submits reference number, then admin reviews via `/admin/payments`.
- Phase 2: If `VITE_PAYMENT_VERIFY_API_URL` is configured, receipt reference gets auto-checked before admin review.

## Due Reminder Notifications (Email)
- Backend job is implemented in `functions/index.js`.
- `sendDueRemindersScheduled`: runs every day at 9:00 AM (Asia/Manila).
- `sendDueRemindersNow`: manual HTTP trigger for testing.
- Admin UI trigger is available in `/admin/payments` via "Send Reminder Emails Now".

## REST Email Backend (Alternative)
- A standalone REST/API email backend is included at `email-backend/`.
- Use this when Firebase Functions deployment is unavailable or when you prefer a separate backend.

### Quick start
1. `cd email-backend`
2. `npm install`
3. Copy `email-backend/.env.example` to `email-backend/.env`
4. Fill SMTP and Firebase service account values
5. Start backend: `npm run dev`

### Connect frontend
- Set in root `.env`:
  - `VITE_SEND_DUE_REMINDERS_URL=http://localhost:5001/api/reminders/run`
- For production, replace with your deployed backend URL.

### Data expected by reminder job
- Collection: `dues`
- Each due document should include:
  - `tenantUid` (string)
  - `amount` (string or number)
  - `dueDate` (Firestore timestamp or ISO date string)
  - `billingMonth` (string)
  - `status` (`Pending` or `Overdue`)
- Tenant contact data is read from `users/{uid}` (`email`, `notifyEmail`).

### Deploy Functions
1. Install dependencies: `cd functions && npm install`
2. Set runtime environment values for providers (examples below)
3. Deploy: `npx firebase-tools deploy --only functions`
4. (Optional) Set `VITE_SEND_DUE_REMINDERS_URL` in frontend `.env` for custom function endpoint URL.

### Email provider environment values (examples)
- Email:
  - `EMAIL_API_URL`
  - `EMAIL_API_KEY`
  - `EMAIL_FROM`

Use your provider's API endpoint (e.g., SendGrid/Resend for email).
