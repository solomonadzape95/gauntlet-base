# Gauntlet V1 build status

Updated: September 7, 2026

## Working locally

- Simple landing loop: `PLAY → market strip → OWN`.
- Three-to-five stock selection with centered, brand-colour dither logos.
- Logo-local dither pulse on selection.
- Editable $100,000 virtual allocation with exact-total validation.
- Free virtual drafts saved in the browser without a wallet or deposit.
- Player desk at `/me` showing the latest lineup, weighted practice return, activity, and battle entry.
- Practice battle using the saved lineup and allocation-weighted scoring.
- Optional wallet connection, eligibility confirmation, quote preview, USDC approval, and sequential purchase flow.
- Public impact dashboard truthfully showing zero until verified mainnet activity is indexed.

## Submission-critical work left

### 1. Durable game backend

- Add Supabase tables for profiles, drafts, picks, battles, battle snapshots, and activity.
- Replace browser-only draft storage with signed server persistence while keeping guest play frictionless.
- Generate public challenge links and implement opponent join.

### 2. Real scoring data

- Read the official Chainlink B20 total-return feeds.
- Save immutable start snapshots when a battle begins.
- Recalculate live scores and settle battles idempotently at the end time.
- Add rematch and shareable result states.

### 3. Ownership completion

- Mainnet-test minimum viable order sizes for every supported stock.
- Finish per-stock retry and partial-purchase recovery.
- Verify post-purchase B20 balances on Base.
- Build the `VIRTUAL → OWNED` reveal and BaseScan receipt links.
- Confirm Builder Code attribution on every supported transaction path.

### 4. Eligibility and safety

- Add issuer disclosures and legal links.
- Add location-based US blocking to real purchases while preserving practice mode.
- Test wallet switching, Base network switching, insufficient USDC, insufficient gas, rejected signatures, and stale quotes.

### 5. Proof and instrumentation

- Index confirmed Gauntlet-attributed B20 transactions.
- Populate `/impact` from verified chain data only.
- Track the draft, ownership, battle, invite, and failure funnels.
- Add data-freshness and indexer-health indicators.

### 6. Release readiness

- Deploy a production preview with server-side environment variables.
- Run mobile wallet tests and at least ten uncoached user sessions.
- Capture leaderboard screenshots, thumbnail, demo battle, and a 75–90 second submission video.
- Freeze features after the critical loop succeeds repeatedly.

## Explicitly later

- Leagues, seasons, owner clubs, creator-hosted events, chat, notifications, NFTs, custom tokens, lending, governance, and AI investment advice.
