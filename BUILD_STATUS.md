# Gauntlet V1 build status

Updated: September 9, 2026

## Working locally

- Plain-language landing loop with a user-scrollable live onchain market strip and no simulated market labels.
- Three-to-five stock selection with centered, brand-colour dither logos.
- Logo-local dither pulse on selection.
- One active team per player, assembled from server-derived onchain Draft Costs within a 1,000-credit Squad Budget.
- Team headquarters at `/draft` with Squad, Transfers, and Market views, Bank, current points, player identity, and responsive layouts.
- Transfer-window locking during active Game Weeks, one free incoming stock, and 25-point deductions for later transfers.
- Free virtual teams saved through a private account/guest API, with browser fallback when persistence is unavailable.
- Combined Player hub at `/me` for the current team, useful destinations, wallet identity, username, and avatar; `/profile` redirects into it.
- Address-bound wallet profile verification using a one-time signature, without depending on Supabase's Web3 auth provider.
- Refresh-safe practice battles using official Base Chainlink total-return feeds, immutable openings, feed freshness, weighted scoring, ties, and final states.
- Durable two-browser challenge links with account/guest-bound roles and selectable one-hour or 24-hour windows.
- Participant-only rematches that preserve the previous duration while taking a fresh active-team snapshot when accepted.
- Explicit battle desk separating fresh solo practice from durable friend challenges.
- Scheduled Game Week entries, immutable team snapshots, performance points, and a week-specific leaderboard.
- Minute-bucketed durable Game Week opening/live/closing prices, shared score history, and real Nebulas-style performance traces.
- Native Vercel cron configuration with authenticated GET support, settlement-before-activation ordering, and idempotent boundary functions.
- Lightweight private leagues with create/join codes and the latest Game Week member table.
- Public team snapshots linked from Ranks and league member rows.
- Optional wallet connection, eligibility confirmation, quote preview, USDC approval, and sequential purchase flow.
- Recoverable per-stock transaction state with receipts and post-purchase B20 balance verification.
- Server-enforced location checks on both indicative and executable purchase quotes.
- The least-privilege Supabase game-record backend and local server secret are configured; live two-browser validation is still required.
- Challenge creation, successful sharing, and opponent joins have durable funnel events in migration `202609080003_battle_events.sql`.
- Public impact dashboard truthfully showing zero until balance-verified server records exist, with BaseScan links as independent proof.

## Submission-critical work left

### 1. Durable game backend

- Apply any pending migrations through `202609090009_game_week_snapshots.sql` in filename order. Migration `007` enables leagues, `008` enables wallet profiles, and `009` enables durable score history, atomic boundaries, and rematches.
- Validate creator/opponent synchronization and deduplicated funnel events against the live project.
- Validate Game Week entry locking, shared opening prices, live ranking, and final settlement against the live project.
- Validate server-priced transfers, active-week locking, penalty propagation, league creation, and two-account joining against the live project.
- Deploy the included Vercel cron with a server-only `CRON_SECRET` (Pro/Enterprise), or configure an equivalent external once-per-minute GET scheduler.

### 2. Real scoring validation

- Apply migration `009`, invoke the scheduler against the live project, and verify its minute-bucketed snapshots and atomic opening/settlement records.
- Verify scheduled boundary calls capture fresh opening and closing snapshots within the accepted three-minute display tolerance.

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

- Seasons, league-specific scoring, owner clubs, creator-hosted events, chat, notifications, NFTs, custom tokens, lending, governance, and AI investment advice.
