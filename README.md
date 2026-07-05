# World of Squirrels & Seals

Two browser-based games hosted on GitHub Pages.

## Live site

- **Home:** https://brianskcheng.github.io/world-of-squirrels-and-seals/
- **World of Squirrels & Seals:** https://brianskcheng.github.io/world-of-squirrels-and-seals/squirrels-and-seals/
- **World of Smileys:** https://brianskcheng.github.io/world-of-squirrels-and-seals/smileys/

## Local preview

Open `index.html` in a browser, or serve the repo root with any static file server.

## Structure

- `index.html` — landing page
- `squirrels-and-seals/` — Squirrels & Seals game
- `smileys/` — World of Smileys game

Both apps are static HTML/JS with no build step. GitHub Pages serves directly from the `main` branch root.

## World of Smileys — sim layer

The smileys app keeps the original saga (`index.html`, `window.__saga`) and adds a `sim/` layer for player-facing modes and persistence.

**Main menu** (Menu button or Escape): Watch Story runs the full saga; when Chapter 3 war starts you can pick a champion or watch the auto-battle. Quick Fight, Duel 2P, and Auto Battle are standalone arena modes with champion select upfront.

**Smiley Studio**: customize west/east champions — face, size, outfits (hats, neckwear, face bits), battle loadout (special + throw), and stat upgrades (1 smile each).

**Challenges & smiles**: complete in-battle goals to unlock skills, throws, and accessories; earn smiles currency from wins and challenge rewards.

**Settings**: difficulty presets plus per-parameter balance sliders (orange = changed from default); applies to the next battle.

**Sound Studio**: per-channel mixer for music, SFX, and speech; settings persist in `localStorage` under `sim-audio-v1`.

**Battle snacks**: food pickups during player-controlled fights (enabled by the battle layer).

Progress, unlocks, and champion builds save in `localStorage` under `sim-meta-v1`.
