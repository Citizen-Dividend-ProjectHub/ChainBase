# AI_ReadMe.md — ChainBase / Citizens Dividend

**Purpose of this file:** This is a context primer for any AI assistant (Claude, Claude Code, or otherwise) working on this project. Read this before making architectural suggestions, generating code, or answering questions about scope. It summarizes the original product spec and layers in the decisions that have since superseded parts of it, so you're working from the current state of the project — not the first draft.

---

## 1. What This Project Is

**ChainBase** is a blockchain-powered platform that automates and transparently distributes a **Citizens Dividend** — a universal monthly income — to eligible recipients using **USDC** on the **Ethereum** blockchain. Each month, a smart contract transfers USDC directly to verified recipients' wallets with no manual claim step required.

**The problem it solves:**
- Traditional banking-based disbursement to large populations is slow, opaque, and expensive. Smart contracts execute instantly and are publicly auditable on-chain.
- Administrators lack real-time visibility into program health, disbursement status, and funding pool levels.
- Recipients have no easy way to verify payments or understand their balance without understanding blockchain infrastructure.

**Core values driving design decisions:** dignity, transparency, and fraud-resistance. Trustworthy infrastructure is treated as the hard problem — harder than the funding itself.

This is a **student capstone project** with a tight timeline. Scope decisions consistently favor simplicity and reliability over feature breadth.

---

## 2. User Roles

Only two roles exist. There is no policy-simulation or additional role tier.

**Recipient**
- Registers and connects an Ethereum wallet (MetaMask, for wallet connection only — not for signing disbursements).
- Views a personal dashboard: USDC balance, disbursement history, transaction hashes, next scheduled payment date.
- Receives monthly USDC disbursements automatically — no claim action required.

**Administrator**
- Views aggregate program data: total enrolled recipients, funding pool balance, total disbursed to date.
- Enrolls recipients (adds wallet address, approves eligibility).
- Revokes / reinstates recipient eligibility.
- Views the full on-chain disbursement log per cycle for audit purposes.
- Does **not** manually trigger disbursements (see §3 — this is a change from the original spec).

---

## 3. Locked Architecture Decisions

These are current and take precedence over anything in the original product spec that conflicts with them:

| Decision | Value |
|---|---|
| Chain | Ethereum (existing public chain — not a custom chain) |
| Token | USDC (existing stablecoin — not a custom token or stablecoin) |
| Disbursement trigger | **Fully automatic**, via **APScheduler** on the backend — not admin-triggered |
| Wallet integration | MetaMask, for **connection only** (recipients don't sign transactions; admins don't sign disbursements via MetaMask popup) |
| Roles | Recipient and Administrator only |
| Stack | PERN (PostgreSQL, Express-style FastAPI backend, React, Node tooling) + Python/FastAPI + Solidity |

**Important divergence from the original spec:** the original spec's API contract includes an admin-initiated `POST /api/cycles/:id/trigger` endpoint with MetaMask signing. That flow has been superseded — disbursement cycles are created and executed automatically on schedule by an APScheduler job calling the smart contract. Admins retain read/audit visibility but do not manually fire disbursements. See §5 for the updated API shape.

---

## 4. Database Schema

Base schema from the original spec, with corrections applied. Corrected fields are marked.

**administrators**

| Field | Constraints |
|---|---|
| administrator_id | SERIAL PRIMARY KEY |
| administrator_name | TEXT UNIQUE NOT NULL |
| password_hash | TEXT NOT NULL |
| administrator_email | TEXT UNIQUE NOT NULL |
| created_at | TIMESTAMP NOT NULL DEFAULT NOW() |

**recipients**

| Field | Constraints |
|---|---|
| recipient_id | SERIAL PRIMARY KEY |
| full_name | TEXT NOT NULL |
| password_hash | TEXT NOT NULL |
| recipient_email | TEXT UNIQUE NOT NULL |
| is_eligible | BOOLEAN NOT NULL DEFAULT TRUE |
| wallet_address | VARCHAR(42) UNIQUE NOT NULL |
| enrolled_by | INTEGER REFERENCES administrators(administrator_id) ON DELETE SET NULL |
| enrolled_at | TIMESTAMP NOT NULL DEFAULT NOW() |
| revoked_at | TIMESTAMP DEFAULT NULL |

