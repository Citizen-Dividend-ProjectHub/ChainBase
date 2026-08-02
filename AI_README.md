# AI_ReadMe.md — ChainBase / Citizens Dividend

**Purpose of this file:** This is a context primer for any AI assistant (Claude, Claude Code, or otherwise) working on this project. Read this before making architectural suggestions, generating code, or answering questions about scope. It describes the **current state** of the project, not a chronological log of how it got there.

---

## 1. What This Project Is

**ChainBase** is a blockchain-powered platform that automates and transparently distributes a **Citizens Dividend** — a universal monthly income — to eligible recipients using **USDC** on the **Ethereum** blockchain. Each month, a smart contract transfers USDC directly to verified recipients' wallets with no manual claim step required.

**The problem it solves:**
- Traditional banking-based disbursement to large populations is slow, opaque, and expensive. Smart contracts execute instantly and are publicly auditable on-chain.
- Administrators lack real-time visibility into program health, disbursement status, and funding pool levels.
- Recipients have no easy way to verify payments or understand their balance without understanding blockchain infrastructure.
- A UBI-style program is a prime target for Sybil attacks (one person registering many times to claim multiple disbursements) — this is treated as a first-class problem, not an afterthought.

**Core values driving design decisions:** dignity, transparency, and fraud-resistance. Trustworthy infrastructure is treated as the hard problem — harder than the funding itself. Concretely, this means: never make a recipient need to understand wallets/private keys to receive or use their dividend, never fabricate the appearance of real-world infrastructure (banking rails, card numbers, email delivery) that doesn't actually exist yet, and always prefer an honest "not built yet" over a convincing-looking mock.

This is a **student capstone project** with a tight timeline. Scope decisions consistently favor simplicity and reliability over feature breadth. It does not move real money — no real financial risk is involved even where the UI resembles a real fintech product.

---

## 2. User Roles

Only two roles exist. There is no policy-simulation or additional role tier.

**Recipient** — the full onboarding sequence, in order:
1. **Register** with full name, email, password (no wallet address required up front).
2. **Identity verification (mandatory gate)** — a Didit-hosted KYC session (ID/passport + liveness selfie) embedded in an in-app modal. The account cannot proceed past this step until Didit reports a decision. See §3 for the fraud-resistance design.
3. **Wallet setup (mandatory gate)** — once verified, either:
   - accept an **auto-provisioned embedded wallet** (MetaMask Embedded Wallets / Web3Auth, MPC-based, Custom JWT — recipient never sees a seed phrase), or
   - connect/paste an **existing external wallet** (e.g. MetaMask).
4. **Dashboard access** — from here on, the recipient can:
   - view USDC balance, disbursement history, tx hashes, and next payment date/countdown
   - request a **ChainBase virtual card** (visually tied to their real wallet address — no fabricated account/routing numbers), lock/unlock it (a real toggle that blocks the spending endpoint), and request a replacement (deactivates the current card, 30-day reissue cooldown)
   - use the **Spend Tokens** feature — a simulated spending tracker (separate ledger, MCC-category based, powers a monthly bonus-eligibility calculation) — this is **not** connected to the recipient's real on-chain USDC balance; it exists to demonstrate the bonus mechanic, not to move real funds
   - manage **account settings**: display name, password, and email notification preferences (preferences persist for real; no real email-sending backend exists yet, so nothing is actually delivered — this is labeled honestly in the UI)
   - manage **wallet settings**: view/copy address, open Web3Auth's own hosted wallet UI to manage funds or export a private key (never handled by our own code), rotate to a new wallet address (requires a selfie reverification session)
   - receive the monthly disbursement automatically — no claim action required

**Administrator**
- Views aggregate program data: total enrolled recipients, funding pool balance, total disbursed to date.
- Enrolls recipients directly (admin-enrolled recipients skip Didit verification and start already approved — an admin has already vetted them).
- Revokes / reinstates recipient eligibility.
- Reviews **flagged-duplicate** identity cases (two recipients whose Didit-verified identity hash collides) and **name-change-review** cases (a re-verification whose legal name no longer matches the stored identity hash) — both routed to the admin Recipients view for manual resolution.
- Reviews and approves/denies monthly **spending bonus** awards (10% bonus for recipients with zero restricted-category purchases that period).
- Views the full on-chain disbursement log per cycle for audit purposes.
- Does **not** manually trigger disbursements (see §3).

