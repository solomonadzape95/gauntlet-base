# Gauntlet domain language

## Team

A player's single active squad of three to five supported stocks. A player must have a team before entering a Game Week or accepting a challenge. _Avoid_: saved draft, portfolio when referring to the fantasy roster.

## Draft

The act of choosing stocks whose combined Draft Costs fit the Squad Budget. A completed draft becomes the player's active team. Product copy should call the saved result a team, not a saved draft.

## Battle lineup

An immutable snapshot of a player's team taken when a battle is created or joined. Editing the active team later never changes a battle already in progress or waiting for an opponent.

## Challenge

An invitation created from the challenger's battle lineup. The recipient must bring their own active team. The battle begins with two distinct lineup snapshots when the recipient accepts.

## Squad Budget

The fixed 1,000-credit limit used to assemble a team. It is neither a deposit nor spendable money. _Avoid_: wallet balance, virtual allocation.

## Draft Cost

The whole-credit price of a stock when it is added to a team, derived from its current onchain reference price and bounded for playable team combinations. _Avoid_: share price, purchase price.

## Bank

The unspent portion of a player's Squad Budget. Bank earns no return and remains available during an open Transfer Window.

## Transfer Window

The period before a Game Week starts when a player may change their team. The window is closed throughout an active Game Week.

## Transfer Penalty

Performance Points deducted from the next Game Week after the free transfer allowance is exhausted. _Avoid_: fee, payment.

## League

A player-created group whose table ranks member Game Week scores. League membership does not change a team or its score.

## Game Week

A scheduled market competition with an entry lock, a fixed start, and a fixed end. Each player may enter once with an immutable snapshot of their active team.

## Performance Points

The Game Week score: a 1,000-point baseline plus one point for every basis point of Draft-Cost-weighted team return, with a floor of zero. _Avoid_: activity points, engagement points.

## Leaderboard

The ranking of entries within one Game Week by Performance Points. _Avoid_: an undated global or all-time ranking.