**disbursement_cycles** — *(corrected)*

| Field | Constraints |
|---|---|
| cycle_id | SERIAL PRIMARY KEY |
| triggered_by | **TEXT NOT NULL DEFAULT 'scheduler'** — *(was incorrectly an FK to administrators; cycles are scheduler-triggered, not admin-triggered)* |
| scheduled_date | **DATE / TIMESTAMP** — *(was incorrectly `NUMBER DEFAULT 0`)* |
| triggered_at | TIMESTAMP DEFAULT NULL |
| amount_per_recipient | NUMERIC(12,2) NOT NULL |
| total_recipients | INTEGER NOT NULL |
| status | TEXT NOT NULL DEFAULT 'pending' — pending / processing / completed / failed |

**disbursements**

| Field | Constraints |
|---|---|
| disbursement_id | SERIAL PRIMARY KEY |
| cycle_id | INTEGER REFERENCES disbursement_cycles(cycle_id) ON DELETE CASCADE |
| recipient_id | INTEGER REFERENCES recipients(recipient_id) ON DELETE CASCADE |
| status | TEXT NOT NULL DEFAULT 'pending' — pending / confirmed / failed |
| amount | NUMERIC(12,2) NOT NULL DEFAULT 0 |
| tx_hash | VARCHAR(66) UNIQUE — transaction hash, NULL until confirmed |
| disbursed_at | TIMESTAMP |

**funding_pool**

| Field | Constraints |
|---|---|
| pool_id | SERIAL PRIMARY KEY |
| balance | NUMERIC(14,2) NOT NULL DEFAULT 0 |
| last_synced_at | TIMESTAMP NOT NULL DEFAULT NOW() |

**audit_log**

| Field | Constraints |
|---|---|
| log_id | SERIAL PRIMARY KEY |
| administrator_id | INTEGER REFERENCES administrators(administrator_id) ON DELETE SET NULL |
| action_type | TEXT NOT NULL — e.g. enroll_recipient / revoke_recipient / disbursement_cycle_completed |
| target_recipient_id | INTEGER REFERENCES recipients(recipient_id) ON DELETE SET NULL |
| details | TEXT |
| created_at | TIMESTAMP NOT NULL DEFAULT NOW() |

---

## 5. API Contract

Endpoints below reflect the original spec **updated** for automatic disbursement. Auth, recipient management, funding pool, and audit log endpoints are unchanged from the original spec. The cycle-trigger flow is changed.

### Auth
- `POST /api/auth/recipient/register` — self-registration, pending admin approval. Body: `{ full_name, recipient_email, password, wallet_address }`.
- `POST /api/auth/recipient/login` — Body: `{ recipient_email, password }` → `{ token, recipient_id, full_name }`.
- `POST /api/auth/admin/login` — Body: `{ administrator_name, password }` → `{ token, administrator_id, administrator_name }`.

### Recipients
- `GET /api/recipients` — admin only, optional `?is_eligible=true|false`.
- `GET /api/recipients/:id` — self or admin.
- `POST /api/recipients` — admin-approved enrollment path. Body: `{ full_name, recipient_email, wallet_address }`.
- `PATCH /api/recipients/:id/revoke` — admin only.
- `PATCH /api/recipients/:id/reinstate` — admin only.

### Disbursement Cycles — *(updated for automation)*
- `GET /api/cycles` — admin only, optional `?status=` filter. Cycles are created and executed by the scheduler, not by an admin action.
- `GET /api/cycles/:id` — admin only. Returns cycle detail + full on-chain disbursement log for that cycle.
- ~~`POST /api/cycles`~~ and ~~`POST /api/cycles/:id/trigger`~~ — **removed from admin scope.** The APScheduler job creates a cycle record and executes the batch USDC transfer automatically on the configured schedule, writing `triggered_by = 'scheduler'`. Admins have read-only visibility into cycle status and history.

