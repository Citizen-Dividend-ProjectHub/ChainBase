# ChainBase — Citizens Dividend Platform

**Live site:** https://chainbase-17bj.onrender.com

A full-stack blockchain-powered platform that automates and transparently distributes a Citizens Dividend — a universal monthly income. Built with React, FastAPI, and PostgreSQL. Demonstrates JWT-based role authentication, on-chain transaction verification via Etherscan, and a two-role system for admins and recipients.

## User Stories

**Auth**
- A recipient can register with their full name, email, password, and Ethereum wallet address
- A recipient can log in with their email and password and receive a JWT
- A recipient can log out and have their session cleared
- An administrator can log in via a separate staff access URL

**Recipients (Recipient view)**
- A logged-in recipient can view their dashboard showing USDC balance, next payment date, and total received
- A logged-in recipient can view their full payment history with dates, amounts, and status
- A logged-in recipient can verify any confirmed payment on Sepolia Etherscan via a transaction hash link
- A logged-in recipient can copy a transaction hash to their clipboard

**Recipients (Admin view)**
- A logged-in admin can view all enrolled recipients with their eligibility status and wallet address
- A logged-in admin can enroll a new recipient (a temporary password is generated)
- A logged-in admin can revoke or reinstate a recipient's eligibility

**Citizens Dividend Cycles**
- A logged-in admin can view all disbursement cycles and their status (pending / completed)
- A logged-in admin can create a new Citizens Dividend cycle with a scheduled date and amount per recipient
- A logged-in admin can trigger disbursements for a pending cycle, sending payments to all eligible recipients
- A logged-in admin can view a cycle's detail page showing every individual disbursement

**Funding Pool**
- A logged-in admin can view the current funding pool balance on the dashboard

## Schema

```
administrators
─────────────────────────────────────────
administrator_id    SERIAL PRIMARY KEY
administrator_name  TEXT UNIQUE NOT NULL
password_hash       TEXT NOT NULL
administrator_email TEXT UNIQUE NOT NULL
created_at          TIMESTAMP DEFAULT NOW()

recipients
─────────────────────────────────────────
recipient_id    SERIAL PRIMARY KEY
full_name       TEXT NOT NULL
password_hash   TEXT NOT NULL
recipient_email TEXT UNIQUE NOT NULL
is_eligible     BOOLEAN DEFAULT TRUE
wallet_address  VARCHAR(42) UNIQUE NOT NULL
enrolled_by     INT REFERENCES administrators(administrator_id)
enrolled_at     TIMESTAMP DEFAULT NOW()
revoked_at      TIMESTAMP

disbursement_cycles
─────────────────────────────────────────
cycle_id             SERIAL PRIMARY KEY
triggered_by         INT REFERENCES administrators(administrator_id)
scheduled_date       TIMESTAMP NOT NULL
triggered_at         TIMESTAMP
amount_per_recipient NUMERIC(12,2) NOT NULL
total_recipients     INT DEFAULT 0
status               TEXT DEFAULT 'pending'

disbursements
─────────────────────────────────────────
disbursement_id SERIAL PRIMARY KEY
cycle_id        INT REFERENCES disbursement_cycles(cycle_id) ON DELETE CASCADE
recipient_id    INT REFERENCES recipients(recipient_id) ON DELETE CASCADE
status          TEXT DEFAULT 'pending'
amount          NUMERIC(12,2) DEFAULT 0
tx_hash         VARCHAR(66) UNIQUE
disbursed_at    TIMESTAMP

funding_pool
─────────────────────────────────────────
pool_id        SERIAL PRIMARY KEY
balance        NUMERIC(14,2) DEFAULT 0
last_synced_at TIMESTAMP DEFAULT NOW()

audit_log
─────────────────────────────────────────
log_id              SERIAL PRIMARY KEY
administrator_id    INT REFERENCES administrators(administrator_id)
action_type         TEXT NOT NULL
target_recipient_id INT REFERENCES recipients(recipient_id)
details             TEXT
created_at          TIMESTAMP DEFAULT NOW()
```

