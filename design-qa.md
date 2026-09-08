# Design QA — team and versus expansion

Date: September 8, 2026

## References

- Team composition reference: `/var/folders/7l/k5zrsk890wg214m1d2fz1z2c0000gn/T/codex-clipboard-81dbdd17-3eca-4a0d-96e1-a7efef17c7a3.png`
- Primary versus reference: `/var/folders/7l/k5zrsk890wg214m1d2fz1z2c0000gn/T/codex-clipboard-bf40dc38-2f39-40b6-af88-4cd3fb06e76c.png`
- Secondary versus reference: `/var/folders/7l/k5zrsk890wg214m1d2fz1z2c0000gn/T/codex-clipboard-bb3f1315-55bf-408c-8f59-558d53650e03.png`
- Desktop implementation capture: `/private/tmp/gauntlet-team-desktop.png` at 1440 × 1000 CSS pixels.
- Mobile team capture: `/private/tmp/gauntlet-team-mobile.png` at 393 × 852 CSS pixels.
- Mobile transfer interaction capture: `/private/tmp/gauntlet-transfer-action-mobile.png` at 393 × 852 CSS pixels.
- Mobile versus capture: `/private/tmp/gauntlet-versus-mobile.png` at 393 × 852 CSS pixels.

The references were treated as visual inspiration, not product instructions. Their useful patterns were the strong manager-versus-manager split, repeated roster strips, dominant team identity, and clear foreground action. Character art, gradients, gacha framing, and unrelated reward mechanics were deliberately excluded.

## Comparison history

1. The first mobile team pass wrapped `NEBULA_CAPTAIN` too aggressively. The mobile display size was reduced while retaining the Geist Pixel display treatment.
2. The first development preview opened Transfers with an empty selection. Preview state now initializes from the current team, matching persisted behaviour.
3. Affordability was exercised at mobile width: a 91-credit stock moved Bank from 175 to 84 and remained the free incoming transfer.
4. A second incoming stock was exercised after a removal: Bank became 106 and the interface exposed the expected −25 point deduction before confirmation.
5. The versus view was checked at desktop and 393-pixel mobile widths. Desktop retains the central split; mobile stacks both teams and keeps the same ordered roster comparison.

## Result

Passed for the requested visual and responsive scope. The implementation preserves Gauntlet's near-black, hazard-yellow, square-panel Nebulas language, uses real stock marks and dithered player identity, and translates the references into functional team-management and competition states.

The only console noise observed was the existing development analytics request failing locally; no new application runtime errors were observed.
