# Save format

localStorage key: `ogre-orc-siege.progress.v1`
Current version: **3** (`SAVE_VERSION` in `src/save.ts`)

```json
{
  "prestige": 4,
  "stored": [{ "id": "sniper", "level": 3, "invested": 980 }],
  "endlessBest": 21,
  "version": 3
}
```

| Field | Meaning |
| --- | --- |
| `prestige` | meta level; each point opens the next tower era |
| `stored` | towers carried between campaign stages, with their level and gold invested |
| `endlessBest` | deepest endless wave survived |
| `version` | save schema version, used to decide whether migration has run |

## Tower ids in saves

Only the twenty active ids may appear in `stored`: `archer cannon ballista frost gatling mortar
flame tesla sniper missile radar autocannon laser plasma emp accelerator quantum singularity
drone stormgen`. `artillery` is never valid — it is shelved content.

## Migration

Version 2 saves (the old tiered roster) are remapped to the nearest surviving technology, keeping
level and invested gold. The same table appears twice: `LEGACY_TOWER_ID` in `src/towers.ts`
(client) and `migrateTowerId` in `deploy-worker.js` (server, so a hostile payload cannot smuggle
an old id through account sync).

| Legacy id | Becomes |
| --- | --- |
| `barrage` | `archer` |
| `heavy` | `mortar` |
| `fire` | `flame` |
| `ice` | `frost` |
| `lava` | `plasma` |
| `doors` | `frost` |
| `inferno` | `plasma` |
| `storm` | `stormgen` |
| `siege` | `sniper` |
| `artillery` | `accelerator` |

Unknown ids are dropped rather than guessed. `legacyLevel()` maps pre-v2 ten-level saves down to
the current curve so an old save does not lose progress.

## Account sync

Progress is mirrored to the account service by `src/account.ts` through `deploy-worker.js`. The
worker sanitises every payload: values clamped, ids whitelisted, `version` rewritten, shelved
towers removed. A signed-out player keeps using localStorage only; an account save is adopted on
sign-in, and the previous local run's board is discarded (towers are stored, not placed).