---

## 3. Locked Architecture Decisions

These are current and take precedence over anything that conflicts with them:

| Decision | Value |
|---|---|
| Chain | Ethereum (existing public chain — not a custom chain) |
| Token | USDC (existing stablecoin — not a custom token or stablecoin) |
| Disbursement trigger | **Fully automatic**, via **APScheduler** on the backend — not admin-triggered |
| Identity verification | **Didit** (hosted KYC provider), mandatory before wallet setup. Sybil resistance via a deterministic SHA-256 hash of normalized (first name, last name, DOB) — a second recipient whose hash matches an already-approved recipient is flagged (`flagged_duplicate`) and routed to admin review instead of being activated. |
| Wallet integration | Self-custodial, recipient-controlled. Default path is an **auto-provisioned embedded wallet** (MetaMask Embedded Wallets / Web3Auth MPC, Custom JWT minted by our backend) — no seed phrase, no MetaMask install required. Recipients may instead connect an **existing external wallet**. Either way, recipients (not admins, not the scheduler) hold their own keys; the scheduler only ever calls the Distributor contract, never a recipient's wallet. |
| ChainBase virtual card | Visual only — no real card-issuer partnership (e.g. Rain, Bridge) exists. The "card number" shown is the recipient's real wallet address, deliberately **not** invented account/routing numbers. Locking the card is real (blocks `/spending/purchase`); "getting a new card" locks the old one and starts a real 30-day cooldown, mirroring real-world lost-card handling, even though no physical card is mailed today. |
| Roles | Recipient and Administrator only |
| Stack | PERN (PostgreSQL, Express-style FastAPI backend, React, Node tooling) + Python/FastAPI + Solidity |

**Important divergence from the original spec:** the original spec's API contract includes an admin-initiated `POST /api/cycles/:id/trigger` endpoint with MetaMask signing. That flow has been superseded — disbursement cycles are created and executed automatically on schedule by an APScheduler job calling the smart contract. Admins retain read/audit visibility but do not manually fire disbursements.

---

## 4. Database Schema

Reflects `server/db/migrate.py` (the source of truth — idempotent `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`, safe to re-run).

**administrators**

| Field | Constraints |
|---|---|
| administrator_id | SERIAL PRIMARY KEY |
| administrator_name | TEXT UNIQUE NOT NULL |
| password_hash | TEXT NOT NULL |
| administrator_email | TEXT UNIQUE NOT NULL |
| created_at | TIMESTAMP NOT NULL DEFAULT NOW() |

**recipients** — the real "users" table. Grouped by concern:

| Field | Constraints |
|---|---|
| recipient_id | SERIAL PRIMARY KEY |
| full_name | TEXT NOT NULL |
| password_hash | TEXT NOT NULL |
| recipient_email | TEXT UNIQUE NOT NULL |
| is_eligible | BOOLEAN NOT NULL DEFAULT TRUE |
| enrolled_by | INTEGER REFERENCES administrators(administrator_id) ON DELETE SET NULL |
| enrolled_at | TIMESTAMP NOT NULL DEFAULT NOW() |
| revoked_at | TIMESTAMP |
| *— wallet —* | |
| wallet_address | VARCHAR(42) UNIQUE, nullable (no longer required at registration; set once verified) |
| wallet_type | TEXT NOT NULL DEFAULT 'embedded' — CHECK IN ('embedded', 'external') |
| pending_wallet_address | VARCHAR(42), unique when set — awaiting reverification during a wallet rotation |
| *— identity verification (Didit) —* | |
| is_verified | BOOLEAN NOT NULL DEFAULT FALSE |
| verification_status | TEXT NOT NULL DEFAULT 'pending' — pending / in_review / approved / declined / flagged_duplicate / name_change_review |
| didit_session_id | TEXT, unique when set |
| original_didit_session_id | TEXT — the very first session, kept for reference across reverifications |
| didit_session_purpose | TEXT NOT NULL DEFAULT 'registration' — registration / wallet_rotation / reverification |
| identity_hash | TEXT — SHA-256 of normalized (first, last, DOB); indexed for duplicate lookup |
| verification_details | TEXT — raw decision payload |
| verified_at | TIMESTAMP |
| pending_identity_hash / pending_verification_details | staged during a name-change reverification, pending admin resolution |
| *— ChainBase virtual card —* | |
| card_requested_at | TIMESTAMPTZ — one-time card request (null = no card yet) |
| card_mailing_address | TEXT — freeform, collected for a future physical-card program |
| card_locked | BOOLEAN NOT NULL DEFAULT false |
| card_reissue_requested_at | TIMESTAMPTZ — starts the 30-day reissue cooldown |
| *— notification preferences —* | |
| notify_email_disbursements | BOOLEAN NOT NULL DEFAULT true |
| notify_email_verification | BOOLEAN NOT NULL DEFAULT true |
| *— simulated spending —* | |
| balance | NUMERIC(12,2) NOT NULL DEFAULT 0 — the "Spend Tokens" ledger; unrelated to real on-chain USDC |

