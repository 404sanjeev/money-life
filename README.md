# Money Life

A financial-planning life simulator for India. Live one year per turn from your first salary to 85 — habits, big decisions, surprises — and see whether your money outlives you. A ghost plays a textbook plan with your exact same luck.

**Play:** open `index.html` in any browser (no build, no dependencies).

## Files
- `index.html` — the whole game (engine, cards, UI). Also published as `money-life.html`.
- `test.js` — balance and regression harness. `node test.js` plays ~200 lives across personas and fails if anything throws or the grade spread drifts. Run it after any change.

## Hosting on GitHub Pages
1. Create a repository on github.com (e.g. `money-life`), then in this folder:
   ```
   git remote add origin https://github.com/<you>/money-life.git
   git push -u origin main
   ```
2. On GitHub: **Settings → Pages → Source: Deploy from a branch → `main` / `/ (root)`**. The game will be live at `https://<you>.github.io/money-life/` within a minute.
