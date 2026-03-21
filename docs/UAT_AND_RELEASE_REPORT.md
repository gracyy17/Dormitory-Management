# UAT and Release Report

Date: 2026-03-20
Project: Dormitory Management Web App
Environment: Firebase Hosting + Firestore (Production)
Live URL: https://dorm-27fe2-eb047.web.app

## Scope for this cycle
1. Admin Tenants page enhancements.
2. Tenant billing creation and visibility improvements.
3. Room and bed assignment workflow.
4. Admin controls for due status updates.

## Completed Features
1. Tenant creation now includes room assignment from available rooms only.
2. Tenant creation now includes bed selection from available bed slots only.
3. Tenant creation now includes billing fields:
- Billing Month
- Due Date
- Amount
4. New due record is created automatically at tenant onboarding.
5. Room occupied bed count is incremented on tenant creation.
6. Tenant payment overview table now displays:
- Tenant
- Assigned Room
- Billing Month
- Due Date
- Amount
- Payment Status
7. Admin can update due status directly from overview:
- Mark Paid
- Mark Pending
- Mark Overdue
8. Tenant overview now has filters and search:
- Search by tenant/email/room
- Filter by payment status
- Filter by room
9. Added validation for billing record quality:
- Billing month format check
- Due date validity check
- Amount range checks
- Duplicate billing record prevention (email + billing month)

## UAT Checklist

### A. Tenant Onboarding
1. Create tenant with valid inputs and available room/bed: PASS
2. Create tenant without selecting room: PASS (blocked with validation)
3. Create tenant without selecting bed: PASS (blocked with validation)
4. Create tenant with invalid billing month format: PASS (blocked)
5. Create tenant with invalid due date: PASS (blocked)
6. Create tenant with invalid amount (<=0): PASS (blocked)
7. Create tenant with duplicate email + billing month billing record: PASS (blocked)
8. Upload non-image profile picture: PASS (blocked)
9. Upload profile image > 300KB: PASS (blocked)

### B. Tenant Overview Table
1. Shows newly created tenant row: PASS
2. Shows assigned room correctly: PASS
3. Shows billing month correctly: PASS
4. Shows due date correctly: PASS
5. Shows amount correctly: PASS
6. Shows status Paid/Not Paid/Overdue correctly: PASS

### C. Admin Status Controls
1. Mark due as Paid from table action: PASS
2. Mark due as Pending from table action: PASS
3. Mark due as Overdue from table action: PASS
4. UI refreshes updated status from Firestore listener: PASS

### D. Filters and Search
1. Search by tenant name: PASS
2. Search by email: PASS
3. Search by room number: PASS
4. Filter by status: PASS
5. Filter by room: PASS
6. Combined filters + search: PASS

### E. Deployment and Build
1. Production build succeeds: PASS
2. Hosting deploy succeeds: PASS
3. Firestore rules deploy succeeds: PASS
4. Live app accessible via public URL: PASS

## Risks and Notes
1. Room occupancy increment is transaction-protected for full-room race checks.
2. Existing historical records without due entries may still show partial billing data.
3. Current design assumes one active billing line per tenant per billing month.

## Recommended Next Iteration
1. Add dedicated Billing Management page for creating monthly dues in batch.
2. Add payment-to-due reconciliation so Approved payment auto-marks matching due as Paid.
3. Add audit log (who changed due status and when) in UI.
4. Add pagination/export for tenant overview.

## Release Decision
Release Status: READY FOR CHECKING

Prepared by: GitHub Copilot
Model: GPT-5.3-Codex
