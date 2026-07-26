# ChainBase — Embedded Wallet Onboarding Implementation Spec

> For Claude Code: this document specifies a change to recipient onboarding. Read it fully before touching code. Cross-references use `§`. If a referenced file/path doesn't exist yet in this repo, create it in the most conventional location for this stack (FastAPI backend, React frontend, PostgreSQL). Ask before making architectural choices not covered here.

## §1 Context

ChainBase is a blockchain-powered Citizens Dividend (UBI) platform. Recipients receive monthly USDC disbursements to an Ethereum wallet, executed by a smart contract. The current onboarding flow requires recipients to either connect MetaMask or paste an existing Ethereum wallet address. This is a hard barrier for recipients who have never used crypto and don't know what a "wallet" or "Ethereum address" is.

Core product values that constrain this work: **dignity, transparency, fraud-resistance**. Any solution must let recipients retain real control of their funds — this is not a green light to build a fully custodial system where the platform holds private keys.

## §2 Problem Being Solved

Replace "recipient must bring/create their own wallet" with "the platform provisions a wallet automatically during signup," without:

- ChainBase ever holding a recipient's private key directly, and
- introducing a second, parallel identity/login system alongside the existing email+password auth.

## §3 Chosen Solution: MetaMask Embedded Wallets (Custom JWT mode)

**Provider:** MetaMask Embedded Wallets (formerly Web3Auth, now under the MetaMask developer platform). Free tier covers up to 1,000 monthly active wallets, which is more than sufficient for this project.

**Why this approach specifically — Custom JWT, not the default social-login modal:**
Embedded Wallets normally shows its own login screen (Google/email/SMS). We don't want that — we already have recipient registration/login in FastAPI. Instead, we use **Custom JWT authentication**: our backend, which has already verified the recipient via our own login, mints a signed JWT vouching for that recipient's identity. Embedded Wallets verifies that JWT against our JWKS endpoint and deterministically provisions the _same_ wallet for the _same_ recipient every time (keyed by email). The private key is split via MPC across the user's device, the provider, and a recovery mechanism — it is never held in full by ChainBase or by MetaMask alone. This preserves "recipient controls their own funds" while removing all seed-phrase/MetaMask-install friction.

**Scope of this task:** dashboard setup, backend (JWKS + JWT signing), frontend (SDK integration), schema migration, and onboarding UX redesign, all implemented by one person in a single pass.

## §4 System Flow

1. Recipient completes existing registration (`full_name`, `recipient_email`, `password`) — no wallet field required.
2. Recipient logs in via existing `/api/auth/recipient/login`.
3. On successful login, backend **also** mints a short-lived `wallet_id_token` (RS256 JWT), separate from the existing session token.
4. Frontend receives both tokens. It passes `wallet_id_token` to the Embedded Wallets SDK's `connect()` call.
5. Embedded Wallets verifies the JWT against our JWKS endpoint, provisions (or re-opens) the wallet, and returns a provider/signer plus the wallet's public address.
6. Frontend sends that address to the backend once, which stores it on the `recipients` row with `wallet_type = 'embedded'`.
7. From here, disbursement logic (§ smart contract / web3.py) is completely unchanged — it just transfers to an address, regardless of how that address came to exist.
8. A "Connect your own wallet instead" path remains available (MetaMask / paste address) for recipients who already have one — this sets `wallet_type = 'external'` and skips steps 3–6.

## §5 Implementation Tasks

### 5.1 Dashboard Setup (manual, one-time — do this before writing code)

1. Create a project at the MetaMask Embedded Wallets developer dashboard. Note the **Client ID**.
2. Go to **Authentication → Custom Connections → Create Connection**, type **Custom JWT**.
3. Configure:
   - **Auth Connection ID**: pick a stable string, e.g. `chainbase-recipients`
   - **JWKS Endpoint**: `https://<your-api-domain>/.well-known/jwks.json` (built in §5.2)
   - **JWT user identifier field**: `email`
   - **iss** validation: your API's issuer string, e.g. `https://api.chainbase.app`
   - **aud** validation: the project **Client ID** from step 1 — do not skip this; without it, tokens minted for other projects would still pass signature verification since all projects share the same signing infrastructure.
