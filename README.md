# ChainBase — Citizens Dividend Platform

**Live site:** https://chainbase-17bj.onrender.com

A full-stack blockchain-powered platform that automates and transparently distributes a Citizens Dividend — a universal monthly income — in USDC on Ethereum. Recipients self-register, complete a mandatory hosted identity verification (Didit) to prevent duplicate claims, then get a self-custodial wallet (an auto-provisioned MPC embedded wallet, or their own external one) with no seed phrase or crypto experience required. Admins get a read-only, fully-automated view of disbursement history — the scheduler pays out on-chain every month, nobody clicks "send."

For the full architecture, locked design decisions, database schema, and API contract, see **[`AI_README.md`](./AI_README.md)** — this file covers day-to-day setup. Frontend visual/design-system conventions live in **[`CLAUDE.md`](./CLAUDE.md)**.

## User Stories

**Auth & onboarding**
- A recipient can self-register with just their name, email, and password
- A recipient must complete a hosted Didit identity check (ID + liveness selfie, embedded in-app) before anything else is unlocked
- A recipient then sets up a wallet — an embedded wallet is created for them automatically, or they connect/paste an existing one
- A recipient can log in/out; an administrator logs in via a separate staff URL

**Recipient dashboard**
- View USDC balance, next payment date/countdown, and full payment history with tx-hash links to Etherscan
- Request a ChainBase virtual card (shows their real wallet address, not invented numbers), lock/unlock it, or request a replacement (30-day cooldown)
- Use the simulated "Spend Tokens" tracker to see how the monthly bonus-eligibility calculation works
- Manage account settings (name, password, notification preferences) and wallet settings (view address, open Web3Auth's wallet UI, rotate wallet)

**Admin view**
- View all recipients, enroll new ones directly (auto-verified), revoke/reinstate eligibility
- Resolve flagged-duplicate identity matches and legal-name-change reviews
- Review and approve/deny monthly spending bonuses
- View disbursement cycles and per-cycle payment logs (read-only — the scheduler runs cycles automatically)
- View the funding pool balance

## Schema

Full column-level schema (including identity verification, wallet, card, and notification fields) lives in **[`AI_README.md` §4](./AI_README.md#4-database-schema)**. Tables: `administrators`, `recipients`, `didit_webhook_events`, `disbursement_cycles`, `disbursements`, `funding_pool`, `audit_log`, `spending_behavior`, `bonus_awards`.

An administrator enrolls many recipients. A disbursement cycle has many disbursements. Deleting a cycle cascades to delete its disbursements.

## API Contract

Full endpoint list lives in **[`AI_README.md` §5](./AI_README.md#5-api-contract)**. Everything is mounted under `/api`, grouped as: Auth & identity, Wallet & card, Account settings, Webhooks, Recipients, Disbursement Cycles (read-only), Spending (simulated), Bonuses, Funding Pool, Audit Log.

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

**Optional integrations** — the app runs fully without these (each is gated behind its own `*_enabled` flag, default `False`), but some recipient-facing flows are limited until they're configured:

| Flag | Needs | Without it |
|---|---|---|
| `DIDIT_ENABLED` | A free Didit sandbox account (`business.didit.me`) + `DIDIT_API_KEY`/`DIDIT_WORKFLOW_ID`/`DIDIT_WEBHOOK_SECRET` | Self-registered recipients can sign up but can never pass identity verification — use the seeded, admin-enrolled recipients below to explore the app instead |
| `WALLET_PROVISIONING_ENABLED` | A MetaMask Embedded Wallets (Web3Auth) project + signing key | The embedded-wallet option is hidden; recipients can still connect an external wallet |
| `SCHEDULER_ENABLED` | A deployed `Distributor` contract + `RPC_URL`/`DEPLOYER_PRIVATE_KEY` | No automatic on-chain disbursements; the rest of the app (including the seeded disbursement history) works fine |

Locally, Didit's real webhook can't reach your machine (no public URL) — either run a tunnel (e.g. `ngrok`) and point Didit's dashboard webhook config at it, or simulate a signed webhook call by hand against `POST /api/webhooks/didit` for testing.

### 3. Frontend

In a second terminal:

```sh
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:3000`. The Vite dev proxy forwards all `/api` requests to the FastAPI server.

## Seed Accounts

After running `python db/seed.py`, these accounts are available. Seeded/admin-enrolled recipients start **already verified with a wallet set** (an admin has vetted them directly, per §2 of `AI_README.md`) — they skip Didit entirely, which makes them the fastest way to explore the dashboard without configuring identity verification yourself.

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

> These credentials are committed in plaintext for a student capstone demo with no real funds at stake — see `AI_README.md` §1. Don't reuse this pattern for a project handling real money.

## Application Structure

```
ChainBase/
├── frontend/                          # React app (Vite)
│   └── src/
│       ├── App.jsx                    # Routes; ProtectedLayout gates on token → verified → wallet set
│       ├── api.js                     # apiFetch helper — attaches Bearer token
│       ├── index.css                  # --cb-* design tokens, dark/light theme, shared component CSS
│       ├── context/
│       │   ├── AuthContext.jsx        # token, role, userId, userName, isVerified, walletAddress
│       │   └── ThemeContext.jsx       # light/dark toggle, persisted, drives .cb-light on <body>
│       ├── components/
│       │   ├── Sidebar.jsx / TopBar.jsx   # Shared authenticated shell (nav, theme toggle, account menu)
│       │   ├── StatCard.jsx / Badge.jsx / Avatar.jsx / Toggle.jsx   # Shared primitives
│       │   ├── VirtualCard.jsx / CardManager.jsx / CardAddressForm.jsx  # ChainBase card feature
│       │   └── VerificationModal.jsx / NameChangeReviewModal.jsx   # Didit iframe modal, admin review modal
│       └── pages/
│           ├── Landing.jsx / Login.jsx / AdminLogin.jsx / Register.jsx
│           ├── VerificationGate.jsx   # Mandatory post-registration identity-check gate
│           ├── WalletSetupGate.jsx    # Mandatory post-verification wallet-creation gate
│           ├── Dashboard.jsx          # Admin overview or recipient dividend summary (role-aware)
│           ├── Payments.jsx / Wallet.jsx / WalletSettings.jsx / Settings.jsx
│           ├── Recipients.jsx / Cycles.jsx / CycleDetail.jsx / Bonuses.jsx   # Admin views
├── server/                            # FastAPI + PostgreSQL API
│   ├── main.py                        # App entry point, router registration, scheduler lifespan
│   ├── dependencies.py                # get_current_recipient/admin, get_optional_user
│   ├── core/                          # Settings (env vars), JWT + password hashing
│   ├── didit/                         # Didit session creation, webhook signature verification
│   ├── wallet/                        # Custom-JWT minting for MetaMask Embedded Wallets
│   ├── chain/, scheduler/             # Web3.py contract client + APScheduler disbursement job
│   ├── routers/                       # auth, recipients, cycles, disbursements, funding_pool,
│   │                                  # audit_log, webhooks, bonuses
│   ├── spending/                      # Simulated spending-tracker router + MCC category logic
│   ├── crud/                          # SQL queries, one module per table
│   ├── schemas/                       # Pydantic request/response models
│   └── db/
│       ├── pool.py                    # asyncpg connection pool (supports DATABASE_URL)
│       ├── migrate.py                 # Idempotent schema migrations — source of truth for schema
│       └── seed.py                    # Truncates and inserts sample admin, recipients, cycles
└── contracts/                          # Solidity (Distributor, MockUSDC) + Hardhat — see contracts/CLAUDE.md
```