**didit_webhook_events** — `event_id` (PK), `session_id`, `status`, `received_at`. Guards against Didit redelivering the same webhook.

**disbursement_cycles** — *(corrected from original spec)*

| Field | Constraints |
|---|---|
| cycle_id | SERIAL PRIMARY KEY |
| triggered_by | TEXT NOT NULL DEFAULT 'scheduler' — *(was incorrectly an FK to administrators; cycles are scheduler-triggered)* |
| scheduled_date | TIMESTAMP — *(was incorrectly `NUMBER DEFAULT 0`)* |
| triggered_at | TIMESTAMP |
| amount_per_recipient | NUMERIC(12,2) NOT NULL |
| total_recipients | INTEGER NOT NULL DEFAULT 0 |
| status | TEXT NOT NULL DEFAULT 'pending' — pending / processing / completed / failed |

**disbursements**

| Field | Constraints |
|---|---|
| disbursement_id | SERIAL PRIMARY KEY |
| cycle_id | INTEGER REFERENCES disbursement_cycles ON DELETE CASCADE |
| recipient_id | INTEGER REFERENCES recipients ON DELETE CASCADE |
| status | TEXT NOT NULL DEFAULT 'pending' — pending / confirmed / failed |
| amount | NUMERIC(12,2) NOT NULL DEFAULT 0 |
| tx_hash | VARCHAR(66), **UNIQUE(tx_hash, recipient_id)** — *(corrected: `disburseBatch` pays a whole cycle in one tx, so every disbursement row in that cycle shares a `tx_hash`; a bare `UNIQUE` on the column alone would break that)* |
| disbursed_at | TIMESTAMP |

**funding_pool** — `pool_id` (PK), `balance NUMERIC(14,2)`, `last_synced_at`.

**audit_log** — `log_id` (PK), `administrator_id` (FK, nullable), `action_type`, `target_recipient_id` (FK, nullable), `details`, `created_at`.

**spending_behavior** — backs the simulated "Spend Tokens" feature: `behavior_id` (PK), `recipient_id` (FK), `period` (e.g. `2026-08`), `restricted_purchase_count`, `total_transaction_count`, `updated_at`, unique on `(recipient_id, period)`.

**bonus_awards** — the monthly bonus-eligibility review: `bonus_id` (PK), `recipient_id` (FK), `cycle_id` (FK), `period`, `amount`, `status` (`pending`/approved/denied), `reviewed_by` (FK, nullable), `reviewed_at`, `created_at`, unique on `(recipient_id, cycle_id)`.

---

## 5. API Contract

Grouped by concern. All recipient-authenticated routes require a bearer JWT for that recipient; admin routes require an admin JWT.

**Auth & identity** (`/api/auth/...`)
- `POST /recipient/register` → `{ full_name, recipient_email, password }` — creates an unverified recipient, starts a Didit session, returns `verification_url`.
- `POST /recipient/login`, `POST /admin/login` — standard credential login.
- `GET /me` — current user (recipient or admin), full profile.
- `POST /recipient/verification` — (re)start a Didit session if the previous one wasn't completed.
- `DELETE /recipient/account` — self-service delete, blocked once `verification_status` is `approved`/`name_change_review`.
- `POST /recipient/reverify` — start a reverification session (legal name change / updated documents).
- `POST /recipient/wallet-rotation` → `{ new_wallet_address }` — stages a wallet change pending a selfie reverification.

