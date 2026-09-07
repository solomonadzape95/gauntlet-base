# Gauntlet — Draft2Own Product, Build, and System Plan

**Competition:** Base Tokenized Stocks Builder Quest  
**Submission deadline:** September 9, 2026 at 11:59pm EST  
**Product:** Gauntlet  
**V1 game mode:** Draft2Own  
**Primary objective:** Turn fantasy-stock play into measurable first-time usage of Coinbase tokenized stocks on Base.

> **Build a stock lineup. Own a little. Battle your friends.**

Gauntlet gives each player $100,000 in virtual funds, lets them draft three to five companies, and then offers a guided way to buy a small real version of that draft using Coinbase tokenized stocks. The player keeps the real stocks in their own wallet and uses the portfolio as their team in a social Stock Battle.

This document is the canonical plan for the Base Builder Quest version of Gauntlet. The previous football survival-pool application and plan are preserved in [`../gauntlet-legacy-football`](../gauntlet-legacy-football).

---

## 1. The product thesis

Tokenized stocks do not only need another trading screen. They need an approachable reason for a curious person to make a first selection, acquire a small amount, understand what they own, and return.

Gauntlet uses a game to create that path:

```text
curiosity
  -> free fantasy draft
  -> personal stock selection
  -> small real purchase
  -> B20 ownership in the user's wallet
  -> friend challenge
  -> result and rematch
```

