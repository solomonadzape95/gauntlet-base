# Gauntlet: Fantasy Overview Reconciliation and Submission Plan

**Prepared:** September 8, 2026  
**Source reviewed:** `/Users/solenoid/Downloads/fantasy-stocks-app-overview.md`  
**Current product reviewed:** the Gauntlet codebase and rendered landing, draft, allocation, ownership, practice-battle, and impact screens.

## Decision in one sentence

Keep Gauntlet's current `draft -> own -> compete -> proof` thesis and its existing Gauntlet-colour/Nebulas-structure design; adopt a server-priced Squad Budget, scheduled leaderboard, team headquarters, lightweight leagues, and contextual conversion, while rejecting mocked social filler, fake-token fallback, and third-party geo services.

## The product we should submit

> Build a fantasy stock lineup for free, see how it performs, own a small real version on Base, and challenge a friend.

The demo spine should be:

```text
landing
  -> draft 3–5 verified B20 stocks
  -> assemble a team within a 1,000-credit Squad Budget
  -> play a practice battle with real market data
  -> see a contextual "you could own this lineup" moment
  -> pass eligibility and connect a wallet
  -> buy a tested small amount of real B20 stocks
  -> verify the balance increase on Base
  -> reveal VIRTUAL -> OWNED
  -> share a challenge/result card
  -> prove the activity on /impact
```

This includes the useful insight from the source document—conversion feels stronger after the player has seen a result—without weakening the current ability to own immediately after drafting.

## Contradictions and decisions

| Topic | Source document | Current Gauntlet | Decision | Gap |
|---|---|---|---|---|
| Picks | Exactly 5 stocks | 3–5 stocks | **Keep current.** Three picks makes a $5 starter purchase more plausible and lowers first-run friction; five remains available. | Negligible |
| Draft constraint | Fake $1,000 salary cap with arbitrary stock costs | Previously allocated a full virtual budget across picks | **Use a truthful fantasy market.** Draft Costs come from fresh onchain reference prices, bounded to keep combinations playable; unused credits stay in the Bank. | Implemented server-side |
| Stock universe | 15–20 familiar generic tickers | 10 allowlisted official B20 contracts | **Keep current.** Contract truth and tested liquidity matter more than catalogue size. Add stocks only after address, feed, disclosure, decimals, and quote tests pass. | No change |
| Market data | Finnhub/Alpha Vantage/Yahoo and page-refresh scoring | Static practice values now; official Chainlink B20 total-return feeds planned | **Use the current architecture, finish the integration.** One official feed should power battle snapshots and results. Do not add a second market-data vendor for the core score. | Large, P0 |
| Score window | Since draft time | Since battle start, allocation-weighted | **Keep current.** A fixed challenge start is fairer and reproducible. A solo practice return may begin at draft lock, but battle scoring begins when both sides are ready. | Negligible |
| Competition format | Global leaderboard | One-to-one Stock Battles | **Use both with clear jobs.** Game Weeks provide the main recurring competition and fair shared scoring window; direct challenges remain the social invite/rematch loop. Avoid an undated all-time vanity board. | Add scheduled Game Weeks |
| Conversion timing | Prompt after standings using the best-performing pick | Ownership offered immediately after allocation | **Adopt both moments.** Keep immediate ownership, then repeat a contextual conversion card after a practice result. Do not use counterfactual profit copy as a pressure tactic. | Medium, P0 |
| Conversion execution | Simulated acceptable; testnet stretch | Real Base Mainnet B20 acquisition is the core claim | **Keep current. Never simulate ownership.** If multi-stock minimums fail, use the documented one-stock Anchor fallback and label it honestly. | Large, P0 verification |
| Eligibility | Self-attestation plus third-party IP API | Self-attestation only; server location gate planned | **Adopt the gate, change the mechanism.** Use Vercel's request geolocation at quote/purchase boundaries, fail closed for US, preserve practice mode, and keep the declaration/disclosures. No extra geo vendor. | Medium, P0 |
| Wallet | Coinbase Wallet as a stretch | Coinbase plus injected wallets already present | **Keep current.** Wallet remains optional until ownership. | Done |
| Sharing | Generated result image and prefilled X post | Challenge/result sharing planned, not built | **Adopt.** Generate a branded server-side Open Graph image and a native share/copy-link action. Phrase performance as a game result, not investment promotion. | Large, P0/P1 |
| Reactions/trash talk | Suggested social feature | Explicitly excluded | **Reject for submission.** It needs moderation, identity, and persistence while adding little to verified adoption. | No change |
| “X is buzzing” ticker | Mocked trend flavour | Not present | **Reject.** Fake live data damages the proof-first product. | No change |
| Private leagues | Stretch | Public challenge URLs working | **Add lightweight leagues.** Create/join codes and Game Week member tables deepen the weekly loop without adding chat, seasons, or league-specific scoring. | Implemented |
| Public proof | Not central | `/impact` is a first-class surface | **Keep and finish current.** Impact proves adoption while the Game Week leaderboard proves competition; neither should impersonate the other. | Large, P0 |
| Visual style | Generic “clean card” guidance | Gauntlet identity using Nebulas dashboard structure | **Keep current.** Use the source only for product beats, never as visual direction. | No change |

