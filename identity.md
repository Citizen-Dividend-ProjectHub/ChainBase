# ChainBase — Didit Integration Architecture & Scope

## 1. Overview & Core Objective

The primary purpose of integrating **Didit** into **ChainBase** is **Sybil Resistance**—ensuring that every physical citizen receives exactly one UBI payment stream and cannot create multiple accounts to claim multiple disbursements.

Didit acts as our automated identity verification provider, handling sensitive Personally Identifiable Information (PII), ID/passport extraction, and biometric liveness/face matching, via a hosted verification session.

(Originally scoped around Persona; switched to Didit because Persona's signup requires a business email we don't have. Didit's signup at `business.didit.me` works with any email, needs no card, and gives an instant sandbox API key with 500 free verifications/month.)

---

## 2. Mandatory Gatekeeping Registration Flow

To guarantee that no user can bypass verification, identity verification is enforced **during the account creation process**.

### Onboarding Lifecycle & Gatekeeping Rules

1. **Initial Registration Request:** The user fills out the signup form (email/username, password, wallet address).
2. **Account Provisioning (Unverified State):** The system creates the recipient record in PostgreSQL with:
   - `is_verified = False`
   - `is_eligible = False`
   - `verification_status = 'pending'`
3. **Mandatory Didit Verification Step:**
   - The user cannot access the main application dashboard or perform any action until identity verification is submitted.
   - The backend requests a Didit verification session (`POST /v3/session/`) and the React frontend immediately embeds the returned `verification_url` in an in-app modal (iframe) — the user never leaves ChainBase.
   - The user submits their **Government ID or Passport** and completes a **Live Selfie (with Liveness Detection)** inside that embedded session.
4. **Asynchronous Processing via Webhooks:**
   - The application backend listens for official signed webhooks from Didit.
   - **If Approved & Unique:** The recipient's database status is updated to `is_verified = True` and `is_eligible = True`, unlocking their account and granting UBI eligibility.
   - **If Duplicate / Fraud Detected:** The account is flagged (`verification_status = 'flagged_duplicate'`) and surfaced in an Admin Review view, preventing any payment claims until an admin resolves it.

---

## 3. Key Scope Requirements for Development

### A. Database Scope (PostgreSQL)

- Extend the `recipients` table (the real "users" table in this schema — see `server/db/migrate.py`) to track: `didit_session_id`, `is_verified`, `verification_status` (`pending` / `in_review` / `approved` / `declined` / `flagged_duplicate`), `identity_hash`, `verification_details`, `verified_at`.
- `identity_hash` is a deterministic SHA-256 hash of normalized First Name + Last Name + Date of Birth, used to prevent duplicate entries across accounts. There is no separate `eligibility_registry` table in this project — eligibility is the existing `recipients.is_eligible` boolean, already consumed directly by the on-chain disbursement scheduler.
- A small `didit_webhook_events` table (`event_id` primary key) guards against Didit redelivering the same webhook event.

### B. Frontend Scope (React)

- **Modal Enforcement:** Render the Didit hosted verification page inside an in-app iframe/modal immediately after initial account registration (no installed SDK package — just an `<iframe src={verification_url}>`).
- **Access Guarding:** Block navigation to recipient features/dashboards if `is_verified` is false.
- **Reference Binding:** Pass the backend recipient ID into the Didit session creation call as `vendor_data`, so Didit sessions map directly back to the recipient record via the stored `didit_session_id`.

### C. Backend Scope (FastAPI)

- **Webhook Endpoint:** `POST /api/webhooks/didit` — processes Didit verification events asynchronously.
- **Signature Verification:** HMAC-SHA256 signature checking on all incoming Didit webhooks, using the `X-Signature-Simple` scheme (`HMAC-SHA256(secret, "{timestamp}:{session_id}:{status}:{webhook_type}")`, compared with `hmac.compare_digest`) plus a 300-second timestamp replay window, to prevent spoofing.
- **Deduplication Check:** Upon receiving an `Approved` session:
  - Normalize extracted legal fields (Name, DOB) and hash them.
  - Check the database for existing identity hashes among other **approved** recipients.
  - If a match exists across different recipient IDs, flag the new recipient (`flagged_duplicate`) and route it to the Admin Review surface (an extension of the existing admin Recipients page) instead of activating eligibility.
  - If no match exists, activate `is_verified` and `is_eligible`.

---

## 4. Edge Case Handling Scope (Deferred — Future Work)

These edge cases are documented for completeness but are explicitly **out of scope** for the initial Didit integration pass, given this project's capstone timeline. They remain valid future work once the core mandatory gate ships.

### Edge Case 1: Wallet Rotation / Address Update

- **Requirement:** When an authenticated recipient requests to change a compromised wallet address, require a **Didit selfie-only reverification** session.
- **Behavior:** Match the recipient's live selfie against their prior verification's biometric result. Upon a successful match, approve the wallet update in PostgreSQL and on the blockchain contract.

### Edge Case 2: Legal Name Changes

- **Requirement:** If an existing verified recipient re-verifies with a new legal document (e.g., passport or ID update) and Didit reports a data mismatch against the prior verification, route the case to manual review.
- **Behavior:** Route these inquiries to an **Admin Review** surface. Allow designated administrators to inspect legal linking documents (like marriage certificates or court orders) and manually update the recipient's `identity_hash`.