**Wallet & card** (`/api/auth/recipient/...`)
- `POST /wallet-token` — mints the Custom-JWT the frontend hands to Web3Auth to provision the embedded wallet.
- `POST /wallet` → `{ wallet_address, wallet_type }` — one-time set, requires `verification_status = approved`.
- `POST /card` → `{ mailing_address }` — one-time card request, requires a wallet first.
- `PUT /card/lock` → `{ locked }` — blocked from manual unlock while a reissue cooldown is active.
- `POST /card/reissue` — force-locks the current card, starts the 30-day cooldown; 409s if one is already active.

**Account settings** (`/api/auth/recipient/...`)
- `PATCH /profile` → `{ full_name }`.
- `POST /change-password` → `{ current_password, new_password }`.
- `PUT /notifications` → `{ notify_email_disbursements, notify_email_verification }`.

**Webhooks**
- `POST /api/webhooks/didit` — HMAC-SHA256-signed (`X-Signature-Simple`, 300s replay window), processes verification/reverification/wallet-rotation decisions asynchronously; deduplicated via `didit_webhook_events`.
- `POST /api/spending/webhooks/stripe` — issuing-transaction webhook shape kept for the simulated spending tracker (see §2).

**Recipients** (`/api/recipients`)
- `GET ""` (admin, `?is_eligible=`), `GET "/{id}"` (self or admin), `POST ""` (admin enroll — auto-approved, skips Didit).
- `PATCH "/{id}/revoke"`, `PATCH "/{id}/reinstate"` (admin).
- `PATCH "/{id}/resolve-duplicate"`, `PATCH "/{id}/resolve-name-change"` (admin — resolves the two identity-review states from §3).
- `GET "/{id}/disbursements"` (self or admin).

**Disbursement Cycles** — `GET /api/cycles`, `GET /api/cycles/:id` (admin only, read-only). ~~`POST /api/cycles`~~ / ~~`POST /api/cycles/:id/trigger`~~ removed — the APScheduler job creates and executes cycles automatically (see §3).

**Spending** (`/api/spending/...`, simulated — see §2) — `POST /purchase`, `GET /balance`, `GET /me`, `POST /simulate` (admin demo), `GET ""` (admin summary).

**Bonuses** (`/api/bonuses`) — `GET ""`, `POST /calculate` (admin), `PATCH "/{id}/approve"`, `PATCH "/{id}/deny"` (admin).

**Funding Pool** — `GET /api/funding-pool` (admin, cached balance), `POST /api/funding-pool/sync` (admin, re-syncs against on-chain balance).

**Audit Log** — `GET /api/audit-log` (admin, optional `?action_type=` + pagination).

---

## 6. Core Technologies

- **React** — frontend for Recipient Dashboard and Admin Panel
- **Python + FastAPI** — backend REST API, auth, smart contract orchestration via Web3.py
- **PostgreSQL** — all persistence (see §4)
- **Didit** — hosted identity verification (KYC + liveness), Custom-signed webhooks
- **MetaMask Embedded Wallets (Web3Auth)** — MPC-based embedded wallet provisioning via Custom JWT; `wagmi`/`viem` on the frontend for wallet state
- **Ethereum** (Sepolia testnet for development) — contract deployment and disbursement execution
- **USDC (Circle, ERC-20)** — disbursement token; `transfer()` / `balanceOf()`
- **Solidity** — the ChainBase Distributor contract: eligibility registry, batch USDC transfer logic, funding pool balance checks
- **Web3.py** — connects FastAPI to Ethereum
- **APScheduler** — drives the automatic monthly disbursement cycle
- **Hardhat** — local contract development/testing before testnet deployment
- **Infura or Alchemy** — Ethereum RPC node provider

---

## 7. Explicitly Descoped (with rationale)

