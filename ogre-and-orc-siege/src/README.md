# src

Every module here is the real file. The one exception is `game.ts`, the simulation core: at
93,484 bytes it was larger than a single repository write, so it is stored as four ordered parts.

```
game.ts.part1   17,338 bytes   header, interfaces, PathTrack, board state, dev hooks
 game.ts.part2   24,060 bytes   input, placement, upgrade/sell, waves, spawning, victory/defeat
game.ts.part3   26,037 bytes   prestige, save adoption, dev siege harness, board resets
game.ts.part4   26,048 bytes   towers, targeting, firing, projectiles, damage, effects, loop
```

Run `./join-game.sh` to write `game.ts` next to the parts. The script inserts the one newline
that falls between part 2 and part 3; the result is byte-for-byte the file this snapshot was
taken from (`93484` bytes, md5 `2c8624787b2c0c6c51e67238f6a6a23a`).

```bash
cd ogre-and-orc-siege/src && ./join-game.sh && rm game.ts.part? join-game.sh
```

After joining, `npm run build` typechecks and bundles the same way the live build did.
