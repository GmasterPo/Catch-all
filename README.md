# NINJA KOMBAT — Arcade Fighting Championship

A self-contained 2D arcade fighting game in a single `index.html`. Two players fight
on one keyboard with punches, kicks, blocks, jumps, energy attacks, shadow clones
and substitution teleports. All art, animation and particles are drawn procedurally
on a canvas, so there are no external sprites, fonts or CDNs to load.

## Play

Open `index.html` in a browser, or run a local server (recommended):

```bash
python3 -m http.server 3000
# then open http://localhost:3000
```

### Controls

| Action | Player 1 | Player 2 |
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

- **Charge** (`Y` / `5`) fills the KI bar.
- **Energy attack** costs 25 KI and fires a projectile.
- **Shadow clone** costs 35 KI and sends two clones at the opponent.
- **Substitution** costs 20 KI, dashes back and grants brief invulnerability.
- Blocking cuts incoming damage to 20%.
- The round ends on a knockout or when the 99-second timer expires. After the
  result screen the next round starts automatically.
- **RESTART MATCH** resets both fighters, health, energy and the timer.

## Hosting on GitHub Pages

1. Push this repository to GitHub (already done if you are reading this from the repo).
2. In the repository open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select branch `main` and folder `/ (root)`, then **Save**.
5. GitHub publishes the game at `https://<user>.github.io/<repo>/` within a minute or two.

`.nojekyll` is included so GitHub Pages serves the files as-is.