| Feature | Why it's out |
|---|---|
| Custom token / stablecoin | Maintenance risk outweighs benefit at student-project scale — USDC avoids this entirely. |
| Real physical card issuance | Would require a real card-issuing partnership (e.g. Rain, Bridge) plus a sponsor bank and KYC/AML compliance — out of scope for the timeline. The mailing address is collected honestly for "when it exists," not pretended to be fulfilled today. |
| Real email notification delivery | No SMTP/email-provider integration exists. Preferences are real and persisted; delivery is not — labeled as such in the UI rather than silently doing nothing. |
| Demurrage mechanics | Replaced with simple balance reminder notifications. |
| Zero-knowledge proof identity | Complexity vs. timeline tradeoff — Didit's hosted KYC covers the Sybil-resistance need instead. |
| Treasury dashboard | Complexity vs. timeline tradeoff. |
| Plaid integration | Complexity vs. timeline tradeoff. |
| AI-based document verification | Too complex for the timeline; delegated entirely to Didit. |
| Policy simulation features | Not part of role scope — only Recipient and Administrator roles exist. |
| Admin-triggered disbursement / MetaMask signing for admins | Superseded by fully automatic APScheduler-driven disbursement. |

Stretch features from the original spec (idle-balance reminders, spending suggestions dashboard, funding pool depletion forecasting) remain **optional cut-if-short** items, not committed scope.

---

## 8. Open / In-Progress

**Identity, wallet & card layer**
- Core flow (register → Didit verify → wallet setup → dashboard) is built and tested end-to-end, including the duplicate-identity and name-change-review admin paths.
- Known limitation: Didit's real webhook cannot reach a local dev backend (no public URL) — local testing requires manually simulating a signed webhook call (see any recent session transcript for the exact HMAC construction) or a tunnel (ngrok) pointed at Didit's dashboard config. Works natively against the deployed Render URL.
- Production database migrations are **not** run automatically on deploy — `server/db/migrate.py` must be run against the production `DATABASE_URL` manually after each deploy that adds columns (it's idempotent — safe to re-run even if some columns already exist).

**Blockchain layer (contracts and automation) — done.**
- `contracts/` — `MockUSDC.sol` (test-only ERC-20, 6 decimals) and `Distributor.sol` (on-chain eligibility registry, live funding-pool balance check via `poolBalance()`, batched USDC disbursement via `disburseBatch`, plus `Pausable`/`ReentrancyGuard`). Hardhat test suite passes (12/12). `scripts/deploy.py` deploys locally or to Sepolia and writes `contracts/deployments/<network>.json`. See `contracts/CLAUDE.md` for design details and rationale.
- `server/chain/`, `server/scheduler/` — the Python/APScheduler automation that actually drives disbursement. `chain/client.py` wraps the Distributor contract; `scheduler/disbursement_job.py` is the monthly cycle logic (`run_disbursement_cycle`), wired into `server/main.py`'s FastAPI `lifespan` via `scheduler/scheduler.py`. `server/scripts/run_disbursement_cycle.py` runs one cycle immediately for manual testing/demos. Config in `core/config.py`: `rpc_url`, `deployer_private_key`, `chain_network`, `cycle_amount_per_recipient`. **`scheduler_enabled` defaults to `False`.**
  - **Eligibility sync design:** nothing calls the contract's `enrollRecipient`/`revokeRecipient` when an admin acts via `/api/recipients`. Instead, `run_disbursement_cycle` reconciles the on-chain registry against the DB's `is_eligible` at the start of every run.
  - Still open: wiring `poolBalance()` into `POST /api/funding-pool/sync`.

**AI feature integration** — not yet finalized. Leading candidate: a plain-language transaction explainer for recipients (low scope, high alignment with transparency/dignity values). If building an AI feature here: **never have a model generate and directly execute raw SQL** — deterministic code handles logic/queries, the model only summarizes structured output.

---

## 9. How to Work With This Project

- Prefer **explanation-before-implementation** — explain what a component does and why before writing code.
- Treat the decisions in §3 as settled; don't re-propose custom tokens, admin-triggered disbursement, additional roles, or fabricated real-world infrastructure (fake card numbers, unlabeled fake email delivery) unless the person explicitly reopens that decision.
- When a feature would visually resemble real financial infrastructure it doesn't actually have (card issuance, email delivery, bank transfers), default to building the honest version — real data collection/persistence where it's genuinely useful, clearly labeled as not-yet-fulfilled where it isn't — rather than a convincing mock.
- Frontend design-system rules live in `CLAUDE.md`, not here.