4. Paste a sample JWT (generate one manually from §5.2's signing function) to let the dashboard auto-populate field validation.

Record the Client ID and Auth Connection ID in `.env.example` (not committed secrets) for future reference.

### 5.2 Backend — FastAPI

**New: RSA keypair for signing wallet tokens.** Generate once, store the private key as a secret (env var / secrets manager — never in source control):

```bash
openssl genrsa -out wallet_jwt_private.pem 2048
openssl rsa -in wallet_jwt_private.pem -pubout -out wallet_jwt_public.pem
```

**New endpoint: JWKS document**

```python
# GET /.well-known/jwks.json
from jose import jwk
import json

@app.get("/.well-known/jwks.json")
def jwks():
    public_key = jwk.construct(WALLET_JWT_PUBLIC_KEY_PEM, algorithm="RS256")
    jwk_dict = public_key.to_dict()
    jwk_dict.update({"use": "sig", "kid": "chainbase-wallet-signing-key", "alg": "RS256"})
    return {"keys": [jwk_dict]}
```

**Modify: `/api/auth/recipient/login`**
After existing password verification succeeds, also mint the wallet token:

```python
from jose import jwt
import time

def mint_wallet_id_token(recipient_email: str) -> str:
    payload = {
        "sub": recipient_email,
        "email": recipient_email,
        "iss": "https://api.chainbase.app",       # must match dashboard config
        "aud": WEB3AUTH_CLIENT_ID,                 # must match dashboard config
        "iat": int(time.time()),
        "exp": int(time.time()) + 300,              # short-lived, 5 min
    }
    return jwt.encode(payload, WALLET_JWT_PRIVATE_KEY_PEM, algorithm="RS256")

# in the login handler, alongside the existing session token:
response["wallet_id_token"] = mint_wallet_id_token(recipient.recipient_email)
```

**New (or extend existing) endpoint to store the provisioned address:**

```python
# PATCH /api/recipients/:id/wallet
# Body: { wallet_address: str, wallet_type: "embedded" | "external" }
# Auth: recipient may only set their own; validate ownership via session token.
# Validate wallet_address is a well-formed 0x-prefixed 42-char hex string.
# Reject if this recipient already has a wallet_address set (one-time provisioning) —
# unless implementing a future "replace wallet" admin flow, which is out of scope here.
```

### 5.3 Frontend — React

Install the SDK (package names still reference `@web3auth/*` even under the MetaMask branding — check current docs.metamask.io for the exact current package, as this can shift):

```bash
npm install @web3auth/no-modal @web3auth/base
```

After login, using the `wallet_id_token` returned from `/api/auth/recipient/login`:

```js
const result = await web3auth.connect({
  idToken: walletIdToken,
  authConnectionId: "chainbase-recipients", // must match dashboard
  userIdField: "email",
});

const accounts = await result.provider.request({ method: "eth_accounts" });
const walletAddress = accounts[0];

// One-time: persist the address on the backend
await fetch(`/api/recipients/${recipientId}/wallet`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${sessionToken}`,
  },
  body: JSON.stringify({
    wallet_address: walletAddress,
    wallet_type: "embedded",
  }),
});
```

Do this automatically right after registration/first login completes — the recipient should not see a "creating your wallet" step unless it's a brief loading state.

**Keep** the existing "I already have a crypto wallet" path (MetaMask connect / paste address) as a collapsed/secondary option. That path sets `wallet_type: "external"` and skips the SDK call entirely.

### 5.4 Database Schema

```sql
ALTER TABLE recipients
  ADD COLUMN wallet_type TEXT NOT NULL DEFAULT 'embedded'
  CHECK (wallet_type IN ('embedded', 'external'));
```

`wallet_address` (existing column) is unchanged in type/constraints — it holds the address either way. Disbursement logic (`disbursements`, `disbursement_cycles`, smart contract calls) requires **no changes**.

### 5.5 Onboarding UX Redesign

Current wizard: **Account → Wallet → Verify** (3 steps, see existing wireframe).

New wizard: **Account → Verify** (2 steps). Wallet provisioning happens silently in the background right after step 1 completes (per §4, steps 3–6), with no dedicated user-facing step. Inside the Account step, add a small, non-default, collapsed link: _"I already have a crypto wallet"_ — expanding it reveals the current MetaMask-connect/paste-address UI, only for recipients who opt in.

**Landing page copy pass:** lead with the benefit, not the mechanism. Replace jargon-first framing ("Connect your Ethereum wallet") with benefit-first framing ("Your monthly dividend, automatically — no bank account needed"). Push "Ethereum," "MetaMask," "USDC" terminology into an optional "How it works" section rather than the primary signup flow.

## §6 Security Considerations

- The RSA private key used to sign `wallet_id_token`s is a sensitive secret: anyone holding it can mint valid identity assertions against the Embedded Wallets project. Store it exactly like a database credential — environment variable or secrets manager, never committed, rotated if ever exposed.
- Always validate `aud` server-side expectations match the dashboard config; this is what scopes tokens to this project specifically.
- `wallet_id_token` is short-lived (5 min) and single-purpose — it should never be reused as a general session/auth token.
- ChainBase's own backend never receives, stores, or transmits a recipient's private key at any point in this flow.

## §7 Testing Checklist

- [ ] New recipient registers → logs in → wallet is provisioned automatically → `wallet_address` populated in DB with `wallet_type = 'embedded'`, no wallet-related UI step shown beyond a brief loading state.
- [ ] Same recipient logs in again later → Embedded Wallets returns the **same** wallet address (deterministic provisioning), not a new one.
- [ ] Recipient who opts into "I already have a wallet" → connects MetaMask or pastes an address → `wallet_type = 'external'`, no Embedded Wallets call made.
- [ ] JWKS endpoint is publicly reachable and returns a valid JWK document.
- [ ] Tampered/expired `wallet_id_token` is rejected by Embedded Wallets (test with a manually expired token).
- [ ] Disbursement cycle triggers successfully against both `embedded` and `external` wallet types with no code path differences.

## §8 Descoped / Rationale Note (for research paper — keep consistent with existing documentation pattern)

Chose an MPC-based embedded wallet model (MetaMask Embedded Wallets, Custom JWT mode) over pure self-custody to prioritize onboarding accessibility for non-crypto-native recipients — a population that a UBI program is explicitly meant to reach without assuming prior technical literacy. This trades a small amount of architectural purity (recipients don't directly hold a raw private key from day one) for a large reduction in exclusion error at signup. Full self-custody remains available as an opt-in path for recipients who want it, preserving optionality rather than removing it.

## §9 Open Questions

- Exact current npm package name(s) for the React SDK — verify against docs.metamask.io at implementation time, as branding/package names have been shifting during the Web3Auth → MetaMask consolidation.
- Whether `wallet_id_token` minting should also happen on self-registration (`/api/auth/recipient/register`) immediately, or only on first login — recommend first login, to keep registration simple and avoid provisioning a wallet before KYC/Persona verification is known to succeed.
- Interaction with Persona KYC step: recommend wallet provisioning happen after KYC passes, not before, so an unverified/fraudulent registration never gets a live wallet address at all.
