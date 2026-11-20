# src

Every module here is the real file. The one exception is `game.ts`, the simulation core: at
93,484 bytes it was larger than a single repository write, so it is stored as four ordered parts.

| Part | Lines | What it holds |
| --- | --- | --- |
| `game.ts.part1` | 1–559 | header and interfaces, `PathTrack`, game state, constructor, dev hooks |
| `game.ts.part2` | 560–1259 | pointer input, placement, upgrade and sell, wave setup, spawning, wave completion |
| `game.ts.part3` | 1260–2019 | prestige, save adoption, balance harness, board resets, victory and defeat |
| `game.ts.part4` | 2020–2766 | tower firing and targeting, projectiles, damage, hazards, effects, the loop |

Run `./join-game.sh` to write `game.ts` next to the parts. The script inserts the one newline that
falls between part 2 and part 3; the result is byte-for-byte the file this snapshot was taken from
(93,484 bytes, md5 `2c8624787b2c0c6c51e67238f6a6a23a`).

```bash
cd ogre-and-orc-siege/src && ./join-game.sh && rm game.ts.part? join-game.sh README.md
```

After joining, `npm run build` typechecks and bundles the same way the live build did.
