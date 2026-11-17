# NINJA KOMBAT — Arcade Fighting Championship

A self-contained 2D arcade fighting game in a single `index.html`. Fight a
five-opponent arcade ladder against an AI, or take on a friend on one keyboard.
Matches are best of three rounds. All art, animation and particles are drawn
procedurally on a canvas, so there are no external sprites, fonts or CDNs to load.

## Modes

- **ARCADE** — single player. Beat five opponents in a row; each one reacts
  faster, blocks more and spends energy more often than the last. Win a match to
  advance, lose and the same opponent waits for a retry. Beat the fifth fighter
  to become champion.
- **2P VERSUS** — two players on one keyboard.

Matches are **best of three rounds**: the first fighter to win two rounds takes
the match. Rounds end on a knockout or when the 99-second timer expires (the
fighter with more health wins); a draw replays the round. Round wins are shown
as the two pips beside each name. After a match ends, press **Enter** (or click
the arena) to advance.

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
| Block | `S` | `↓` |
| Punch | `F` | `1` |
| Kick | `G` | `2` |
| Energy attack | `T` | `4` |
| Charge energy | `Y` | `5` |
| Shadow clone | `U` | `6` |
| Substitution | `I` | `7` |

Numpad 1/2/4/5/6/7 work the same as the number-row keys for Player 2.

- **Charge** fills the KI bar; the AI charges too when it has space.
- **Energy attack** costs 25 KI and fires a projectile.
- **Shadow clone** costs 35 KI and sends two clones at the opponent.
- **Substitution** costs 20 KI, dashes back and grants brief invulnerability.
- Blocking cuts incoming damage to 20%.
- **RESTART** resets the current match (same opponent, round 1).

## Hosting on GitHub Pages

1. Push this repository to GitHub.
2. In the repository open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select branch `main` and folder `/ (root)`, then **Save**.
5. GitHub publishes the game at `https://<user>.github.io/<repo>/` within a minute or two.

`.nojekyll` is included so GitHub Pages serves the files as-is.
