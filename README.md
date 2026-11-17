# NINJA KOMBAT — Arcade Fighting Championship

A self-contained 2D arcade fighting game in a single `index.html`. Fight a
five-opponent arcade ladder against an AI, or take on a friend on one keyboard.
Matches are best of three rounds. All art, animation and particles are drawn
procedurally on a canvas, so there are no external sprites, fonts or CDNs to load.

## Modes

- **ARCADE** — single player. Pick a fighter, then beat five opponents in a row;
  each one reacts faster, blocks more and spends energy more often than the last.
  Win a match to advance, lose and the same opponent waits for a retry. Beat the
  fifth fighter to become champion.
- **2P VERSUS** — two players on one keyboard, each choosing a fighter.

Matches are **best of three rounds**: the first fighter to win two rounds takes
the match. Rounds end on a knockout or when the 99-second timer expires (the
fighter with more health wins); a draw replays the round. Round wins show as the
two pips beside each name. After a match ends, press **Enter** (or click the
arena) to advance.

## Roster

Every fighter has its own speed, health, normal-attack damage/cooldown, reach and
signature KI attack. The KI attack is listed under the energy bar in-game.
Each fighter also has a distinct silhouette, hairstyle, gear and idle stance
(headband, topknot, ponytail, horned mane, braid, bald master with beard), drawn
procedurally so the same look appears in the select previews and in battle.
Walk cycles and attack flourishes match that character too: Kage struts with a
palmed thrust and low sweep, Mira glides with fast jabs and high kicks, Oni
stomps with a hammer blow and falling axe kick, Sora spins through strikes and
kicks, Kuro shuffles with short palm strikes, and Shadow uses a straight
punch and front kick.

| Fighter | Title | Speed | Health | Signature attack |
| --- | --- | --- | --- | --- |
| SHADOW WARRIOR | The Wanderer | 4.0 | 100 | **Shadow Bolt** (25 KI) — fast straight projectile |
| KAGE THE WANDERER | Stone Stalker | 3.6 | 110 | **Earth Wave** (28 KI) — ground wave, jump over it |
| MIRA STORMBLADE | Sky Duelist | 4.4 | 95 | **Storm Fan** (32 KI) — three-projectile fan |
| ONI OF THE ASH | Cinder Brute | 3.4 | 115 | **Ash Cannon** (38 KI) — slow, heavy orb |
| SORA SKYFANG | Gale Lancer | 4.7 | 92 | **Sky Lance** (30 KI) — very fast lance slash |
| MASTER KURO | Twin Shadow | 3.9 | 100 | **Twin Shadows** (28 KI) — two clones strike |

## Character select

The game opens on the select screen. Every card shows a live preview of the
fighter, their signature attack and SPD / PWR / VIT bars.

- **Player 1:** `A` / `D` to move the cursor, `F` to confirm.
- **Player 2 (versus):** `←` / `→` to move, `1` to confirm.
- **Enter** confirms immediately (in versus it readies both players).
- Clicking a card also selects it.

## Play

Open `index.html` in a browser, or run a local server (recommended):

```bash
python3 -m http.server 3000
# then open http://localhost:3000
```

### Controls

| Action | Player 1 | Player 2 / AI |
| --- | --- | --- |
| Move | `A` / `D` | `←` / `→` |
| Jump | `W` | `↑` |
| Crouch | `S` | `↓` |
| Block | `H` | `3` |
| Punch | `F` | `1` |
| Kick | `G` | `2` |
| Energy attack | `T` | `4` |
| Charge energy | `Y` | `5` |
| Shadow clone | `U` | `6` |
| Substitution | `I` | `7` |

Numpad 1/2/4/5/6/7 work the same as the number-row keys for Player 2.

## Attack heights and guarding

Every strike has a height, and your guard has to match it:

| Attack | Height | Effect |
| --- | --- | --- |
| Standing punch | Mid | Blockable standing or crouching |
| Standing kick | High | **Whiffs on a crouching opponent**, blocked standing |
| Crouch + punch / kick | Low | Hits through a standing guard; must be blocked crouching |
| Air punch / kick | Overhead | Hits crouching fighters; must be blocked standing |
| Kage's Earth Wave | Low | Low projectile, jump or crouch-block it |

**Crouch-block** (hold block + crouch) stops lows and mids but loses to
overheads. **Standing block** stops mids, highs and overheads but loses to low
sweeps. Blocked hits still chip 20% of the damage.

Every connected hit — guarded or clean — briefly freezes both fighters (impact
freeze, longer on a clean hit) and shoves them apart, with knockback sliding to
a stop. Fighters also can't stand inside each other.

Clean hits also shake the camera and flash the screen, both scaled to the damage
dealt, and bloom a bright burst of light at the point of contact. Guarded hits
get a shorter, cool-tinted version of the same feedback, and a knockout slams the
camera hardest.

## Sound

All audio is synthesized in the browser with the Web Audio API — there are no
sound files to download:

- **Hits** — a pitched thump plus a low noise smack, lower and louder on heavier strikes.
- **Guards** — a short, bright metallic tick with a high-passed snap.
- **Whiffs** — a soft air swish for strikes that miss or sail over a crouching opponent.
- **Knockouts** — a falling bass sweep with a long crash.

Browsers block audio until the player interacts, so the engine wakes on the first
key press or click. Every strike gets a small random pitch offset so repeat hits
don't sound identical.

- **Charge** fills the KI bar; the AI charges too when it has space.
- **Energy attack** costs the fighter's listed KI and fires their signature move.
- **Shadow clone** sends two clones at the opponent (cost varies by fighter).
- **Substitution** dashes back and grants brief invulnerability.
- Blocking cuts incoming damage to 20%.
- **RESTART** replays the current match with the same fighters (round 1).

## Hosting on GitHub Pages

1. Push this repository to GitHub.
2. In the repository open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select branch `main` and folder `/ (root)`, then **Save**.
5. GitHub publishes the game at `https://<user>.github.io/<repo>/` within a minute or two.

`.nojekyll` is included so GitHub Pages serves the files as-is.
