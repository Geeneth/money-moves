# Money Moves

A local-first personal budgeting app built around biweekly pay periods. Runs entirely on your Mac — no account, no cloud, no internet connection required after install.

## Requirements

- macOS
- [Node.js](https://nodejs.org) 20 or later (Node 22 recommended)
- Xcode Command Line Tools (`xcode-select --install`) — needed the first time `npm install` compiles the SQLite native module

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). On first launch you'll be taken through a short onboarding flow (currency, payday, paycheck amount, savings preference, initial bills, optional sample data). After that you'll land on the Dashboard.

No separate database setup step is needed — the SQLite file and its tables are created automatically the first time the app runs.

### Production workflow (optional)

```bash
npm run build
npm run start
```

This builds an optimized production bundle and serves it on port 3000 (pass `-p <port>` to `next start` to change it).

## Where your data lives

All data is stored locally in a single SQLite file:

```
data/budget.db
```

relative to the project root. Two companion files (`data/budget.db-wal` and `data/budget.db-shm`) may also appear next to it — these are part of SQLite's write-ahead log and are normal; don't delete them while the app is running.

Nothing is ever sent over the network. There is no authentication, no cloud database, and no external service calls.

## Backing up your data

You have three options, in order of convenience:

1. **In-app backup (recommended)** — go to **Settings → Database Backup** and click "Download backup" to save a versioned JSON file containing everything (settings, transactions, bills, paychecks, savings goals, categories). Keep these files somewhere safe (iCloud Drive, an external drive, etc.).
2. **Restore from backup** — in **Settings → Database Restore**, choose a previously exported JSON file. The app validates it, shows you a summary of what it contains, and asks for confirmation before replacing anything. A safety backup of your *current* data is written automatically before the import runs, so a bad restore is always recoverable.
3. **Copy the raw database file** — you can back up `data/budget.db` directly with Finder or `cp`, the same way you'd back up any file. Do this while the app is idle (not mid-write) for the safest copy — or use the "Create file copy" action in Settings, which uses SQLite's online backup API and is safe to run at any time, even while the app is in use. Copies made this way are written to `data/backups/`.

## Exporting data

- **Full JSON export** — Settings → Database Backup → Download backup (see above). This is the format used for full restore.
- **CSV export** — Transactions and Bills each have an "Export CSV" button that downloads the currently filtered rows in a spreadsheet-friendly format. CSV is for spreadsheet use only; it is not used to restore app state.

## Database migrations

The schema lives in `lib/database/schema.ts` and is managed with [Drizzle ORM](https://orm.drizzle.team). Generated SQL migrations live in `drizzle/`. On every app start, any pending migrations are applied automatically to `data/budget.db` — you don't need to run anything by hand for normal use.

If you change the schema yourself during development:

```bash
npm run db:generate   # generate a new migration from schema.ts
npm run db:push       # or push schema changes directly to the dev database
npm run db:studio     # open Drizzle Studio to browse the database
```

## Resetting or reloading data

Settings → Danger Zone lets you:

- **Load sample data** — populates the app with example paychecks, bills, savings goals, and transactions so you can explore the UI before entering real data. This does not mix with your real data — it's meant for an empty budget.
- **Reset all local data** — wipes everything and returns you to onboarding. This requires typing a confirmation phrase and is not reversible from within the app (restore from a backup file if you need your data back).

## Project structure

```
app/            Next.js App Router pages and API routes
components/     UI components (ui/, layout/, and one folder per feature area)
hooks/          Shared React Query hooks
lib/
  calculations/   Pure, tested functions for pay periods, bills, savings, spending
  database/       Drizzle client, schema, sample-data generator
  repositories/   Data-access layer over the database
  services/       Aggregation logic for the dashboard and reports
  validation/     Zod schemas shared by forms and API routes
  formatting/     Currency and date formatting helpers
  backup/         Export/import/backup logic
  exports/        CSV generation
drizzle/        Generated SQL migrations
data/           Your SQLite database (created on first run, not checked into version control)
```

## Tech stack

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Framer Motion · Recharts · SQLite · Drizzle ORM · Zod · React Hook Form · TanStack Table · TanStack Query · date-fns

## Testing

```bash
npm run test        # run the calculation test suite once
npm run test:watch  # watch mode
```

Pay-period, bill-allocation, savings, and spending calculations are covered by unit tests in `lib/calculations/*.test.ts`.

## Notes on money and dates

All monetary values are stored and passed around as **integer cents** (e.g. `$12.34` is stored as `1234`) to avoid floating-point rounding issues. Dates are stored as ISO strings (`yyyy-MM-dd`). Formatting for display always goes through the shared helpers in `lib/formatting/`.
