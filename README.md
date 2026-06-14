# Pranav Kaja — Portfolio

Live at **[pranavkaja.vercel.app](https://pranavkaja.vercel.app)**

Personal portfolio with a clinical/dossier visual language: grid-paper background,
crosshair cursor, declassified personnel files, and a mission-log project grid.
Built from scratch — vanilla HTML, CSS, and JavaScript. No frameworks, no templates,
no build step.

## Sections

- **About** — vitals strip plus two dossier cards that open into full "declassified" files
- **Experience** — ops-log timeline (UMass Amherst Dining, Acmegrade)
- **Projects** — nine mission cards with hover previews and detail overlays
- **Skills** — collapsible loadout grid with certifications
- **Interests** — separate page with a 3D rotating wheel and x-ray image reveal

## Easter eggs

- Press **WASD** on desktop: a drivable car spawns, scatters page text on impact,
  and chases checkpoints against the clock. Score 10+ to unlock matrix mode.
- On mobile, overscroll past the bottom of the page for a round of tic-tac-toe.

## Running locally

It's a static site — serve the folder with anything:

```
python -m http.server 8000
```

or open `index.html` directly. Deployed on Vercel with `cleanUrls`.

## Structure

| File | Purpose |
|---|---|
| `index.html` / `style.css` / `main.js` | main page, design system, overlays |
| `missions.js` | project detail overlay data + logic |
| `cargame.js` / `cargame.css` | the WASD car game |
| `tictactoe.js` | mobile tic-tac-toe easter egg |
| `interests.html` / `interests.js` | interests wheel page |
| `contact.html` | contact cards |