## Visual contract

Nebulas contributes structure, not its brand palette:

- Keep near-black grounds, the Gauntlet hazard yellow, warm ember for failures, off-white text, and company colours only inside stock identity.
- Keep square data panels, hard one-pixel rules, dither/grain, fixed-width numbers, compact status rows, visible freshness, and literal transaction states.
- Keep the dramatic stock-selection and ownership-reveal moments; keep money actions calm.
- Do **not** introduce mint as a new product accent, generic fintech gradients, glass cards, rounded-everything UI, emoji-led trash talk, or “beat the market” hype.
- Reserve hazard yellow for selection, focus, active competition, and confirmed proof. Failures use ember plus text/icon; state must never depend on colour alone.
- Increase the smallest utility text and weakest grey where needed; the current 8–9px labels and very faint copy are an accessibility risk, especially on mobile.
- Remove the Next.js issue badge from every submission capture and production deployment.

## Current truth

### Plan position now

- **Product/game loop:** built through the reusable team, server-priced Squad Budget, Game Weeks, direct challenges, public team snapshots, and lightweight leagues. Live Supabase validation is the remaining gate.
- **Ownership:** recovery and post-transaction balance verification are built; real minimum-order testing across the allowlist remains.
- **Sharing:** durable challenge URLs, copy/share controls, and branded Open Graph presentation are built; completed-result/rematch sharing still needs a final pass.
- **Proof/release:** `/impact`, production deployment, scheduler configuration, live indexing, mobile-wallet failure testing, and submission capture remain.

### Already strong enough to preserve

- A clear landing proposition with no wallet wall.
- A coherent 3–5 stock card draft.
- A 1,000-credit Squad Budget with onchain-derived Draft Costs and visible Bank.
- Optional free play and optional real ownership.
- Live 0x indicative and firm-quote route structure.
- Exact USDC approval followed by sequential purchases.
- Base Mainnet wallet configuration and ERC-8021 Builder Code suffix.
- A readable head-to-head battle surface.
- A proof dashboard that correctly shows zero rather than invented adoption.
- Clean lint and TypeScript checks as of this review.
- A successful production build through Next's documented Webpack fallback; the default Turbopack build is blocked in this environment by an internal worker-port error, and the Webpack build still reports optional wallet-package warnings that should be cleaned or accepted explicitly before release.

### Claims that are not yet safe to make

- End-to-end durability: the active-team, battle, Game Week, transfer, and league schema is built but still needs live two-account validation after migration `202609080007` is applied.
- Production settlement: the Game Week tick route exists, but the scheduler and opening/closing boundary behaviour are not yet proven in production.
- Mainnet ownership reliability: receipt recovery and balance verification are built, but minimum viable order sizes still need testing for every supported stock.
- Public impact: the page is truthful but has no indexer or confirmed records.
- Release safety: mobile wallet switching, rejected signatures, stale quotes, insufficient funds/gas, and partial-purchase recovery still need a deployed test pass.

### Technical decisions checked against current primary sources

