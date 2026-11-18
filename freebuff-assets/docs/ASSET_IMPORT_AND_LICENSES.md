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

## Current sources (16)

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
| 9 | Animated Stick Figure Character 2D Free CC0 | RGS_Dev | CC0 1.0 | https://rgsdev.itch.io/animated-stick-figure-character-2d-free-cc0 | `licenses/rgs-stick-figure.txt` |
| 10 | Stick man runner | Freakerbob | CC0 1.0 | https://opengameart.org/content/stick-man-runner | `licenses/stickman-runner.txt` |
| 11 | Dancing Stickman | Lyricsz | CC0 1.0 | https://opengameart.org/content/dancing-stickman | `licenses/dancing-stickman.txt` |
| 12 | Fighting character template Mustermann 2 (karate) | Puffolotti | CC0 1.0 | https://opengameart.org/content/fighting-character-template-mustermann-2-a001aaaa001-karate | `licenses/mustermann-karate.txt` |
| 13 | Spritesheet of a man CC0 | Vander96 | CC0 1.0 | https://opengameart.org/content/spritesheet-of-a-man-cc0 | `licenses/vander-spritesheet.txt` |
| 14 | Kung Fu Battlers pixel art | CodyS | CC0 1.0 | https://opengameart.org/content/kung-fu-battlers-pixel-art | `licenses/kung-fu-battlers.txt` |
| 15 | Streets of Fight | ansimuz | CC0 1.0 | https://opengameart.org/content/streets-of-fight | `licenses/streets-of-fight.txt` |
| 16 | RPG Asset Character 'Kung Fu Man' Gameboy | Chasersgaming | CC0 1.0 | https://opengameart.org/content/rpg-asset-character-kung-fu-man-gameboy | `licenses/gb-kung-fu-man.txt` |

CC0 1.0 deed: https://creativecommons.org/publicdomain/zero/1.0/

Sources 9-16 ship no licence file of their own, so their entries in `licenses/`
are provenance records captured from the item pages: the stated licence, the
deed URL, the download URL and the quoted licence line.

Attribution is not required by CC0. The library records creator and source on
every asset anyway (`creator`, `attribution`, `source`), so credit stays easy.

## Stick-figure and martial-arts imports (10 assets, 43 clips)

Eight CC0 packs were imported on 2026-11-18: RGS_Dev's stick fighter (12 clips
including a 19-frame combo), Freakerbob's stick-man run, Lyricsz's dancing
stickman, two Streets of Fight characters (13 clips), Game Boy Kung Fu Man
(9 clips), Mustermann's karate walk and energy burst, Vander96's reference
sheets and CodyS's kung-fu cast sheet.

How the frame metadata was obtained, per pack:

- **Individual PNG frames** — RGS, the stick-man runner and Streets of Fight
  each publish one file per frame; frames are trimmed and packed, with the
  original canvas kept in `frameWidth`/`offsetX` so alignment survives.
- **Fixed strips** — the Game Boy pack's `*_strip4.png` files and the dancing
  stickman's 64×16 image are evenly divisible into frames whose size comes from
  the file dimensions.
- **GIF frames** — the Mustermann pack is two GIF animations; frames and frame
  timings come from the GIF itself, and the opaque backgrounds are preserved.
- **Not sliced** — Vander96's sheets and the Kung Fu Battlers cast are imported
  as reference sheets because those packs publish no frame layout and the art is
  flattened onto an opaque background; inventing a grid would be guesswork.

The full survey of 22 sources, including the ones that are not redistributable,
is in [`docs/STICK_FIGURE_MARTIAL_ARTS_SOURCES.md`](STICK_FIGURE_MARTIAL_ARTS_SOURCES.md)
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
