# Auto-Pay Bill Logging & Dashboard Notifications

**Date:** 2026-07-10  
**Status:** Implemented

---

## Overview

Auto-pay bills (those with `isAutoPay = true`) are now automatically logged as paid whenever the app is loaded, with no manual interaction required. The dashboard shows dismissable notification cards for any bills logged in the last 7 days. A quick-pay checkmark button is available on both the dashboard's Upcoming Bills panel and the Bills table for instant manual payment.

---

## Behaviour

### Auto-Pay Processing

Triggered on every `GET /api/dashboard` and `GET /api/bills` call.

1. Query all bills where `isActive = true AND isAutoPay = true AND nextDueDate <= today`.
2. For each bill, loop while `nextDueDate <= today AND isActive = true`:
   - Guard: skip if a `bill_payment` record already exists for `(billId, dueDate)` (idempotent).
   - Call `payBill()` with `paidDate = bill.nextDueDate`, `amount = bill.amount`, `createTransaction = true`, `paymentMethod = "bank_transfer"`.
   - Reload the bill to pick up the advanced `nextDueDate`.
3. Multiple missed cycles (e.g. app unopened for a week) log one payment per cycle at each actual due date.

### Dashboard Notifications

- `GET /api/dashboard` returns `recentAutoPayPayments`: auto-pay bill_payments with `paidDate` within the last 7 days.
- Dashboard renders `<AutoPayNotifications>` above the warning banner.
- Each payment shows: bill name, amount, and the date it was logged for.
- Dismissed notification IDs are stored in `localStorage` key `dismissed-autopay-notifications` and persist across page refreshes.
- "Dismiss all" button appears when two or more notifications are visible.

### Quick-Pay Checkmark

- A `CircleCheck` button appears next to each active bill row in the Bills table and in the Upcoming Bills panel on the dashboard.
- One click posts to `POST /api/bills/[id]/pay` with today's date, the bill's default amount, `createTransaction: true`, and `paymentMethod: "bank_transfer"`.
- A Sonner success toast confirms the action.
- Per-bill loading state (spinner) shows while the request is in flight.
- The existing "Mark as paid" dropdown item (which opens the full dialog for custom date/amount) is preserved.

---

## Files Changed

| File | Change |
|---|---|
| `lib/repositories/bills.ts` | Added `processAutoPayBills()`, `getRecentAutoPayPayments()`, `RecentAutoPayPayment` type |
| `lib/services/dashboard.ts` | Calls processor at top of `getDashboardData()`; adds `recentAutoPayPayments` to `DashboardData` |
| `app/api/bills/route.ts` | Calls `processAutoPayBills()` in GET handler |
| `components/bills/auto-pay-notifications.tsx` | New component — dismissable green notification cards |
| `app/dashboard/page.tsx` | Renders `<AutoPayNotifications>`; quick-pay mutation + checkmark buttons on upcoming bills |
| `components/bills/bills-table.tsx` | `onQuickPay` prop + `CircleCheck` button column |
| `app/bills/page.tsx` | `quickPayMutation` wired to `BillsTable` |

---

## Design Decisions

- **No scheduler needed** — processing is lazy (on page load), appropriate for a local-first SQLite app.
- **Idempotent** — double-processing is guarded by checking existing `bill_payment` records.
- **localStorage for dismissals** — no new DB table; dismissed IDs are lightweight and local.
- **7-day notification window** — prevents notifications from showing indefinitely for old payments.
