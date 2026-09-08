# Gauntlet V1 build status

Updated: September 8, 2026

## Working locally

- Simple landing loop: `PLAY → market strip → OWN`.
- Three-to-five stock selection with centered, brand-colour dither logos.
- Logo-local dither pulse on selection.
- Editable $100,000 virtual allocation with exact-total validation.
- Free virtual drafts saved in the browser without a wallet or deposit.
- Player desk at `/me` showing the latest lineup, weighted practice return, activity, and battle entry.
- Refresh-safe practice battles using official Base Chainlink total-return feeds, immutable openings, feed freshness, weighted scoring, ties, and final states.
- Portable two-browser challenge links sharing one battle identity, opening snapshot, and end time.
- Optional wallet connection, eligibility confirmation, quote preview, USDC approval, and sequential purchase flow.
- Recoverable per-stock transaction state with receipts and post-purchase B20 balance verification.
- Server-enforced location checks on both indicative and executable purchase quotes.
- A least-privilege Supabase game-record migration and server-only durable challenge API are prepared but not deployed/configured.
- Public impact dashboard truthfully showing zero until verified mainnet activity is indexed.

## Submission-critical work left

### 1. Durable game backend

- Apply and validate the prepared Supabase tables for drafts, picks, purchase attempts, battles, and battle snapshots.
- Replace browser-only draft storage with signed server persistence while keeping guest play frictionless.
- Wire the existing opponent-join API into the challenge UI after the server secret and migration are installed.

### 2. Real scoring data

- Persist live and final snapshots through the durable API and add rematch.
- Keep the current portable practice fallback labelled as unverified until server records are enabled.

### 3. Ownership completion

- Mainnet-test minimum viable order sizes for every supported stock.
- Reconcile client recovery records into private server records after wallet authentication.
- Confirm Builder Code attribution on every supported transaction path.

### 4. Eligibility and safety

- Add issuer disclosures and legal links.
- Test wallet switching, Base network switching, insufficient USDC, insufficient gas, rejected signatures, and stale quotes.

### 5. Proof and instrumentation

- Index confirmed Gauntlet-attributed B20 transactions.
- Populate `/impact` from verified chain data only.
- Track the draft, ownership, battle, invite, and failure funnels.
- Add data-freshness and indexer-health indicators.

### 6. Release readiness

- Deploy a production preview with server-side environment variables.
- Run mobile wallet tests and at least ten uncoached user sessions.
- Capture result/challenge screenshots, thumbnail, demo battle, and a 75–90 second submission video.
- Freeze features after the critical loop succeeds repeatedly.

## Explicitly later

- Leagues, seasons, owner clubs, creator-hosted events, chat, notifications, NFTs, custom tokens, lending, governance, and AI investment advice.