- The official [Base tokenized-stocks directory](https://brand.base.org/stocks) confirms the current B20 stock family, non-US eligibility, self-custody model, and the need to match contract addresses before buying.
- The official [0x AllowanceHolder documentation](https://docs.0x.org/docs/core-concepts/contracts) supports keeping the current AllowanceHolder route and approving only the allowance target returned by the API.
- The official [0x Swap API v2 migration guide](https://docs.0x.org/docs/upgrading/upgrading-to-swap-v2) confirms the `price -> allowance -> firm quote -> submit` shape already present in the code.
- The official [Vercel request-header documentation](https://vercel.com/docs/headers/request-headers.rsc) supports using `x-vercel-ip-country` at the server boundary instead of adding a third-party geolocation API.

## Delivery plan

### Implementation checkpoint — 2026-09-08

- Complete: recoverable per-stock purchase state, receipt checks, post-transaction B20 balance verification, and BaseScan receipts.
- Complete: server-enforced purchase eligibility on preview and executable quote routes, with a development-only country override.
- Complete: official Base Chainlink total-return feed integration, weighted scoring, freshness state/timestamp, refresh-safe 24-hour practice sessions, ties, and final state.
- Complete for practice mode: challenge URLs carry one battle identity, opening feed snapshot, lineup, and end time so a second browser joins the same scoring window.
- Complete: contextual ownership route restores the exact saved draft without rebuilding it.
- Complete in code: Supabase-backed teams, durable challenges, Game Weeks, transfer penalties, public team snapshots, leagues, and branded share metadata.
- Remaining before public submission claims: apply the latest migration, run two-account live validation, test wallet purchases at real minimum sizes, configure settlement scheduling, and add analytics/indexing plus live `/impact` aggregates.
- Practice battles are deliberately local and unshareable. Every public challenge/result URL must resolve to an existing server record.

### Corrective product pass — 2026-09-09

- Replaced the Supabase Web3-provider dependency with an address-bound nonce/signature profile session. The new `202609080008_wallet_profiles.sql` migration must be applied before profile verification can succeed.
- Combined Desk and Profile into one `/me` Player hub; `/profile` now redirects to `/me#profile`. Draft, Battle, Ranks, Leagues, and Impact remain separate because each has a distinct user job.
- Added active navigation states, the Gauntlet-coloured loader, broader dither treatment, real player avatars, cleaner team rows, and the compact timer-only active-battle header.
- Made over-budget experimentation possible in Draft and Transfers: Bank may go negative while selection remains editable, but server and client confirmation remain blocked until the team is within 1,000 credits.
- Replaced the landing autoplay/simulated strip with user-controlled scrolling over the live onchain feed and simplified the hero and steps for first-time users.
- Deliberately did not add decorative performance graphs. Historical charts become valuable only after timestamped score snapshots are persisted; drawing them from fabricated series would contradict the proof-first product.

### Durable scoring checkpoint — 2026-09-09

- Migration `202609090009_game_week_snapshots.sql` adds minute-bucketed opening, live, and closing snapshots plus atomic activation and settlement functions.
- Ranks, leagues, and public teams now score from the same recent persisted snapshot. Direct page reads no longer produce viewer-specific Game Week scores.
- Real score history now powers the performance traces; a missing or older-than-three-minutes scheduler snapshot explicitly holds the live ranking.
- Vercel cron can call the authenticated GET route every minute using `CRON_SECRET`; POST remains available for an external scheduler and legacy `GAME_WEEK_CRON_SECRET` deployments.
- Completed battle participants can create a rematch with the same duration. The rematch remains a new waiting battle with fresh teams and fresh opening prices when accepted.

### B20-native product bet — next

- Build an **Onchain Twin** for every team: the fantasy layer shows Draft Cost and score, while the wallet layer shows the player's verified B20 balance, total-return value, and how much of the lineup they actually own.
- Make each stock row open a proof-backed detail view with the real Game Week price trace, Chainlink capture time, verified B20 contract, wallet balance, and the latest multiplier or corporate-action notice when available.
- Let an eligible player buy only the missing parts of their lineup or rebalance the owned twin after a transfer. Never award gameplay points for spending; ownership is proof and utility, not pay-to-win.
- This is a stronger submission bet than generic stock charts alone because it makes the fantasy-to-tokenized-stock conversion visible, auditable, and specific to B20's self-custody and total-return model.

Progress — 2026-09-09:

- Complete: squad and Market rows open a shared Onchain Twin panel with live Chainlink price, saved/current Draft Cost, real persisted Game Week trace, feed timestamp, allowlisted B20 contract, and connected-wallet balance.
- Complete: the panel remains useful while RPC data is loading and labels preview values honestly; no synthetic chart series is drawn.
- Next: add a one-stock ownership action that purchases only the missing B20 twin after a transfer, reusing the existing eligibility, exact-allowance, receipt, and balance-verification pipeline.

### Product expansion checkpoint — 2026-09-08

- `/draft` becomes the team headquarters after the first team is saved, with Squad, Transfers, and Market views.
- New teams and transfers use server-derived Draft Costs based on fresh Chainlink reference prices, bounded to 25–500 credits for playable combinations.
- The 1,000-credit Squad Budget may leave credits in the Bank; Bank earns no return.
- An active Game Week closes the Transfer Window. Before lock, one incoming stock is free and each additional incoming stock deducts 25 points from the next Game Week.
- A pre-lock team edit updates that player's upcoming Game Week snapshot; the start boundary makes it immutable.
- Lightweight leagues support creation, invite codes, membership, and the latest Game Week table.
- Public locked team snapshots are reachable from Ranks and league member rows.

### Phase 0 — Freeze the submission contract (30 minutes)

1. Freeze the ten-stock allowlist; do not add catalogue breadth.
2. Select the smallest **tested** purchase mode:
   - Preferred: three-stock draft at a tested total.
   - Fallback: one verified Anchor Stock from the draft.
3. Define the only demo claim: a real eligible user acquired verified B20 and then shared a game challenge.
4. Freeze visual tokens to the current palette and write the no-mint/no-gradient rule into the canonical plan.

**Exit:** everyone can say exactly what is real, what is practice, and what is cut.

### Phase 1 — Make ownership truthful and recoverable (P0)

1. Extract the ownership flow from `components/draft-builder.tsx` into a persisted purchase state machine.
2. Add durable `drafts`, `draft_picks`, and `purchase_attempts` records in Supabase.
3. Record each pick's B20 balance before purchase.
4. For each stock: get a fresh 0x firm quote, submit, wait for receipt, then verify that the selected B20 balance increased.
5. Persist every confirmed row immediately; on reload, resume only incomplete rows.
6. Never unlock owned state from a client boolean or receipt alone.
7. Show per-row `READY -> WALLET -> SUBMITTED -> CONFIRMED` and a plain failure reason with `RETRY`.
8. Link each confirmed transaction to BaseScan.
9. Run real minimum-order tests. If the full draft is unreliable, activate the Anchor Stock fallback rather than pretending.

**Exit:** one fresh eligible wallet can complete the chosen real-purchase path twice without false ownership or lost progress.

### Phase 2 — Enforce eligibility at the money boundary (P0)

1. Add a server eligibility endpoint using Vercel request geolocation.
2. Block `US` and unknown production locations from quote and firm-quote endpoints; do not rely on a hidden/disabled client button.
3. Permit an explicit local-development override only outside production so the flow remains testable.
4. Keep age, jurisdiction, disclosure, and not-investment-advice acknowledgements.
5. Store only the decision and country code if needed; do not retain precise IP/location data.
6. Keep all practice routes available regardless of eligibility.

**Exit:** a US/unknown production request cannot obtain executable purchase calldata, while practice mode still works.

### Phase 3 — Build the real game loop (P0)

1. Persist guest drafts server-side using an anonymous session identifier; attach them to the verified wallet later without forcing login at draft time.
2. Add `battles` and immutable `battle_price_snapshots` tables.
3. Create a public challenge URL with `waiting`, `active`, and `complete` states.
4. Let the opponent join with a virtual draft; mark the match `owned` only when both drafts pass onchain ownership verification.
5. Read official Chainlink B20 total-return feeds for start/current/end snapshots.
6. Move scoring into one pure shared module; score percentage return weighted by Draft Cost against the full Squad Budget, never by real money spent.
7. Poll current scores every 30–60 seconds and show the feed timestamp/freshness.
8. Settle idempotently at end time and support tie/result/rematch states.

**Exit:** two browsers can join the same URL, see the same score, refresh safely, and reach the same settled result.

### Phase 4 — Add the document's best conversion idea (P0)

1. After a practice battle/result, show a Gauntlet-styled conversion panel:

   > Your lineup finished **+1.21%** in practice. Own a small real version on Base.

2. Show the strongest contributing pick as evidence, but avoid “you missed $X” or fear-of-missing-out language.
3. Reuse the saved draft and route directly into its ownership state; never ask the player to rebuild it.
4. Keep `OWN THIS DRAFT` after allocation for players already ready to convert.

**Exit:** both immediate and post-result ownership entry points restore the exact same persisted draft.

### Phase 5 — Deliver the share loop (P0 after ownership; P1 otherwise)

1. Create a server-rendered share image for completed practice and owned battles.
2. Include players, picks, percentage result, duration, `VIRTUAL` or `OWNED` status, and Gauntlet URL.
3. Add native Web Share when available, with copy-link fallback and an optional prefilled X intent.
4. Use copy such as `I ran this lineup through Gauntlet` rather than `I beat the S&P` unless the benchmark and period are actually measured.
5. Track `challenge_created`, `challenge_shared`, and `opponent_joined`.

**Exit:** a shared URL opens the correct public result/challenge and renders the correct social preview.

### Phase 6 — Turn proof into a submission asset (P0)

1. Index only confirmed, Gauntlet-attributed B20 transactions.
2. Populate `/impact` from server aggregates: confirmed purchases, owned drafts, new B20 wallets, and owned battles.
3. Add last-indexed time, indexer health, and BaseScan links.
4. Keep zeroes if no verified activity exists; do not seed the public proof surface with demo rows.
5. Reconcile every displayed total manually against BaseScan before recording.

**Exit:** a judge can independently verify the transactions used in the headline metrics.

### Phase 7 — Release and submission pass

1. Run lint, typecheck, production build, and focused tests for allocations, score math, quote validation, eligibility, settlement, and purchase recovery.
2. Test mobile wallet handoff, wrong network, rejected signature, insufficient USDC, insufficient ETH, stale quote, partial failure, refresh, and retry.
3. Run at least one uncoached end-to-end tester on the deployed build.
4. Record the demo only after the production smoke test passes.
5. Demo in this order: hook -> draft -> practice result -> contextual ownership -> verified reveal -> share challenge -> public proof.
6. Submit early; freeze non-critical visual tweaks once the real conversion path is stable.

## Submission cut line

If time collapses, ship in this order:

1. **Non-negotiable:** real quote/purchase, server geo block, balance verification, truthful reveal, BaseScan proof.
2. **Game proof:** persisted draft plus one reproducible practice result using official feed data.
3. **Growth proof:** shareable result/challenge URL and image.
4. **Nice to have:** live opponent joining, timed settlement, rematch.
5. **Cut:** undated all-time leaderboard, reactions, trash talk, seasons, league-specific rules, trend ticker, weekly recap, extra stocks, custom token, testnet theatre.

If multi-stock mainnet purchasing remains unreliable, use the Anchor Stock fallback and say exactly that. A smaller real loop is a better submission than a broad simulated one.

## Acceptance checklist

- [ ] Draft works without wallet connection.
- [ ] Only verified allowlisted B20 addresses can be quoted.
- [ ] Practice prices are real and visibly timestamped, or clearly labelled simulated in a fallback demo.
- [ ] US and unknown production locations cannot reach executable purchase calldata.
- [ ] USDC approval targets only the spender supplied by the current 0x response and uses the intended amount.
- [ ] Every purchase gets a fresh firm quote.
- [ ] Partial completion survives refresh and retries only incomplete rows.
- [ ] `OWNED` requires an onchain balance increase and confirmed receipt.
- [ ] Every confirmed purchase has a BaseScan link.
- [ ] Battle and Game Week scores are Draft-Cost-weighted against the full Squad Budget; Bank earns zero return and real spend remains irrelevant.
- [ ] Public challenge/result URLs survive a new browser session.
- [ ] Share cards correctly say `VIRTUAL` or `OWNED`.
- [ ] `/impact` contains no invented activity.
- [ ] Mobile controls remain reachable above the bottom navigation.
- [ ] Focus, status, errors, and confirmation are understandable without colour alone.
- [ ] Reduced-motion mode removes the theatrical movement without hiding state.
- [ ] Production build contains no development overlay.

## Explicitly deferred

- Undated all-time leaderboard
- Reactions, comments, or trash talk
- Seasons and league-specific scoring
- “Trending on X” data
- Weekly recap automation
- Custom token or custom custody contract
- Testnet substitute for real B20 ownership
- AI picks, recommendations, “safe/best” labels, or benchmark bragging without measured data

These can be reconsidered only after the verified `draft -> own -> challenge` funnel works and is measurable.
