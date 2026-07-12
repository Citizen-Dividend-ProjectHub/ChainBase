# ChainBase contracts sandbox — session primer

This is Mark's blockchain-layer sandbox within the ChainBase monorepo. See
`../AI_README.md` for the full project context; this file is scoped to just
this directory.

## What's here

- `contracts/MockUSDC.sol` — local/test-only ERC-20 stand-in for USDC (6
  decimals, owner-only `mint`). Never deployed anywhere real USDC exists.
- `contracts/Distributor.sol` — the ChainBase Distributor: on-chain
  eligibility registry (`enrollRecipient`/`revokeRecipient`, owner-only),
  live funding-pool balance check (`poolBalance()` reads `usdc.balanceOf`
  directly, no separate accounting variable to drift), and batched USDC
  disbursement (`disburseBatch(cycleId, recipients[], amountPerRecipient)`).
  Also `Pausable` (emergency stop) and `ReentrancyGuard`. Owner is meant to
  be the backend's service wallet — the same key Web3.py/APScheduler will
  hold, since one process does both admin-forwarded eligibility changes and
  scheduled disbursement.
- `test/` — Hardhat/Chai/ethers tests covering access control, the
  insufficient-funds revert, and the skip-ineligible-without-reverting
  behavior.
- `scripts/deploy.py` — deploys MockUSDC + Distributor locally, or
  Distributor against a real/testnet USDC address on Sepolia. Writes
  `deployments/<network>.json` with `{ address, abi }` per contract — this
  is what the backend's Web3.py layer should import. Python, not JS — the
  project's blockchain-layer work stays in Python except where Hardhat's
  Node-based tooling is actually required (see below). It reads compiled
  ABI/bytecode straight from `artifacts/`, so `npx hardhat compile` must run
  first.

## Design decisions worth knowing before changing this code

- **`disburseBatch` is one atomic transaction covering all recipients in a
  cycle**, not one transaction per recipient. This matches the "batch USDC
  transfer logic" requirement in the main README and is the standard gas-
  efficient distributor pattern (loop-and-transfer inside one call).
- **Consequence:** every disbursement row for a given cycle will share the
  same `tx_hash`, since they all land in the same transaction. The
  `disbursements.tx_hash VARCHAR(66) UNIQUE` constraint in the DB schema
  (owned by Josh) does not account for this and will need to change — e.g.
  drop the `UNIQUE` on `tx_hash` alone, or key uniqueness on
  `(tx_hash, recipient_id)` instead. **This has been flagged in
  `../AI_README.md`, but hasn't been resolved in the DB schema yet as of
  this writing** — check there / with Josh before assuming it's settled.
- On-chain eligibility is enforced independently of the off-chain DB
  (`isEligible` mapping) as a fraud-resistance measure: even if the backend
  DB is compromised or stale, the contract itself won't pay an address it
  doesn't recognize as eligible. `disburseBatch` skips (doesn't revert) any
  address that fails this check, so one bad address can't fail an entire
  month's cycle — but it does revert the whole cycle up front if the pool
  can't cover every *currently eligible* recipient in the batch.
- Single `Ownable` owner, not role-based `AccessControl` — one backend
  process performs every privileged call, so multiple roles would add
  complexity without a real access-control benefit at this project's scale.
- **JS is only here where Node is genuinely required.** `hardhat.config.js`,
  `package.json`, and `test/*.test.js` stay JS because Hardhat (compiling
  Solidity, running the Mocha/Chai test suite) is Node-based tooling with no
  practical Python equivalent for this project — swapping it out would mean
  adopting a different Solidity framework entirely (e.g. Ape/Brownie), which
  wasn't judged worth the risk on this timeline. Everything that *doesn't*
  need Hardhat's runtime (the deploy script) is Python.

## Not yet built (deliberately out of scope for the contracts work)

- The Python/APScheduler script that calls `disburseBatch` on a monthly
  schedule and records `tx_hash`/results back into the DB.
- Wiring `poolBalance()` into `POST /api/funding-pool/sync`.
- The optional MetaMask wallet-connection piece (recipients connect for
  identification only — they never sign disbursement transactions).

## Commands

```
npm install
pip install -r requirements.txt
npx hardhat compile
npx hardhat test
npx hardhat node                                    # local chain, separate terminal
python3 scripts/deploy.py --network localhost
python3 scripts/deploy.py --network sepolia         # needs .env: SEPOLIA_RPC_URL, DEPLOYER_PRIVATE_KEY
```