### Disbursements
- `GET /api/recipients/:id/disbursements` — self or admin, paginated (`limit`/`offset`, default 20/0).
- `GET /api/disbursements/:id` — includes `tx_hash` for on-chain verification.

### Funding Pool
- `GET /api/funding-pool` — admin only, cached balance.
- `POST /api/funding-pool/sync` — admin only, re-syncs cached balance against on-chain USDC balance.

### Audit Log
- `GET /api/audit-log` — admin only, optional `?action_type=` and pagination.

**Design notes carried over from the spec:**
- Self-registration (`/api/auth/recipient/register`) and admin enrollment (`POST /api/recipients`) are intentionally separate flows — one is recipient-initiated (pending approval), the other is admin-initiated.

---

## 6. Core Technologies

- **React** — frontend for Recipient Dashboard and Admin Panel (Sadia)
- **Python + FastAPI** — backend REST API, auth, smart contract orchestration via Web3.py (Joshua)
- **PostgreSQL** — recipients, administrators, cycles, disbursements, funding pool cache, audit log
- **Ethereum** (Sepolia testnet for development) — contract deployment and disbursement execution
- **USDC (Circle, ERC-20)** — disbursement token; `transfer()` / `balanceOf()`
- **Solidity** — the ChainBase Distributor contract: eligibility registry, batch USDC transfer logic, funding pool balance checks (Mark)
- **Web3.py** — connects FastAPI to Ethereum
- **APScheduler** — drives the automatic monthly disbursement cycle (Mark)
- **MetaMask** — wallet connection only
- **Hardhat** — local contract development/testing before testnet deployment
- **Infura or Alchemy** — Ethereum RPC node provider

---

## 7. Explicitly Descoped (with rationale)

| Feature | Why it's out |
|---|---|
| Custom token / stablecoin | Maintenance risk outweighs benefit at student-project scale — USDC avoids this entirely. |
| Demurrage mechanics | Replaced with simple balance reminder notifications. |
| Zero-knowledge proof identity | Complexity vs. timeline tradeoff. |
| Treasury dashboard | Complexity vs. timeline tradeoff. |
| Plaid integration | Complexity vs. timeline tradeoff. |
| AI-based document verification | Too complex for the timeline. |
| Policy simulation features | Not part of role scope — only Recipient and Administrator roles exist. |
| Admin-triggered disbursement / MetaMask signing for admins | Superseded by fully automatic APScheduler-driven disbursement. |

Stretch features from the spec (email/in-app payment notifications, idle-balance reminders, spending suggestions dashboard, funding pool depletion forecasting) remain **optional cut-if-short** items, not committed scope.

---

## 8. Open / In-Progress

- **AI feature integration** — not yet finalized. Leading candidate: a plain-language transaction explainer for recipients (low scope, high alignment with transparency/dignity values). Other options considered: recipient onboarding chatbot, admin natural-language query tool, anomaly flagging. If building an AI feature here: **never have a model generate and directly execute raw SQL** — deterministic code handles logic/queries, the model only summarizes structured output. Provider candidates: Google Gemini, Groq, Ollama, OpenRouter.
- Sandbox/parallel dev environment for Mark's blockchain layer, using Claude Code with a `CLAUDE.md` for session persistence. Sandbox scope: Solidity Distributor contract, mock ERC-20 token, Python/APScheduler automation script, optional MetaMask frontend.

---

## 9. How to Work With This Project

- Prefer **explanation-before-implementation** — explain what a component does and why before writing code.
- Treat the decisions in §3 as settled; don't re-propose custom tokens, admin-triggered disbursement, or additional roles unless the person explicitly reopens that decision.
- This file describes the **whole project's** scope. If you're working specifically in Mark's sandbox (blockchain layer), your effective scope is narrower: the Solidity contract, mock ERC-20, the disbursement automation script, and optionally the MetaMask connection piece — not the full frontend/backend.