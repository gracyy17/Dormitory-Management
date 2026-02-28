# Dormitory-Management

A modern web app for dormitory management, built with React and Vite.

## Features
- **Public Website**: Mobile-friendly, clean design for visitors
- **Admin Dashboard**: Private editor for the client to manage content
  - Edit, add, update, and delete items (services/posts/products)
  - Upload images
  - Simple authentication for admin access
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
3. Start development server: `npm run dev`

## API Endpoints (expected by frontend)
- `POST   /api/items`         — Create item
- `PUT    /api/items/:id`     — Edit item
- `DELETE /api/items/:id`     — Delete item
- `POST   /api/upload`        — Upload image

---
Replace placeholder content and connect to your backend as needed.
