# Verification notes

This snapshot was taken from the working tree that produced the shipped build. The checks below
were run against that tree; they are recorded here so the backup can be judged, not re-run.

## Build and type checks

| Check | Command | Result |
| --- | --- | --- |
| Types | `npx tsc --noEmit` | 0 errors |
| Production bundle | `npm run build` | 0, emits `dist/assets/index-Bwzlc1UG.js` |
| Offline single file | `npm run build:offline` | 0, emits `ogre-orc-siege-offline.html` (not committed) |
| Deploy worker | `node --check deploy-worker.js` | 0 |

## Deployed smoke test

Preview and production deployments both returned a `succeeded` receipt and both served
`assets/index-Bwzlc1UG.js`. On the production origin, driven with real taps in a browser:

- The shop renders 21 cards; the era bands read 4 / 4 / 4 / 4 / 5 towers across the five eras.
- Sealed-era counts read 0 / 4 / 4 / 4 / 5.
- Artillery is present, disabled, and labelled "Artillery — coming in a future update".
- A search of the served bundle finds no legacy `barrage` tower id.
- Archer, Cannon, Ballista and Frost were each placed through the shop, staged, and confirmed.
- A locked Tesla tap toasts "Tesla Tower unlocks at prestige 1 (Era Industrial Technology)".
- Wave 1-1 was cleared with the gate at 20 lives.

## Save compatibility

The save version and the legacy level remap are covered in `docs/save-format.md`.

## Screenshots (not committed)

These PNGs exist only in the local workspace; the repository holds source and data, and the
art is drawn procedurally at runtime by `src/art.ts` and `tools/make-art.ts`.

- `eras-prod-prep.png`, `eras-prod-fight.png` — production, prestige 0 build phase and wave 1-1.
- `eras-preview-enemies.png` — preview origin, enemy sprites on the board.
- `eras-prestige4-fight.png` — prestige 4 run, wave in progress.
- `eras-shop-layout.png`, `eras-phone-360.png` — shop layout at desktop and 360 px widths.
- `sprite-sheet.png` — every tower and enemy drawing on one sheet.

## Known caveats

- The nine enemy sprites in `src/art.ts` were redrawn after the originals were lost; they are
  stylistically consistent but not pixel-identical to the earlier art.
- No binary image assets are stored in this repository. Icons and splash screens are generated
  by `tools/make-art.ts`, and the Android wrapper is rebuilt with `npx cap add android`.