An administrator enrolls many recipients. A disbursement cycle has many disbursements. Deleting a cycle cascades to delete its disbursements.

## API Contract

### Auth endpoints

| Method | Endpoint                        | Request Body                                             | Response                                    |
| ------ | ------------------------------- | -------------------------------------------------------- | ------------------------------------------- |
| POST   | `/api/auth/recipient/register`  | `{ full_name, recipient_email, password, wallet_address }` | `{ recipient_id, full_name, recipient_email }` |
| POST   | `/api/auth/recipient/login`     | `{ recipient_email, password }`                          | `{ token, recipient_id, full_name }`        |
| POST   | `/api/auth/admin/login`         | `{ administrator_name, password }`                       | `{ token, administrator_id, administrator_name }` |

### Recipient endpoints

| Method | Endpoint                            | Auth         | Request Body                                   | Response                                                     |
| ------ | ----------------------------------- | ------------ | ---------------------------------------------- | ------------------------------------------------------------ |
| GET    | `/api/recipients`                   | Admin only   | —                                              | `[{ recipient_id, full_name, recipient_email, wallet_address, is_eligible }]` |
| GET    | `/api/recipients/:id`               | Admin or self | —                                             | `{ recipient_id, full_name, ..., next_disbursement_date }`   |
| GET    | `/api/recipients/:id/disbursements` | Admin or self | —                                             | `[{ disbursement_id, cycle_id, amount, status, tx_hash, disbursed_at }]` |
| POST   | `/api/recipients`                   | Admin only   | `{ full_name, recipient_email, wallet_address }` | `{ recipient_id, full_name, recipient_email, wallet_address }` |
| PATCH  | `/api/recipients/:id/revoke`        | Admin only   | —                                              | `{ recipient_id, is_eligible: false }`                       |
| PATCH  | `/api/recipients/:id/reinstate`     | Admin only   | —                                              | `{ recipient_id, is_eligible: true }`                        |

### Disbursement cycle endpoints (all require admin)

| Method | Endpoint                      | Request Body                              | Response                                                      |
| ------ | ----------------------------- | ----------------------------------------- | ------------------------------------------------------------- |
| GET    | `/api/cycles`                 | —                                         | `[{ cycle_id, scheduled_date, amount_per_recipient, total_recipients, status }]` |
| GET    | `/api/cycles/:id`             | —                                         | `{ cycle_id, scheduled_date, amount_per_recipient, status, ... }` |
| GET    | `/api/cycles/:id/disbursements` | —                                       | `[{ disbursement_id, recipient_name, amount, status, tx_hash }]` |
| POST   | `/api/cycles`                 | `{ scheduled_date, amount_per_recipient }` | `{ cycle_id, scheduled_date, amount_per_recipient, status }`  |
| POST   | `/api/cycles/:id/trigger`     | —                                         | `[{ disbursement_id, recipient_id, amount, status }]`         |

### Disbursement endpoints

| Method | Endpoint             | Auth              | Response                                                                 |
| ------ | -------------------- | ----------------- | ------------------------------------------------------------------------ |
| GET    | `/api/disbursements` | Admin or recipient | Admin: all disbursements. Recipient: their own disbursements.           |

### Funding pool endpoints (all require admin)

| Method | Endpoint             | Request Body  | Response                             |
| ------ | -------------------- | ------------- | ------------------------------------ |
| GET    | `/api/funding-pool`  | —             | `{ pool_id, balance, last_synced_at }` |
| PATCH  | `/api/funding-pool`  | `{ balance }` | `{ pool_id, balance, last_synced_at }` |

## Setup

### 1. Database

Create a local Postgres database:

```sh
createdb chainbase
```

### 2. Backend

```sh
cd server
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.template .env
```

Open `.env` and fill in your Postgres credentials and a JWT secret. Then run migrations and seed the database:

```sh
python db/migrate.py
python db/seed.py
```

Start the server:

```sh
uvicorn main:app --reload
```

The API runs on `http://localhost:8000`.

### 3. Frontend

In a second terminal:

