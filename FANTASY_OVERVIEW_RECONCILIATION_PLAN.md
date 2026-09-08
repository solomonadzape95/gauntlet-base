# Gauntlet: Fantasy Overview Reconciliation and Submission Plan

**Prepared:** September 8, 2026  
**Source reviewed:** `/Users/solenoid/Downloads/fantasy-stocks-app-overview.md`  
**Current product reviewed:** the Gauntlet codebase and rendered landing, draft, allocation, ownership, practice-battle, and impact screens.

## Decision in one sentence

Keep Gauntlet's current `draft -> own -> head-to-head battle -> proof` thesis and its existing Gauntlet-colour/Nebulas-structure design; adopt the source document's contextual conversion prompt and share card, but reject its arbitrary salary cap, generic global leaderboard, mocked social filler, fake-token fallback, and third-party geo service.

## The product we should submit

> Build a fantasy stock lineup for free, see how it performs, own a small real version on Base, and challenge a friend.

The demo spine should be:

```text
landing
  -> draft 3–5 verified B20 stocks
  -> allocate a virtual $100,000
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
| Draft constraint | Fake $1,000 salary cap with arbitrary stock costs | Allocate a full virtual $100,000 across picks | **Keep current.** Allocation expresses conviction, produces weighted scoring, and maps cleanly to the real purchase split. Arbitrary prices add rules without meaning. | No change |
| Stock universe | 15–20 familiar generic tickers | 10 allowlisted official B20 contracts | **Keep current.** Contract truth and tested liquidity matter more than catalogue size. Add stocks only after address, feed, disclosure, decimals, and quote tests pass. | No change |
| Market data | Finnhub/Alpha Vantage/Yahoo and page-refresh scoring | Static practice values now; official Chainlink B20 total-return feeds planned | **Use the current architecture, finish the integration.** One official feed should power battle snapshots and results. Do not add a second market-data vendor for the core score. | Large, P0 |
| Score window | Since draft time | Since battle start, allocation-weighted | **Keep current.** A fixed challenge start is fairer and reproducible. A solo practice return may begin at draft lock, but battle scoring begins when both sides are ready. | Negligible |
| Competition format | Global leaderboard | One-to-one Stock Battles | **Keep current for submission.** Head-to-head challenges are more distinctive, invite another user, and fit the existing brand. A global board is not required to make the product feel like a game. | No change |
| Conversion timing | Prompt after standings using the best-performing pick | Ownership offered immediately after allocation | **Adopt both moments.** Keep immediate ownership, then repeat a contextual conversion card after a practice result. Do not use counterfactual profit copy as a pressure tactic. | Medium, P0 |
| Conversion execution | Simulated acceptable; testnet stretch | Real Base Mainnet B20 acquisition is the core claim | **Keep current. Never simulate ownership.** If multi-stock minimums fail, use the documented one-stock Anchor fallback and label it honestly. | Large, P0 verification |
| Eligibility | Self-attestation plus third-party IP API | Self-attestation only; server location gate planned | **Adopt the gate, change the mechanism.** Use Vercel's request geolocation at quote/purchase boundaries, fail closed for US, preserve practice mode, and keep the declaration/disclosures. No extra geo vendor. | Medium, P0 |
| Wallet | Coinbase Wallet as a stretch | Coinbase plus injected wallets already present | **Keep current.** Wallet remains optional until ownership. | Done |
| Sharing | Generated result image and prefilled X post | Challenge/result sharing planned, not built | **Adopt.** Generate a branded server-side Open Graph image and a native share/copy-link action. Phrase performance as a game result, not investment promotion. | Large, P0/P1 |
| Reactions/trash talk | Suggested social feature | Explicitly excluded | **Reject for submission.** It needs moderation, identity, and persistence while adding little to verified adoption. | No change |
| “X is buzzing” ticker | Mocked trend flavour | Not present | **Reject.** Fake live data damages the proof-first product. | No change |
| Private leagues | Stretch | Public challenge URLs planned | **Keep challenges, skip leagues.** The invite loop exists without league management. | No change |
| Public proof | Not central | `/impact` is a first-class surface | **Keep and finish current.** It is a stronger judging artifact than a generic leaderboard. | Large, P0 |
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

### Already strong enough to preserve

- A clear landing proposition with no wallet wall.
- A coherent 3–5 stock card draft.
- Exact $100,000 allocation with an equal-split default.
- Optional free play and optional real ownership.
- Live 0x indicative and firm-quote route structure.
- Exact USDC approval followed by sequential purchases.
- Base Mainnet wallet configuration and ERC-8021 Builder Code suffix.
- A readable head-to-head battle surface.
- A proof dashboard that correctly shows zero rather than invented adoption.
- Clean lint and TypeScript checks as of this review.
- A successful production build through Next's documented Webpack fallback; the default Turbopack build is blocked in this environment by an internal worker-port error, and the Webpack build still reports optional wallet-package warnings that should be cleaned or accepted explicitly before release.

### Claims that are not yet safe to make

- “Live” practice scoring: current market prices and changes are hardcoded.
- “Draft owned”: the UI currently treats confirmed transaction receipts as sufficient and does not verify a pre/post B20 balance increase.
- Recovery: receipt progress is only component state, so refresh/navigation can lose partial-purchase recovery.
- Public battles: the current opponent, timer, and match are a local demo.
- Public impact: the page is truthful but has no indexer or confirmed records.
- Location enforcement: the checkbox is not an IP-country gate.
- Shareability: there is no durable challenge URL, result URL, or generated card.

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
- Remaining before public submission claims: Supabase-backed drafts/purchase attempts/battles, signed or server-stored public challenge records, end-to-end wallet purchase tests at real minimum sizes, share image metadata, analytics/indexing, and live `/impact` aggregates.
- Deliberate limitation: local practice links are portable but not tamper-proof. They must not be presented as verified public results until the server record/signature work is complete.

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
6. Move scoring into one pure shared module; score percentage return weighted by virtual allocation, never by real money spent.
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
5. **Cut:** global leaderboard, reactions, trash talk, leagues, trend ticker, weekly recap, extra stocks, custom token, testnet theatre.

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
- [ ] Battle scores are allocation-weighted percentages and ignore real spend.
- [ ] Public challenge/result URLs survive a new browser session.
- [ ] Share cards correctly say `VIRTUAL` or `OWNED`.
- [ ] `/impact` contains no invented activity.
- [ ] Mobile controls remain reachable above the bottom navigation.
- [ ] Focus, status, errors, and confirmation are understandable without colour alone.
- [ ] Reduced-motion mode removes the theatrical movement without hiding state.
- [ ] Production build contains no development overlay.

## Explicitly deferred

- Global leaderboard
- Reactions, comments, or trash talk
- Private leagues and seasons
- “Trending on X” data
- Weekly recap automation
- Custom token or custom custody contract
- Testnet substitute for real B20 ownership
- AI picks, recommendations, “safe/best” labels, or benchmark bragging without measured data

These can be reconsidered only after the verified `draft -> own -> challenge` funnel works and is measurable.
