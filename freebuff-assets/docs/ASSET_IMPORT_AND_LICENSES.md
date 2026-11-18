# Import policy and licensing

Only art that is verifiably redistributable may be committed to this library.
That rule is stricter than "free to use": a licence that lets you ship art
inside a game but forbids handing out the raw files does **not** qualify,
because this repository redistributes the raw files.

## Acceptance checklist

An asset is accepted only when every line is true:

1. The licence is **CC0 1.0**, or an equally permissive licence that explicitly
   allows redistribution and modification (recorded per source).
2. The source page states that licence, and the licence name appears on the
   page itself — not just in a third-party list.
3. The pack ships a licence file; it is copied to `licenses/`.
4. Creator, source page and download URL are recorded in
   `tools/catalog.mjs` and therefore in `manifests/sources.json`.
5. The asset is real: no placeholder rectangles, no invented files, no
   "coming soon" entries.
6. Frame metadata comes from the pack itself (`sheet.xml` Sparrow data or the
   pack's frame table), never from guesswork.
7. `npm run check` passes, including the validator's licence, bounds and count
   checks.

If any line fails, the asset is linked as an external reference in project docs
instead of being copied here.

## Current sources (8)

All eight are Kenney packs published on OpenGameArt under CC0 1.0. Licence text
was read from each pack's own licence file on 2026-11-18.

| # | Source | Creator | Licence | Page | Licence file |
| --- | --- | --- | --- | --- | --- |
| 1 | Platformer Art Deluxe | Kenney | CC0 1.0 | https://opengameart.org/content/platformer-art-deluxe | `licenses/platformer-deluxe.txt` |
| 2 | Platformer Art: Pixel Redux | Kenney | CC0 1.0 | https://opengameart.org/content/platformer-art-pixel-redux | `licenses/platformer-pixel-redux.txt` |
| 3 | Space Shooter Redux | Kenney | CC0 1.0 | https://opengameart.org/content/space-shooter-redux | `licenses/space-shooter-redux.txt` |
| 4 | UI Pack | Kenney | CC0 1.0 | https://opengameart.org/content/ui-pack | `licenses/ui-pack.txt` |
| 5 | Racing Pack | Kenney | CC0 1.0 | https://opengameart.org/content/racing-pack | `licenses/racing-pack.txt` |
| 6 | Background Elements | Kenney | CC0 1.0 | https://opengameart.org/content/background-elements | `licenses/background-elements.txt` |
| 7 | Generic Items | Kenney | CC0 1.0 | https://opengameart.org/content/generic-items | `licenses/generic-items.txt` |
| 8 | Physics Assets | Kenney | CC0 1.0 | https://opengameart.org/content/physics-assets | `licenses/physics-assets.txt` |

CC0 1.0 deed: https://creativecommons.org/publicdomain/zero/1.0/

Attribution is not required by CC0. The library records creator and source on
every asset anyway (`creator`, `attribution`, `source`), so credit stays easy.

## Verified CC0 candidates not yet imported

- **RGS_Dev — Animated Stick Figure Character 2D Free CC0** — a 512×512 stick
  figure with idle, walk, run, jump, slide, dash, climb, damage, death, air
  attack, wall slide and attack-combo animations, plus a `.blend` source. The
  licence is CC0 on both itch.io and OpenGameArt, so it is eligible for import;
  the files are simply not mirrored here yet. (An earlier note in this file
  wrongly assumed the pack forbade redistribution — the item pages say CC0.)
- 21 further stick-figure and martial-arts sources, with the licence evidence
  read from each item page, are catalogued in
  [`docs/STICK_FIGURE_MARTIAL_ARTS_SOURCES.md`](STICK_FIGURE_MARTIAL_ARTS_SOURCES.md)
  and [`manifests/stick-figure-martial-arts-sources.json`](../manifests/stick-figure-martial-arts-sources.json).

## Deliberately not imported

- **CC-BY, CC-BY-SA and GPL martial-arts packs** — redistributable, but the
  credit, share-alike or copyleft obligations conflict with this library's
  CC0-only policy. They are fine to use directly inside a game.
- **"Free" itch.io packs with no stated licence** — a free download is not a
  licence; the research report lists the ones that fall into this group.
- **Mortal Kombat / Dragon Ball / Naruto sprites and rip packs** — copyrighted,
  no redistribution rights.
- **"Free" asset aggregator sites without a stated licence** — unverified, so
  excluded.
- **Audio** — the UI Pack's sounds are CC0, but this library indexes visual
  clips only; audio would need its own schema.

## Adding a new source

1. Read the licence on the source page and in the pack's own licence file.
2. Copy the licence file into `licenses/<slug>.txt` unmodified.
3. Add the source to `SOURCES` in `tools/catalog.mjs` with `license`,
   `licenseUrl`, `page`, `download`, `licenseFile` and creator details.
4. Copy the sheet and its frame metadata to `assets/<category>/<id>/`.
5. Add the asset to `ASSETS`, naming real clip prefixes and gameplay states.
6. Run `npm run check`; then update the source table above and the counts in the
   repository README.