```sh
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173`. The Vite dev proxy forwards all `/api` requests to the FastAPI server.

## Seed Accounts

After running `python db/seed.py`, these accounts are available:

**Admin** — login at `/admin`

| Username         | Password              |
| ---------------- | --------------------- |
| chainbase_admin  | Admin@ChainBase2024!  |

**Recipients** — login at `/login`

| Name             | Email                          | Password        | Status     |
| ---------------- | ------------------------------ | --------------- | ---------- |
| Jordan Williams  | jordan.williams@cbtest.com     | Jordan_Cb@2024  | Eligible   |
| Maria Santos     | maria.santos@cbtest.com        | Maria_Cb@2024   | Eligible   |
| David Chen       | david.chen@cbtest.com          | David_Cb@2024   | Eligible   |
| Aisha Johnson    | aisha.johnson@cbtest.com       | Aisha_Cb@2024   | Eligible   |
| Marcus Thompson  | marcus.thompson@cbtest.com     | Marcus_Cb@2024  | Ineligible |
| Sofia Rodriguez  | sofia.rodriguez@cbtest.com     | Sofia_Cb@2024   | Eligible   |

## Application Structure

```
ChainBase/
├── frontend/                      # React app (Vite)
│   └── src/
│       ├── App.jsx                # Routes, role-aware protected layout
│       ├── api.js                 # apiFetch helper — attaches Bearer token
│       ├── index.css              # Dark theme CSS variables and global styles
│       ├── context/
│       │   └── AuthContext.jsx    # token, role, userId, userName — persisted in localStorage
│       ├── components/
│       │   ├── Sidebar.jsx        # Role-aware nav (admin vs recipient links)
│       │   ├── StatCard.jsx       # Reusable stat card component
│       │   └── Badge.jsx          # Status badge (confirmed, pending, eligible, etc.)
│       └── pages/
│           ├── Login.jsx          # Recipient login (email + password)
│           ├── AdminLogin.jsx     # Admin login at hidden /admin URL
│           ├── Register.jsx       # Recipient self-registration with MetaMask wallet connect
│           ├── Dashboard.jsx      # Admin overview or recipient dividend summary (role-aware)
│           ├── Payments.jsx       # Recipient payment history with filters and stats
│           ├── Recipients.jsx     # Admin: list, enroll, revoke/reinstate recipients
│           ├── Cycles.jsx         # Admin: list and create Citizens Dividend cycles
│           └── CycleDetail.jsx    # Admin: cycle breakdown and trigger disbursements
└── server/                        # FastAPI + PostgreSQL API
    ├── main.py                    # App entry point, router registration, static file serving
    ├── dependencies.py            # get_current_user, require_admin FastAPI dependencies
    ├── core/
    │   ├── config.py              # Pydantic settings (env vars)
    │   └── security.py            # JWT creation and verification
    ├── routers/
    │   ├── auth.py                # /api/auth/recipient/login, /admin/login, /register
    │   ├── recipients.py          # /api/recipients — CRUD + eligibility toggle
    │   ├── cycles.py              # /api/cycles — create, list, trigger
    │   ├── disbursements.py       # /api/disbursements — list (role-aware)
    │   ├── funding_pool.py        # /api/funding-pool — get and update balance
    │   └── audit_log.py           # /api/audit-log — list actions
    ├── crud/
    │   ├── administrator.py       # SQL queries for administrators table
    │   ├── recipient.py           # SQL queries for recipients table
    │   ├── cycle.py               # SQL queries for disbursement_cycles table
    │   ├── disbursement.py        # SQL queries for disbursements table
    │   ├── funding_pool.py        # SQL queries for funding_pool table
    │   └── audit_log.py           # SQL queries for audit_log table
    ├── schemas/                   # Pydantic request/response models
    ├── db/
    │   ├── pool.py                # asyncpg connection pool (supports DATABASE_URL)
    │   ├── migrate.py             # CREATE TABLE IF NOT EXISTS for all tables
    │   └── seed.py                # Truncates and inserts sample admin, recipients, and cycles
    └── requirements.txt
```
