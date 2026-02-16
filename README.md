# Apartment Maintenance Tracker

A mobile-first web application for tracking apartment maintenance payments across 12 flats. Supports multiple payment modes (GPay, PhonePe, Cash), role-based access for residents, security staff, and admin, with encrypted screenshot storage and automated Telegram reminders.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [User Roles](#user-roles)
- [Payment Flows](#payment-flows)
- [Notification System](#notification-system)
- [Security](#security)
- [Project Structure](#project-structure)
- [Setup Guide](#setup-guide)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Post-Deployment Checklist](#post-deployment-checklist)

---

## Features

### Core Features
- **Self-service payment reporting** — Residents mark their payment as done by selecting payment mode and uploading a screenshot
- **Three payment modes** — GPay, PhonePe, and Cash to Security
- **Screenshot verification** — Digital payments require a screenshot upload; admin verifies before marking as paid
- **3-step cash verification** — Resident reports → Security confirms in person → Admin collects from security
- **Per-flat maintenance amounts** — Admin configures different amounts for each flat
- **Monthly lifecycle** — Admin opens/closes months; system tracks payment status per flat per month

### Admin Dashboard
- **Color-coded 12-flat grid** — Green (paid), Yellow (pending verification), Orange (cash to collect), Red (unpaid/overdue)
- **Summary statistics** — Total collected, pending approvals, cash to collect
- **Payment approval/rejection** — View encrypted screenshots, approve or reject with reason
- **Cash reconciliation** — See total owed by security, mark individual payments as collected
- **Month management** — Open new months, close completed ones
- **Flat configuration** — Set maintenance amount, PIN, and phone number per flat
- **Remind defaulters** — Pre-formatted WhatsApp messages with one-tap send for each defaulter
- **Historical view** — Track payment patterns across all months

### Security Staff View
- **All-flat status grid** — See who has paid and who hasn't for open months
- **Cash confirmation** — Confirm cash receipts when resident is physically present
- **Follow-up list** — See pending flats to remind
- **Restricted visibility** — Can only see open months (closed months are hidden)

### Resident View
- **Simple dashboard** — Current month status, amount due, due date
- **One-tap payment flow** — Select mode → upload screenshot (if digital) → done
- **Payment history** — See all past payments and their statuses
- **Rejection handling** — If admin rejects a screenshot, resident can resubmit

### Automation
- **Daily cron job** — Runs at 8 AM IST
  - **11th of month**: Telegram notification to security with defaulter list
  - **20th of month**: Telegram notification to admin with defaulter list + ready-to-copy WhatsApp messages
  - **All flats paid**: Telegram notification to admin with collection summary
- **Real-time notifications** — Admin gets Telegram alerts when new payments are submitted
- **Auto month opening** — New month auto-opens on the 1st if not already created

---

## Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Framework | Next.js 16 (App Router) | Single codebase for frontend + API, SSR for fast mobile loads |
| UI | Tailwind CSS 4 | Mobile-first responsive design, no CSS bloat |
| Database | Turso (libSQL) | SQLite-compatible cloud DB, generous free tier (500M reads/month) |
| ORM | Drizzle ORM | Type-safe queries, lightweight, first-class Turso support |
| File Storage | Vercel Blob | Encrypted screenshot storage (250MB free) |
| Auth | JWT via `jose` | Edge-compatible, httpOnly cookies, role-based access |
| Encryption | AES-256-GCM | Screenshots and phone numbers encrypted at rest |
| Hashing | bcryptjs | PIN and password hashing (12 salt rounds) |
| Validation | Zod | Runtime input validation for all API routes |
| Notifications | Telegram Bot API | Free, reliable admin/security alerts |
| Hosting | Vercel (Hobby) | Free tier: 150K invocations, 100GB bandwidth, cron jobs |

---

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Resident    │     │  Security   │     │   Admin     │
│  (Mobile)    │     │  (Mobile)   │     │  (Mobile)   │
└──────┬───────┘     └──────┬──────┘     └──────┬──────┘
       │                    │                    │
       └────────────┬───────┴────────────────────┘
                    │
            ┌───────▼────────┐
            │   Next.js App  │
            │  (Vercel Edge) │
            ├────────────────┤
            │  Middleware     │ ← JWT verification, role routing
            │  API Routes    │ ← Business logic
            │  React Pages   │ ← Server-rendered UI
            └──┬──────────┬──┘
               │          │
      ┌────────▼──┐  ┌────▼─────────┐
      │  Turso DB │  │ Vercel Blob  │
      │  (libSQL) │  │ (Screenshots)│
      └───────────┘  └──────────────┘
               │
      ┌────────▼──────────┐
      │  Telegram Bot API  │
      │  (Notifications)   │
      └────────────────────┘
```

---

## User Roles

### Resident
- **Auth**: Flat number + 4-digit PIN
- **Access**: Own flat data only
- **Actions**: Submit payment, upload screenshot, view history
- **Forgot PIN**: WhatsApp link to admin for reset

### Security Staff
- **Auth**: Dedicated 4-digit PIN
- **Access**: All flats, open months only (closed months hidden)
- **Actions**: View payment grid, confirm cash receipts
- **Cannot**: Approve screenshots, change settings, see closed months

### Admin
- **Auth**: Password (6+ characters)
- **Access**: Full access to everything
- **Actions**: Approve/reject payments, collect cash, configure flats, manage months, send reminders, update settings

---

## Payment Flows

### Digital Payment (GPay / PhonePe)
```
Resident selects GPay/PhonePe
  → Uploads payment screenshot
  → Status: PENDING VERIFICATION (Yellow)
  → Admin views screenshot, approves
  → Status: PAID (Green)

If admin rejects:
  → Status: REJECTED (Red) with reason
  → Resident can resubmit
```

### Cash Payment
```
Resident selects "Cash to Security"
  → Status: PENDING SECURITY (Yellow)
  → Security confirms receipt in person (on resident's screen)
  → Status: PENDING COLLECTION (Orange)
  → Admin meets security, collects cash, taps "Collected"
  → Status: PAID (Green)
```

---

## Notification System

| Trigger | Recipient | Channel | Message |
|---------|-----------|---------|---------|
| New payment submitted | Admin | Telegram | Flat number, mode, amount, status |
| Security confirms cash | Admin | Telegram | Amount confirmed, total pending |
| All flats paid | Admin | Telegram | Collection summary with breakdown |
| 11th of month | Security | Telegram | List of defaulting flats |
| 20th of month | Admin | Telegram | Defaulter list + WhatsApp messages |
| Manual reminder | Defaulters | WhatsApp | Pre-formatted message via deep link |

---

## Security

### Data Protection
- **No personal names or emails stored** — only flat numbers
- **Phone numbers** encrypted with AES-256-GCM at rest (only stored if admin adds them for WhatsApp reminders)
- **Screenshots** encrypted with AES-256-GCM before upload to Vercel Blob
- **PINs/passwords** hashed with bcryptjs (12 salt rounds)
- **JWT tokens** stored in httpOnly, secure, sameSite=strict cookies

### Access Control
- **Next.js middleware** validates JWT and enforces role-based routing on every request
- **API routes** double-check session role before any data access
- **Residents** can only see their own flat's data
- **Security staff** cannot see closed months or approve screenshots

### Rate Limiting
- **Database-backed** (works correctly in serverless/stateless environment)
- **5 failed login attempts** → 30-minute lockout per identifier
- **Separate tracking** for each flat, security, and admin login

### Infrastructure
- **HTTPS** enforced automatically by Vercel
- **Encryption key** stored as Vercel environment variable (encrypted at rest by Vercel)
- **CRON_SECRET** header required for cron endpoint access

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                              # Login page (3 role tabs)
│   ├── layout.tsx                            # Root layout with metadata
│   ├── globals.css                           # Tailwind imports + custom styles
│   │
│   ├── resident/
│   │   ├── page.tsx                          # Resident dashboard
│   │   ├── submit/page.tsx                   # Payment submission + screenshot upload
│   │   └── history/page.tsx                  # Payment history
│   │
│   ├── security/
│   │   └── page.tsx                          # Security dashboard (flat grid + cash confirm)
│   │
│   ├── admin/
│   │   ├── page.tsx                          # Admin dashboard (color grid + stats)
│   │   ├── payments/page.tsx                 # Approve/reject screenshot payments
│   │   ├── reconcile/page.tsx                # Collect cash from security
│   │   ├── months/page.tsx                   # Open/close months
│   │   ├── settings/page.tsx                 # Flat config, PINs, Telegram setup
│   │   └── remind/page.tsx                   # Defaulter list with WhatsApp links
│   │
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts                # POST: Authenticate any role
│       │   ├── logout/route.ts               # POST: Clear JWT cookie
│       │   └── me/route.ts                   # GET: Current session info
│       ├── payments/
│       │   ├── route.ts                      # GET: List (filtered by role) | POST: Submit
│       │   ├── approve/route.ts              # POST: Admin approves screenshot
│       │   ├── reject/route.ts               # POST: Admin rejects with reason
│       │   ├── security-confirm/route.ts     # POST: Security confirms cash receipt
│       │   ├── collect/route.ts              # POST: Admin marks cash collected
│       │   └── upload-screenshot/route.ts    # POST: Encrypt + upload to Blob
│       ├── screenshots/route.ts              # GET: Decrypt + serve screenshot
│       ├── months/
│       │   ├── route.ts                      # GET: List | POST: Open new month
│       │   └── close/route.ts                # POST: Close a month
│       ├── flats/route.ts                    # GET: List | PATCH: Update flat config
│       ├── config/route.ts                   # GET/PATCH: App settings
│       ├── remind/route.ts                   # POST: Generate WhatsApp reminders
│       └── cron/notifications/route.ts       # GET: Daily smart cron handler
│
├── db/
│   ├── schema.ts                             # Drizzle table definitions
│   ├── index.ts                              # Lazy DB client initialization
│   └── seed.ts                               # Seed 12 flats + default config
│
├── lib/
│   ├── auth.ts                               # JWT creation/verification (jose)
│   ├── crypto.ts                             # AES-256-GCM encrypt/decrypt
│   ├── hash.ts                               # bcryptjs hash/verify
│   ├── rate-limit.ts                         # DB-backed login rate limiting
│   ├── telegram.ts                           # Telegram Bot API helpers
│   ├── whatsapp.ts                           # WhatsApp deep link generator
│   ├── constants.ts                          # Enums, status colors, labels
│   └── validators.ts                         # Zod schemas for API input
│
├── middleware.ts                              # JWT verification + role-based routing
│
└── components/
    ├── ui/
    │   ├── Button.tsx                        # Reusable button with variants + loading
    │   ├── Card.tsx                          # White rounded card container
    │   ├── PinInput.tsx                      # 4-digit PIN input with auto-focus
    │   └── Toast.tsx                         # Success/error notification toast
    ├── FlatGrid.tsx                          # 12-flat color-coded grid
    ├── StatusBadge.tsx                       # Color-coded status pill
    └── NavBar.tsx                            # Role-aware header with logout
```

---

## Setup Guide

### Prerequisites
- Node.js 18+
- npm
- Turso CLI (`brew install tursodatabase/tap/turso`)
- A Turso account (free at turso.tech)
- A Vercel account (free at vercel.com)

### 1. Clone and Install
```bash
git clone https://github.com/Alekhya-Tethali/Apartment-Maintenance.git
cd Apartment-Maintenance
npm install
```

### 2. Create Turso Database
```bash
turso auth login
turso db create apartment-maintenance
turso db show apartment-maintenance --url       # Copy the URL
turso db tokens create apartment-maintenance    # Copy the token
```

### 3. Generate Secrets
```bash
openssl rand -hex 32    # Use for JWT_SECRET
openssl rand -hex 32    # Use for ENCRYPTION_KEY
openssl rand -hex 32    # Use for CRON_SECRET
```

### 4. Create .env File
```bash
cp .env.example .env
# Edit .env with your Turso URL, token, and generated secrets
```

### 5. Run Migrations and Seed
```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

### 6. Run Locally
```bash
npm run dev
```
Open http://localhost:3000

### Default Credentials (Change After First Login!)
- **Admin**: password `admin123`
- **Security**: PIN `1234`
- **All Flats**: PIN `0000`

---

## Environment Variables

| Variable | Description | How to Get |
|----------|-------------|------------|
| `TURSO_DATABASE_URL` | Turso database URL | `turso db show <name> --url` |
| `TURSO_AUTH_TOKEN` | Turso auth token | `turso db tokens create <name>` |
| `JWT_SECRET` | 32-byte hex secret for JWT signing | `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | 32-byte hex key for AES-256-GCM | `openssl rand -hex 32` |
| `CRON_SECRET` | Secret for cron endpoint auth | `openssl rand -hex 32` |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob access token | Auto-set when creating Blob store in Vercel |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token (optional) | Message @BotFather on Telegram |
| `TELEGRAM_ADMIN_CHAT_ID` | Admin's Telegram chat ID (optional) | Use getUpdates API after messaging bot |
| `TELEGRAM_SECURITY_CHAT_ID` | Security's Telegram chat ID (optional) | Use getUpdates API after messaging bot |
| `ADMIN_WHATSAPP_NUMBER` | Admin's WhatsApp number (optional) | Format: 919876543210 |

---

## Database Schema

### flats
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER (PK) | Auto-increment ID |
| flat_number | TEXT (UNIQUE) | e.g., "G1", "F2", "S1" |
| maintenance_amount | REAL | Monthly amount in INR |
| pin_hash | TEXT | bcrypt hash of 4-digit PIN |
| phone_encrypted | TEXT | AES-256-GCM encrypted phone number |
| phone_iv | TEXT | Initialization vector for decryption |
| phone_tag | TEXT | Auth tag for decryption |

### payments
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER (PK) | Auto-increment ID |
| flat_id | INTEGER (FK) | References flats.id |
| month_id | INTEGER (FK) | References months.id |
| amount | REAL | Payment amount |
| payment_mode | TEXT | "gpay", "phonepe", or "cash" |
| status | TEXT | See Payment Status Flow |
| screenshot_blob_url | TEXT | Encrypted file URL in Vercel Blob |
| screenshot_iv | TEXT | IV for screenshot decryption |
| screenshot_tag | TEXT | Auth tag for screenshot decryption |
| submitted_at | TEXT | ISO timestamp |
| security_confirmed_at | TEXT | When security confirmed cash |
| verified_at | TEXT | When admin approved/rejected |
| collected_at | TEXT | When admin collected cash |
| admin_note | TEXT | Rejection reason |

### months
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER (PK) | Auto-increment ID |
| month | INTEGER | 1-12 |
| year | INTEGER | e.g., 2026 |
| status | TEXT | "open" or "closed" |
| due_date_day | INTEGER | Day of month payment is due |
| closed_at | TEXT | When month was closed |

### config
| Column | Type | Description |
|--------|------|-------------|
| key | TEXT (PK) | Config key name |
| value | TEXT | Config value |

### login_attempts
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER (PK) | Auto-increment ID |
| identifier | TEXT | "flat:G1", "security", or "admin" |
| attempted_at | TEXT | ISO timestamp |
| success | INTEGER | 0 = failed, 1 = success |

---

## API Reference

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | None | Login as resident/security/admin |
| POST | `/api/auth/logout` | Any | Clear session cookie |
| GET | `/api/auth/me` | Any | Get current session info |

### Payments
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/payments` | Any | List payments (filtered by role) |
| POST | `/api/payments` | Resident | Submit a new payment |
| POST | `/api/payments/approve` | Admin | Approve a screenshot payment |
| POST | `/api/payments/reject` | Admin | Reject with reason |
| POST | `/api/payments/security-confirm` | Security | Confirm cash receipt |
| POST | `/api/payments/collect` | Admin | Mark cash as collected |
| POST | `/api/payments/upload-screenshot` | Resident | Upload encrypted screenshot |
| GET | `/api/screenshots?paymentId=N` | Admin | Decrypt and serve screenshot |

### Months
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/months` | Any | List months (security sees open only) |
| POST | `/api/months` | Admin | Open a new month |
| POST | `/api/months/close` | Admin | Close a month |

### Flats & Config
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/flats` | Any | List all flats |
| PATCH | `/api/flats` | Admin | Update flat config |
| GET | `/api/config` | Admin | Get app settings |
| PATCH | `/api/config` | Admin | Update settings |

### Cron
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/cron/notifications` | CRON_SECRET | Daily notification handler |

---

## Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Go to vercel.com → New Project → Import GitHub repo
3. Add all environment variables in Settings → Environment Variables
4. For screenshot storage: Storage tab → Create → Blob (auto-adds BLOB_READ_WRITE_TOKEN)
5. Deploy

### Cron Job
The `vercel.json` configures a daily cron at `30 2 * * *` (8:00 AM IST):
- 11th: Notifies security staff with defaulter list
- 20th: Notifies admin with defaulters + WhatsApp messages
- Any day: Notifies admin when all flats have paid

---

## Post-Deployment Checklist

1. Login as admin (password: `admin123`)
2. **Change admin password** immediately in Settings
3. **Change security PIN** from `1234` in Settings
4. **Set unique PINs** for each flat (tell residents personally)
5. **Set maintenance amounts** per flat if they differ
6. **Add phone numbers** for flats where you want WhatsApp reminders
7. **Set up Telegram** (optional):
   - Message @BotFather → /newbot → copy token
   - Message your bot → visit `https://api.telegram.org/bot<TOKEN>/getUpdates` → find chat_id
   - Enter token and chat IDs in Settings
8. Share the app URL in the apartment WhatsApp group

---

## Free Tier Usage

| Resource | Monthly Estimate | Free Limit | Headroom |
|----------|-----------------|------------|----------|
| Vercel Invocations | ~2,000 | 150,000 | 99% free |
| Vercel Bandwidth | ~500 MB | 100 GB | 99% free |
| Vercel Blob Storage | ~6 MB/month | 250 MB | ~3 years |
| Turso Reads | ~10,000 rows | 500M rows | 99.99% free |
| Turso Storage | ~10 MB/year | 5 GB | Decades |

This application runs entirely within free tier limits with massive headroom.
