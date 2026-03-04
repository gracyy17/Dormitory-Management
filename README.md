# Dormitory-Management

A modern web app for dormitory management, built with React and Vite.

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
