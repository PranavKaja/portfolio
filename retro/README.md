# Retro Portfolio (PranavOS 95)

The portfolio rebuilt as a **Windows 95 desktop**, served at
**pranavkaja.com/retro** and reached from the "PRANAV KAJA" logo on the
main site (desktop only). This folder is part of the main `portfolio` repo and
deploys with it, no separate repo or build step.

## Files

| Path | What it does |
|------|--------------|
| `index.html` | Page shell: boot screen, splash, desktop, taskbar, start menu |
| `css/win95.css` | The Windows 95 look: windows, bevels, taskbar, boot, assistant |
| `js/data.js` | All portfolio content, inlined (projects, skills, certs, interests…) |
| `js/wm.js` | Window manager: open / drag / resize / minimize / focus / close |
| `js/apps.js` | The content of each app window (About, Projects, Skills, Resume…) |
| `js/desktop.js` | Boot sequence, desktop icons, Start menu, clock, sound, shutdown |
| `js/assistant.js` | Pip, the desktop helper (type `help` to summon) |
| `assets/` | Images, resume PDF, favicons |

## Flow

BIOS POST → PranavOS splash → desktop. Draggable windows, a Start menu, live clock,
a working Minesweeper, and Pip (type `help`). Phones are sent to the standard
mobile site. Dev shortcut: append `?desk` to skip the boot.

## Editing

This is the single source of truth, edit these files directly. Content mirrors the
main site; if a project changes, update `../data/*.json` and re-sync the inlined
`js/data.js`.
