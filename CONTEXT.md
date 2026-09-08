# Gauntlet domain language

## Team

A player's single active virtual portfolio. It contains three to five supported stocks whose allocations total exactly $1,000. A player must have a team before entering or accepting a battle. Saving a new team replaces the active team for future battles.

## Draft

The act of choosing stocks and allocating the virtual budget. A completed draft becomes the player's active team. Product copy should call the saved result a team, not a saved draft.

## Battle lineup

An immutable snapshot of a player's team taken when a battle is created or joined. Editing the active team later never changes a battle already in progress or waiting for an opponent.

## Challenge

An invitation created from the challenger's battle lineup. The recipient must bring their own active team. The battle begins with two distinct lineup snapshots when the recipient accepts.

## Virtual budget

The fixed $1,000 allocation used to weight a team and calculate its return. It is neither a deposit nor spendable money.

## Game Week

A scheduled market competition with an entry lock, a fixed start, and a fixed end. Each player may enter once with an immutable snapshot of their active team.

## Performance Points

The Game Week score: a 1,000-point baseline plus one point for every basis point of allocation-weighted portfolio return, with a floor of zero. _Avoid_: activity points, engagement points.

## Leaderboard

The ranking of entries within one Game Week by Performance Points. _Avoid_: an undated global or all-time ranking.
