# Gauntlet

**Build a stock lineup. Own a little. Battle your friends.**

Gauntlet is a fantasy-stock game that turns a free virtual draft into a small real portfolio of Coinbase tokenized stocks on Base. The first game mode is **Draft2Own**.

## Current objective

Build and submit a live V1 to the **Base Tokenized Stocks Builder Quest** by September 9, 2026.

The critical loop is:

```text
free fantasy draft
  -> small USDC purchase
  -> B20 stocks in the player's wallet
  -> shareable Stock Battle
  -> verifiable adoption
```

Read [`PLAN.md`](./PLAN.md) for the product specification, interface direction, technology, architecture, data cycles, delivery schedule, and demo plan.

## Interface direction

The current redesign combines:

- The original Gauntlet name, helmet/shield logo, hazard-yellow accent, editorial game language, and competitive card treatments.
- Nebula's dark dashboard shell, dither texture, live-data panels, transaction progress, aligned numeric typography, and public proof dashboard.

The reused original logo is stored at [`assets/logo.svg`](./assets/logo.svg).

## Repository status

This folder is the clean home for the tokenized-stock product. The previous Sui football-survival implementation has been preserved separately at [`../gauntlet-legacy-football`](../gauntlet-legacy-football).

## Game Week scheduler

Production Game Weeks use the authenticated `GET /api/game-weeks/tick` route. Apply every Supabase migration through `202609090009_game_week_snapshots.sql`, set a server-only `CRON_SECRET`, and deploy `vercel.json`. Vercel supplies that value as a bearer token on every cron invocation.

The included once-per-minute schedule requires Vercel Pro or Enterprise. If the deployment is on Hobby, use an external scheduler with the same bearer-authenticated GET route; a once-daily Hobby cron is not precise enough to lock fair opening and closing prices.