**B20** [Coinbase's token format for tokenized stocks on Base] is not a decorative login requirement. The product should cause and prove real B20 acquisition.

### The promise

> Build a fantasy portfolio for free, then turn the same selection into a small, real tokenized-stock portfolio you control.

### The competition claim

> Gauntlet is a conversion engine from fantasy-stock interest to real tokenized-stock ownership.

### The measurable outcome

The most important number is **new B20-owning wallets** [wallets that held none of the supported B20 stocks before using Gauntlet and hold at least one afterward]. This proves that the product did more than connect existing traders.

---

## 2. V1 boundaries

### V1 must do

1. Let anyone create a three-to-five-stock fantasy draft without connecting a wallet.
2. Display a $100,000 virtual portfolio the player can allocate across all picks, with an equal-split shortcut.
3. Explain the difference between virtual selections and real ownership.
4. Restrict real purchase functionality to eligible non-US adults.
5. Connect a Base-compatible wallet.
6. Quote and execute small USDC-to-B20 swaps.
7. Send every purchased stock directly to the player's own wallet.
8. Verify the resulting B20 balances from Base.
9. Turn the draft visually from `VIRTUAL` to `OWNED`.
10. Create a shareable Stock Battle.
11. Score both players by percentage return rather than money spent.
12. Show transaction and adoption evidence in a public impact dashboard.
13. Attribute supported transactions with the project's Base Builder Code.

### V1 must not do

- Hold user funds.
- Accept entry fees or wagers.
- Pay a cash prize to the winner.
- Reward players for investing more money.
- Recommend which stock to buy.
- Promise profit or imply guaranteed performance.
- Build a custom token.
- Build a custom money-holding smart contract [a program deployed on a blockchain].
- Add lending, borrowing, player-to-player stock trading, NFTs, AI advisers, auctions, season-long leagues, chat, or governance.

These are deliberate exclusions, not missing features.

---

## 3. The V1 user journey

### 3.1 Landing

The landing page immediately explains the loop:

> **Build a lineup. Own a little. Battle your friends.**
> Draft a $100,000 fantasy portfolio, then own a miniature real version on Base from a few dollars.

Primary action: `ENTER THE GAUNTLET`  
Secondary action: `WATCH A BATTLE`

No wallet is requested here.

### 3.2 Build a three-to-five-stock lineup

The player selects between three and five stocks from an allowlist [a deliberately approved list] of official Coinbase tokenized stocks.

For V1, players set the weight of each pick by allocating the full virtual $100,000. The interface begins with an equal split, then lets them express stronger or weaker conviction before locking the portfolio:

The default divides the $100,000 virtual balance as evenly as possible. Players can then edit exact dollar allocations, but the total must remain exactly $100,000 before they continue.

Stock cards should be neutral and consistent. They may show company name, ticker, verified status, current price, and recent price movement, but must not label anything as `recommended`, `safe`, or `best`.

### 3.3 Review the fantasy draft

The review screen shows the selected player-card-style stocks and the combined virtual portfolio.

Primary action: `LOCK MY DRAFT`  
Next prompt: `MAKE THIS DRAFT REAL`

The words `virtual` and `real` must remain visually unmistakable.

### 3.4 Choose a real amount

Offer three preset total amounts:

- $5
- $10
- $25

The smallest option remains provisional until a mainnet test confirms that three-to-five small purchases receive valid quotes and sensible output after fees and price impact.

Example for a $5 draft:

| Stock | Approximate purchase |
|---|---:|
| NVDAc | $1.67 |
| AAPLc | $1.67 |
| TSLAc | $1.66 |

The call to action is `OWN MY DRAFT`.

This is one guided product flow, not necessarily one blockchain transaction. Do not claim that it is technically one transaction unless that is actually implemented and verified.

### 3.5 Eligibility gate

Before a real purchase, the player confirms:

- They are at least 18.
- They are not in the United States.
- They are in an eligible jurisdiction.
- They have reviewed the linked issuer disclosures.
- They understand Gauntlet is a game interface and not investment advice.

The app also blocks real purchasing when its location check identifies the United States. Practice mode remains available.

This gate is a product safeguard, not a substitute for legal advice or a complete compliance program [the rules and controls a regulated financial product may require].

### 3.6 Connect and prepare the wallet

The connected-wallet panel shows:

- Network: Base Mainnet [the live Base network carrying assets with real value]
- Wallet address
- Available USDC [a digital token designed to track one US dollar]
- ETH available for gas [the blockchain processing fee]
- Draft purchase amount
- Estimated output for every stock

If funds are missing, explain exactly what is missing. A complete card or bank deposit system is outside V1.

### 3.7 Own My Draft

Use a recoverable sequence:

```text
1. Check quotes
2. Approve the exact total USDC amount
3. Buy stock one
4. Buy stock two
5. Continue through each remaining selected stock
6. Verify every selected balance
7. Activate owned draft
```

An **approval** [permission for a blockchain program to spend a limited amount of a token] must target only the spender address returned by the swap quote and must be limited to the intended amount.

Every purchase row has these states:

```text
READY -> WAITING FOR WALLET -> SUBMITTED -> CONFIRMED
                                     \-> FAILED -> RETRY
```

If one purchase fails:

- Completed stocks stay in the user's wallet.
- Unspent USDC stays in the user's wallet.
- The failed row explains the problem.
- The player can request a fresh quote and retry only that stock.

Gauntlet never receives or controls the assets. This is **non-custodial** [the user remains in control of the wallet and its contents].

### 3.8 Ownership reveal

After every selected balance is verified, the fantasy cards transition from `VIRTUAL` to `OWNED`.

The reveal should say:

> **YOUR DRAFT IS NOW REAL**  
> Your Coinbase tokenized-stock lineup. Held in your wallet. Ready for battle.

Each stock links to its confirmed BaseScan transaction [a public record of activity on Base].

This is the main demo moment and deserves the most polished motion in the application.

### 3.9 Create a Stock Battle

The owner selects a duration:

- One hour
- Twenty-four hours, selected by default

Gauntlet creates a public challenge URL. The challenge shows the creator's three picks but not their purchase amount.

The invited friend can:

- Join a practice battle with a virtual draft; or
- Own their draft and join an `OWNED BATTLE`.

Only `OWNED BATTLE` results count toward the headline adoption numbers.

### 3.10 Battle scoring

The amount invested never affects the score.

For each stock:

```text
stock return = (current total-return price / starting total-return price) - 1
```

For the allocation-weighted portfolio:

```text
portfolio return = sum of (stock return × that stock's share of the virtual $100,000)
```

A **total-return price** [a price adjusted to account for dividends and stock splits] should come from the official Chainlink feed associated with the B20 token.

The winner is the higher portfolio return at the recorded end time. A tie is allowed. No assets move because of the result.

### 3.11 Result and retention

The result page shows:

- Winner
- Final percentage return
- Contribution of each stock
- Verified-owner status
- Battle duration
- Start and end times
- `REMATCH` action
- Shareable result card

The product's retention loop [the reason a player comes back] is the rematch, not frequent speculative trading.

---

## 4. Screen and route inventory

| Route | Screen | Purpose | Priority |
|---|---|---|---|
| `/` | Landing | Explain the loop and start a draft | P0 |
| `/draft` | Stock draft | Select three to five stocks | P0 |
| `/draft/[id]` | Draft review | Review virtual allocation and start ownership | P0 |
| `/draft/[id]/own` | Own My Draft | Eligibility, amount, wallet, quotes, purchases | P0 |
| `/draft/[id]/reveal` | Ownership reveal | Verify balances and create the emotional payoff | P0 |
| `/battle/[id]` | Battle | Join, follow, and complete a battle | P0 |
| `/me` | Player dashboard | Drafts, holdings used in game, battles, activity | P1 |
| `/impact` | Public proof dashboard | Show verified adoption and transactions | P0 |
| `/how-it-works` | Explanation | Explain virtual play, ownership, scoring, and risk | P1 |
| `/terms` | Terms | Product terms and restrictions | P1 |
| `/privacy` | Privacy | Explain collected data | P1 |

P0 means required for submission. P1 means required if the P0 journey is stable.

---

## 5. Visual direction: original Gauntlet × Nebula

The product retains **Gauntlet** as the brand. `Draft2Own` is the first game mode, not the company name.

### 5.1 What remains from the original Gauntlet

- The existing helmet/shield logo, copied into [`assets/logo.svg`](./assets/logo.svg).
- The sense of entering a serious competition.
- Oversized editorial headlines.
- `OUTPICK / OUTLAST`-style language, adapted to `PICK / OWN / OUTPERFORM`.
- High-contrast black ground.
- Hazard yellow (`#F5FF00`) as the main competitive accent.
- Stock cards that feel like player cards.
- Strong match status, countdown, rank, and versus treatments.
- Mono labels, hard rules, status dots, and confident motion.
- The phrase `ENTER THE GAUNTLET` as the main game invitation.

### 5.2 What comes from Nebula

- The stable dashboard shell and tabbed app navigation.
- Dense but readable live-data panels.
- Dither [a deliberate dotted print texture], grain, and subtle scanlines.
- Large tabular figures [numbers whose digits occupy equal width and remain aligned].
- Visible system-health and data-freshness notices.
- Transaction states that remain on one surface instead of sending users through many pages.
- A public proof dashboard with real activity and charts.
- Strict separation between live blockchain truth and indexed history.
- Square dashboard panels, fine borders, restrained spacing, and clear hierarchy.

### 5.3 The combined design system

| Element | Decision |
|---|---|
| Brand | Gauntlet name and existing helmet/shield logo |
| Background | Near-black `#07080A` |
| Panel | Black-blue `#0C0E12` with one-pixel `#1E232B` borders |
| Primary accent | Gauntlet hazard yellow `#F5FF00` |
| Positive/confirmed | Nebula phosphor mint `#86F2C0` |
| Warning/failure | Ember `#F0A868` and a restrained red for hard failures |
| Main typography | Clean sans serif for explanations and controls |
| Display typography | Original Gauntlet editorial serif for emotional game moments |
| Numeric typography | Geist Pixel or equivalent for scores, value, ranks, and countdowns |
| Utility typography | Mono uppercase labels with wide tracking |
| Texture | Nebula dither overlay at low opacity; never reduce legibility |
| Corners | Square for dashboard panels; pill shape only for primary game actions and status chips |
| Motion | Fast and deliberate; strongest only for stock selection and ownership reveal |

### 5.4 Page personalities

**Landing and draft:** Gauntlet-dominant. Large type, dramatic stock cards, competitive language, and visible momentum.

**Own My Draft:** Nebula-dominant. Calm transaction panel, exact amounts, network status, progress rows, and no visual tricks around money.

**Battle:** Balanced. Gauntlet versus composition on top; Nebula data panels and charts underneath.

**Impact dashboard:** Nebula-dominant. Verifiable numbers, transaction table, funnel, and data-freshness notice.

### 5.5 Interaction rules

- Financial actions never rely on color alone.
- Every pending transaction says what is happening and what the wallet is waiting for.
- Every confirmed transaction receives a BaseScan link.
- Numbers that can change use fixed-width digits to prevent layout movement.
- Respect reduced-motion settings.
- Mobile is the primary transaction experience.
- The ownership reveal may be theatrical; the approval and purchase interface must be calm and literal.
- Do not reuse football photos, flags, jerseys, player names, or World Cup language in the stock product.

---

## 6. Technology needed

### 6.1 Application stack

| Layer | Technology | What it does |
|---|---|---|
| Web application | Next.js + TypeScript | Builds pages, server routes, and typed application logic |
| Styling | Tailwind CSS | Implements the combined Gauntlet/Nebula visual system |
| UI primitives | Selected shadcn/ui patterns plus existing local components | Supplies accessible controls without changing the brand |
| Motion | Motion for React | Handles draft selection and ownership-reveal animation |
| Wallet connection | Wagmi + Viem | Connects wallets, reads balances, sends transactions, and follows confirmations |
| Network | Base Mainnet, chain ID `8453` | Carries the real B20 assets and transactions |
| Payment asset | Base USDC | Funds the stock purchases |
| Swap route | 0x Swap API V2, AllowanceHolder flow | Produces executable USDC-to-B20 quotes and transaction data |
| Stock valuation | Chainlink B20 total-return feeds | Provides consistent start and end prices for battle scoring |
| Database | Supabase Postgres | Stores drafts, battles, indexed transactions, snapshots, and analytics |
| Deployment | Vercel | Hosts the production web application and server routes |
| Product analytics | PostHog, or the local event table if time is short | Measures the user funnel and return behavior |
| Error reporting | Sentry | Records failed requests and client errors without exposing wallet secrets |
| Transaction explorer | BaseScan links | Lets users and judges verify transactions independently |
| Attribution | Base Builder Code using ERC-8021 | Marks supported transactions as generated by Gauntlet |

### 6.2 Why no new smart contract in V1

Drafts and battles do not need to control money. They can be stored by the application while stock ownership and purchase proof remain on Base.

Avoiding a custom contract means:

- Gauntlet cannot trap the user's assets.
- There is less security-sensitive code.
- Partial purchase failure is recoverable.
- More time can go into the real conversion loop and demo.
- The system can ship before the deadline.

A later attestation contract [a blockchain record that proves an event occurred] could record battle results and reputation, but it is not necessary to prove the V1 thesis.

### 6.3 Required accounts and secrets

- Base Builder Code registration
- 0x API key
- Base RPC endpoint [the service used to read and send blockchain data]
- Supabase project and server credentials
- Vercel project
- PostHog key if used
- Sentry key if used

API keys stay in server environment variables [private configuration values on the host]. They must not be shipped to the browser unless the provider explicitly designs them as public keys.

### 6.4 Verified configuration

Maintain one versioned configuration file containing:

- Supported stock ticker
- Company name
- Official B20 contract address
- Token decimals
- Official Chainlink total-return feed address
- Whether current swap liquidity passed testing
- Link to issuer disclosure
- Display artwork key

Only an explicitly allowed token address may reach the quote system.

---

## 7. System architecture

```text
                            +----------------------+
                            |  Official B20 config |
                            | addresses + feeds    |
                            +----------+-----------+
                                       |
                                       v
+----------------+        HTTPS       +-----------------------------+
| Player browser | <----------------> | Next.js application         |
|                |                    | pages + protected API routes |
| - game UI      |                    +----+-------------+----------+
| - wallet       |                         |             |
+-------+--------+                         |             |
        | wallet signatures                |             |
        | and transactions                 |             |
        v                                   v             v
+----------------+                 +---------------+  +--------------+
| Base Mainnet   |                 | 0x Swap API   |  | Supabase     |
|                |                 | price + quote |  | Postgres     |
| - USDC         |                 +---------------+  | game/history |
| - B20 balances |                                    +------+-------+
| - tx receipts  |                                           ^
+-------+--------+                                           |
        |                                                    |
        v                                                    |
+----------------------+          +---------------------------+
| Chainlink B20 feeds  |          | Indexer / scheduled jobs  |
| total-return prices  | -------->| txs + balances + snapshots|
+----------------------+          +---------------------------+
```

### 7.1 Source-of-truth rule

Use the same discipline as Nebula:

> If a wrong value could cause a bad money action, read it from the live quote or blockchain. Use the database for history, aggregation, and game coordination.

| Question | Source of truth |
|---|---|
| How much USDC does this wallet have now? | Base |
| Does the wallet own this B20 now? | Base |
| What transaction will the wallet sign? | Fresh 0x quote |
| Is the purchase confirmed? | Base transaction receipt |
| What was the battle's starting price? | Immutable saved Chainlink snapshot |
| What drafts did the player create? | Postgres |
| How many conversions happened? | Indexed confirmed transactions |
| What is the historical funnel? | Analytics events / Postgres |

The database may cache [temporarily copy] live values for display, but it must not overrule Base when verifying money or ownership.

### 7.2 Trust boundaries

The browser may request actions but cannot declare that a purchase succeeded. The server may organize games but cannot sign for the user. The database may record transaction hashes but cannot create ownership. The blockchain proves balances and confirmations.

```text
Browser: proposes intent
Wallet: grants user authorization
0x: constructs a swap route
Base: executes and confirms ownership
Indexer: turns confirmed events into searchable history
Database: coordinates drafts and battles
```

---

## 8. Data model

### `wallet_profiles`

- `wallet_address`
- `created_at`
- `country_code` if retained, otherwise only eligibility result
- `eligible_for_real_mode`
- `first_seen_b20_count`

Do not treat a wallet address as proof of a unique human.

### `drafts`

- `id`
- `wallet_address`, nullable until connection
- `status`: `editing | locked | ownership_pending | owned | abandoned`
- `virtual_total`: fixed at `100000`
- `real_purchase_total`, nullable
- `created_at`
- `owned_at`, nullable

### `draft_picks`

- `draft_id`
- `token_address`
- `ticker`
- `weight_bps`: `3333`, `3333`, `3334`
- `virtual_amount`
- `real_target_amount`, nullable

**Bps** [basis points] are hundredths of one percent; 10,000 bps equals 100%.

### `purchase_attempts`

- `id`
- `draft_id`
- `token_address`
- `sell_amount_usdc`
- `quoted_buy_amount`
- `quote_expires_at`
- `status`: `quoted | approval_pending | submitted | confirmed | failed`
- `tx_hash`, nullable
- `failure_code`, nullable
- `created_at`
- `confirmed_at`, nullable

### `battles`

- `id`
- `creator_draft_id`
- `opponent_draft_id`, nullable
- `mode`: `practice | owned`
- `status`: `waiting | active | complete | cancelled`
- `duration_seconds`
- `starts_at`
- `ends_at`
- `winner_draft_id`, nullable

### `battle_price_snapshots`

- `battle_id`
- `token_address`
- `kind`: `start | end`
- `feed_address`
- `answer`
- `feed_decimals`
- `chain_timestamp`
- `block_number`

Record enough feed metadata to reproduce the score later.

### `analytics_events`

- `anonymous_session_id`
- `wallet_address`, nullable
- `event_name`
- `draft_id`, nullable
- `battle_id`, nullable
- `properties`
- `created_at`

Never record wallet signatures, recovery phrases, or private keys.

---

## 9. Data cycles

This section explains how information moves through the system.

### Cycle A: Fantasy draft

```text
Player opens draft
  -> app loads verified stock configuration
  -> player selects three to five
  -> browser sends selections to server
  -> server validates every pick against the allowlist
  -> database creates locked draft and picks
  -> browser receives draft ID
  -> analytics records draft completion
```

The server validates the picks even though the browser already did. Browser data can be modified by the user, so server validation protects the system record.

### Cycle B: Quote

```text
Player chooses $5 / $10 / $25
  -> browser requests a quote for the draft
  -> server checks eligibility result and draft ownership
  -> server divides USDC according to draft weights
  -> server requests one indicative price per selected stock
  -> server rejects missing or unreasonable routes
  -> browser displays estimated B20 outputs, fees, and expiry
  -> player reviews before signing anything
```

An **indicative price** [an estimate used for preview rather than execution] must not be treated as a final executable quote.

### Cycle C: Approval and purchase

```text
Player confirms Own My Draft
  -> server requests fresh executable quote for stock one
  -> browser checks live USDC balance
  -> wallet approves only the required spender and amount, if necessary
  -> wallet signs and sends stock-one swap
  -> Base confirms transaction
  -> app reads B20 balance
  -> server records confirmed transaction
  -> repeat with a fresh quote for each remaining stock
```

A quote is refreshed immediately before each purchase because market prices and available liquidity can change.

### Cycle D: Ownership verification

```text
All selected purchases report confirmed
  -> app reads every selected B20 balance from Base
  -> each balance must be greater than its pre-purchase balance
  -> server independently checks transaction receipts
  -> draft status changes to owned
  -> ownership reveal unlocks
  -> impact counters update from confirmed records
```

The client cannot unlock ownership by merely reporting success.

### Cycle E: Battle creation and start

```text
Owned player creates challenge
  -> database creates waiting battle
  -> app produces share URL
  -> opponent locks a draft
  -> mode becomes owned only after opponent ownership is verified
  -> server reads current Chainlink feeds
  -> immutable start snapshots are stored
  -> battle becomes active and end time is fixed
```

**Immutable** means the stored start snapshot is not edited after the battle starts.

### Cycle F: Live score

```text
Viewer opens battle
  -> server loads battle and start snapshots
  -> server reads or briefly caches current Chainlink prices
  -> score engine calculates each stock return
  -> allocation-weighted returns become portfolio scores
  -> browser displays ranks and contribution chart
  -> polling repeats at a reasonable interval
```

Polling [checking for updated data at a regular interval] should be slow enough to avoid wasting requests; 30–60 seconds is sufficient for V1.

### Cycle G: Settlement

```text
Battle reaches end time
  -> scheduled job reads final Chainlink prices
  -> server stores immutable end snapshots
  -> score engine calculates both final returns
  -> server stores winner or tie
  -> battle changes to complete
  -> result page and rematch unlock
```

If the scheduled job fails, the first request after the end time may safely trigger an idempotent settlement [a completion operation that produces the same result even if retried].

### Cycle H: Analytics and proof

```text
Product events + confirmed transaction records
  -> indexer normalizes wallet, token, amount, and timestamp
  -> deduplication removes repeated receipt processing
  -> aggregate queries calculate funnel and usage
  -> impact dashboard displays totals and freshness time
  -> transaction rows link back to BaseScan
```

Only confirmed transactions count as purchases. A clicked button, opened wallet prompt, or submitted-but-failed transaction does not count.

### Cycle I: Failure and recovery

```text
Failure occurs
  -> preserve the last confirmed state
  -> classify failure: quote, balance, approval, rejection, chain, or verification
  -> show a plain-language message
  -> record the failure stage
  -> refresh only the stale part
  -> let the player retry without repeating confirmed purchases
```

This cycle is part of the MVP. Real wallet users abandon products that cannot explain or recover from partial failure.

---

## 10. Analytics and proof

### Core events

- `draft_started`
- `draft_completed`
- `ownership_flow_started`
- `eligibility_passed`
- `wallet_connected`
- `quote_loaded`
- `approval_submitted`
- `approval_confirmed`
- `b20_purchase_submitted`
- `b20_purchase_confirmed`
- `full_draft_owned`
- `challenge_created`
- `challenge_shared`
- `opponent_joined`
- `battle_started`
- `battle_completed`
- `rematch_started`

### Core metrics

| Metric | Definition |
|---|---|
| Completed fantasy drafts | Distinct locked drafts |
| Ownership starts | Drafts that enter the real purchase flow |
| Owned drafts | Drafts with verified increases in all required B20 balances |
| New B20 wallets | Wallets with zero supported B20 balances before and a positive balance after |
| Confirmed B20 purchases | Unique confirmed transaction hashes buying an allowed B20 token |
| Draft-to-own conversion | Owned drafts divided by completed fantasy drafts |
| Owned battles | Battles where both drafts are ownership-verified |
| Challenge acceptance | Joined challenges divided by shared challenges |
| Rematch rate | Completed players who start another battle |

### Submission targets

- 10 eligible non-US testers
- 10 completed drafts
- 5 first-time B20 wallets
- 15 or more confirmed B20 purchases
- 5 owned battles
- 3 shared challenges
- Zero trapped funds
- Zero falsely reported confirmed purchases

---

## 11. Four-day build schedule

### September 5 — prove the hard path

- Register the Gauntlet Builder Code.
- Create 0x API credentials.
- Create the versioned verified B20 configuration.
- Confirm the official token and feed addresses.
- Complete one small USDC-to-B20 purchase on Base Mainnet.
- Complete three sequential purchases.
- Determine the reliable minimum purchase size.
- Confirm balance reads and transaction receipts.
- Test Builder Code attribution on the chosen wallet path.
- Confirm at least one complete Chainlink price read.

**Go/no-go condition:** a real wallet can acquire at least one verified B20 token through Gauntlet's intended transaction path.

### September 6 — complete Draft2Own

- Scaffold the clean Gauntlet web application and migrate only the reusable brand components from the legacy project.
- Build stock selection and locked-draft review.
- Build amount selection and eligibility gate.
- Replace the Sui wallet layer with Wagmi and Viem.
- Build the quote and purchase state machine.
- Build confirmed-balance verification.
- Build the ownership reveal.
- Deploy an internal production preview.

**Exit condition:** an uncoached eligible tester can go from landing page to an owned draft.

### September 7 — complete the game and proof

- Build challenge creation and join flow.
- Store Chainlink start snapshots.
- Build live score calculation.
- Build settlement and result page.
- Add rematch.
- Build the public impact dashboard.
- Add BaseScan links and data-freshness notices.
- Add analytics and failure-stage tracking.

**Exit condition:** two wallets can complete one owned battle and the impact dashboard reflects their confirmed transactions.

### September 8 — testers, reliability, and presentation

- Run at least 10 eligible testers through the funnel.
- Observe without coaching.
- Fix confusing language and transaction recovery.
- Verify US blocking and practice-only behavior.
- Test mobile wallet handoff.
- Verify every metric against BaseScan.
- Polish the draft and ownership-reveal motion.
- Create a completed demo battle.
- Draft the submission copy and video script.

**Exit condition:** the demo path succeeds repeatedly from a fresh session and no critical transaction bug remains.

### September 9 — freeze and submit

- Stop feature development.
- Run a production smoke test [a short check of the critical user journey].
- Complete one final real purchase.
- Confirm the live URL, analytics, and Builder Code.
- Record a 75–90 second Loom.
- Publish it on X and tag `@buildonbase`.
- Submit the official form early.

---

## 12. Fallback ladder

### A. Full Gauntlet Draft2Own

Three to five virtual stocks become real B20 holdings through one guided flow.

### B. Anchor Stock

The player drafts three to five virtual stocks but purchases one chosen **Anchor Stock** [the single pick they most strongly choose to own]. That verified stock activates the owned draft.

### C. Bring Your Own B20

Gauntlet detects an existing B20 balance and uses it to activate a game. This is acceptable as a last resort but weakens the claim that Gauntlet creates new usage.

Never simulate a transaction and present it as real.

---

## 13. Demo plan

### 0–10 seconds: problem

> Tokenized stocks are live on Base, but most people still need a reason and an easy path to try them.

### 10–25 seconds: hook

Select NVIDIA, Apple, and Tesla using the $100,000 fantasy draft.

### 25–55 seconds: transformation

Press `OWN MY DRAFT`, choose the smallest tested amount, and complete the real purchases.

### 55–68 seconds: proof

Show the owned-draft reveal, wallet balances, one BaseScan transaction, and Builder Code attribution.

### 68–82 seconds: game

Create a challenge, show an opponent joining, and show a completed percentage-based battle.

### 82–90 seconds: impact

Show new B20 wallets, confirmed purchases, owned drafts, and battles.

Finish with:

> **Gauntlet turns stock curiosity into real ownership—one fantasy draft at a time.**

---

## 14. After the Quest

Only after the V1 loop proves conversion:

1. Advanced rebalancing after a draft begins.
2. Recurring leagues and seasons.
3. Creator-hosted Stock Battles.
4. Stock-specific Owner Clubs.
5. Sponsored starter portfolios.
6. Educational company events and earnings watch rooms.
7. Onchain battle attestations and reputation.
8. Notifications and social graphs.
9. A partner API [a service other applications use to create Gauntlet experiences].
10. B2B campaigns for wallets, exchanges, and tokenized-asset issuers.

The Base Batches company story is broader than one game:

> **Gauntlet is the consumer engagement layer for tokenized stocks: games, identity, communities, and ownership-powered experiences that turn passive assets into recurring participation.**

---

## 15. Final decision rule

When choosing between two tasks, prefer the one that more directly improves one of these:

1. A real eligible user successfully acquires B20.
2. The transaction is safe, recoverable, and verifiable.
3. The ownership transformation is immediately understandable.
4. A player invites another player.
5. The submission can prove the resulting usage.

If a task does not support one of those five outcomes before submission, it is probably post-V1.
