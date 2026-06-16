# Portfolio Site — Design & Update Brief
_pranavkaja.vercel.app · audited 2026-06-16 · ready to read, paste, and apply._

## TL;DR
The site is **strong** — a consistent "covert-ops dossier" theme, real interaction
design (crosshair cursor, hover-preview popovers, mission overlays, easter-egg
games), good a11y (skip link, focus rings, reduced-motion, AA contrast tokens),
and solid SEO (JSON-LD, canonical, sitemap). **It does not need a redesign.**

What it needs, in priority order:
- **P0 — Honesty:** several project numbers are inflated/wrong vs. the actual work
  (Heart "70K+ records", Churn "350K policyholders"). Fix before any recruiter reads it.
- **P0 — Dead feature:** the mission popup already supports a GitHub "Case file"
  button, but **no project has a `github_url`**. The 5 rebuilt repos exist — wire them.
- **P1 — Drift:** `/projects` is hand-coded and duplicates `data/projects.json`, so
  the two already disagree. Keep it static (SEO) but sync the copy.
- **P2 — Polish:** small CSS dedupe, card chips on `/projects`, detail-page repo links.

> **Data source (important):** the live homepage cards come from a **Supabase
> `projects` table** (`config.js`), *not* `data/projects.json` — that JSON is only
> the offline fallback. The `admin.html` panel edits the DB. **I applied all
> corrections + GitHub links directly to the live Supabase table**, so the homepage
> is already updated; the JSON fallback and the static `/projects` page were synced
> to match. I also found the **flagship MSN-01 was `published:false` (hidden)** and
> published it.

---

## 1. Design system (reference — keep all updates on-theme)

**Tokens** (`:root` in style.css)
| Token | Value | Use |
|------|-------|-----|
| `--bg` | `#ffffff` | page |
| `--text-main` | `#18181b` | ink, hard borders |
| `--text-muted` | `#6d6d75` | secondary text |
| `--accent` | `#ff4500` | fills, frames, dots (large only) |
| `--accent-text` | `#c43c00` | **small** orange text (AA on white/panels) |
| `--border` | `#e4e4e7` | hairlines, grid paper |
| `--panel-bg` | `#f4f4f5` | cards |

**Fonts:** Inter (body/headlines), Share Tech Mono (labels/IDs/UI), Space Mono
(panel headers), Archivo (vitals values).

**Signature motifs** (reuse these, don't invent new ones):
- Offset **accent frame** behind a box (`hero::after`, `.pp-expand::after`, `.msn-frame`).
- **Hard shadow** on hover (`box-shadow: 8px 8px 0 var(--text-main)`).
- Mono **`[ BRACKETED ]`** labels, `SUBJECT //`, `MSN-0X`, blink dots.
- **hover-swap** headings ("Origin File" → "01. ABOUT").
- Status badge dot (`.proj-status--deployed|in_progress|archived|classified`).

---

## 2. What's working — KEEP
- Hero, vitals strip, dossier cards + overlay, ops-log timeline + overlay.
- **Homepage project cards → hover popover (`.pp-expand`) → click overlay (`#msn-overlay`)** — this 3-tier reveal is the best part of the site. Keep the mechanic.
- Data-driven homepage grid (`missions.js` reads Supabase → falls back to `data/projects.json`).
- Mobile carousel, custom scrollbar, reduced-motion + touch fallbacks.
- Accessibility: focus traps, skip link, AA `--accent-text`, ARIA on cards/overlay.

---

## 3. The card → hover → popup system (detailed)

### 3a. Card (`.project-panel`, built in `missions.js → cardHTML`)
Shows: status badge, `MSN-0X`, title, tech, summary, hidden `.pp-expand`.
- **Good.** One tweak: add a **bottom-right arrow cue** is already there
  (`.project-arrow`) — keep. Consider a 1px top accent rule on hover to echo the timeline.

### 3b. Hover preview (`.pp-expand`, desktop ≥1025px, fine pointer)
A 620px floating sheet (hook + brief + chips) with an offset accent frame; siblings
fade to `opacity:.18` grayscale (`.grid-3.previewing`). Positioned per column
(left / centre `3n-1` / right `3n`).
- **Issue:** when a `github_url` exists, the hover sheet **doesn't surface it** — only
  the click-overlay does. Add a subtle repo glyph to the chip row so the link is
  discoverable on hover too (paste-ready in §6).
- **Issue:** bottom-row cards near the viewport edge can clip the downward sheet.
  Low priority; acceptable since it opens upward via `translate3d(0,8px→0)`.

### 3c. Popup / mission sheet (`#msn-overlay .msn-sheet`)
Full modal: header (id + stack), title, hook, brief, **R/M/O grid**, chips, and a
`#msn-d-github` slot rendered by `missions.js` when `m.github_url && m.show_github`.
- **This is the dead feature.** It's fully built (button markup, hover text swap,
  `.github-btn` styles) but unused because the data has no `github_url`. Wire it (§5).
- Optional: add a second button for a **live demo / case-file page**
  (`/projects/<slug>`) next to GitHub, so the overlay can deep-link to the long page.

---

## 4. Full projects page (`/projects/index.html`)

Currently a **hand-coded** 3-col grid of 9 `<a>` cards → each links to a rich detail
page (`/projects/<slug>`). The detail pages are good (Briefing → R/M/O → How it works
→ Engineering arc → Results).

**Issues**
1. **Duplication / drift** — copy is hard-coded, separate from `data/projects.json`;
   the two already disagree and both carry the inflated numbers.
2. **Thinner than the homepage** — no chips, no status badge, no hover preview.
3. **No repo links** on the detail pages.

**Recommendation** — keep it static (server-rendered HTML is better for SEO than a
JS grid), but:
- Sync all 9 cards' copy to the corrected numbers (§7).
- Add the **status badge + chip row** to each card (paste-ready in §6) so it matches
  the homepage richness while staying crawlable.
- On each detail page, add a **repo + back-to-all** button row under the hero chips.

---

## 5. GitHub linking plan (wire the dead feature)

`missions.js` already renders the button when both fields are present. Add to each
rebuilt project in `data/projects.json`:

```json
"github_url": "https://github.com/PranavKaja/<repo>",
"show_github": false
```

| Mission | Repo (push these — built locally) | github_url |
|--------|-----------------------------------|-----------|
| MSN-01 Fraud Triage | `fraud-triage` | github.com/PranavKaja/fraud-triage |
| MSN-03 Heart Disease | `heart-disease` | github.com/PranavKaja/heart-disease |
| MSN-04 Hospital Readmission | `hospital-readmission` | github.com/PranavKaja/hospital-readmission |
| MSN-05 Auto Insurance Churn | `insurance-churn` | github.com/PranavKaja/insurance-churn |
| MSN-08 Prime Air | `prime-air-coverage` | github.com/PranavKaja/prime-air-coverage |

> I've added these to `projects.json` with **`show_github: false`** so no button 404s
> before the repos exist. **After you `git push` each repo, flip `show_github` to `true`.**
> MSN-02/06/07/09 have no public code — leave them without a `github_url`.

---

## 6. Paste-ready snippets

**(a) Repo glyph in the hover chip row** — append inside `.pp-chips` when a repo exists
(add to `cardHTML` in missions.js):
```js
${p.github_url && p.show_github !== false ? `<span class="pp-chip-gh">↗ CODE</span>` : ''}
```
```css
.pp-chip-gh{font-family:'Share Tech Mono',monospace;font-size:.75rem;padding:5px 9px;
  border:1px solid var(--accent);color:var(--accent-text);background:var(--bg);}
```

**(b) Status badge + chips for the static `/projects` cards** — drop inside each `<a class="project-panel">`:
```html
<span class="proj-status proj-status--deployed">DEPLOYED</span>
<div class="proj-id">MSN-01</div><h3>Fraud Triage</h3>
<p class="tech">XGBoost / Gemini</p>
<p class="desc">0.978 AUC; a two-stage pipeline that catches what the model misses.</p>
<div class="pp-chips" style="margin-top:14px;">
  <span>0.978 AUC</span><span>84% Recall</span><span>284K Records</span>
</div>
```

**(c) Detail-page button row** — under the hero `.pp-chips` on each `/projects/<slug>.html`:
```html
<div class="hero-actions" style="margin-top:18px;">
  <a href="https://github.com/PranavKaja/fraud-triage" target="_blank" rel="noopener"
     class="btn btn-secondary interactive-element no-underline">VIEW CODE ↗</a>
  <a href="/projects" class="btn btn-secondary interactive-element no-underline">ALL MISSIONS</a>
</div>
```

**(d) CSS dedupe** — style.css has the *"small accent-orange text"* block and the
*"visible keyboard focus"* block **twice** (≈L2452–2474 and L2556–2578). Delete the
second copy. Harmless but untidy.

---

## 7. Honesty audit — claims vs. what I verified (rebuilds)

> ✅ = matches · ⚠️ = fix. Corrected copy is paste-ready.

| Mission | Site claim | Verified (rebuilt repo) | Action |
|--------|-----------|--------------------------|--------|
| **MSN-01 Fraud** | 0.978 AUC · 84/84 · 284K | AUC 0.977 · 84/84 · 284,807 | ✅ keep |
| **MSN-03 Heart** | **92% on 70K+ records** · SHAP | RF **93.4%**, ensemble **90.7%**, **1.3K rows**, 6 models + Flask | ⚠️ "70K+" is wrong → **"~1.3K-record clinical dataset"**; drop SHAP (used feature importances) |
| **MSN-04 Hospital** | 73% detection · 25K · SHAP | HGB AUC 0.66, tuned **recall 0.91**, 25,000 | ⚠️ update to **"91% recall (threshold-tuned), ROC-AUC 0.66"** |
| **MSN-05 Churn** | 18%→11% · **350K policyholders** | GB **AUC 0.70**, **92,849 rows**, 11.5% churn, SMOTE | ⚠️ "350K" is wrong → **"92,849 policyholders, ROC-AUC 0.70"** |
| **MSN-08 Prime Air** | hub-and-spoke · 12-mo | 3 hubs, 7.5-mi radius, **~1,650 pkgs/day**, 7.9% of MA, map | ⚠️ enrich with the concrete figures |
| MSN-02 Corp Analytics | 30% faster reviews | _not rebuilt (work project)_ | verify yourself |
| MSN-06/07 Supply sims | 34% / 54% margin | _not rebuilt (sim writeups)_ | verify yourself |
| MSN-09 Strategy Summit | 483% recovery | _not rebuilt (CAPSIM)_ | verify yourself |

**Why this matters:** the moment a GitHub link sits next to "70K+ records" but the
repo README says 1.3K rows, the whole site loses credibility. Site copy must match
the linked repos. I've applied the MSN-01/03/04/05/08 corrections to
`data/projects.json` already (see §9); the static `/projects` cards + detail pages
still need the same edits (snippets in §6b, table above).

---

## 8. Smaller findings
- **Heart detail page** also claims "70,000+ records" and a Flask app — reconcile with §7.
- **`og-card.png`** referenced in meta — confirm it exists in `/images/` (others are `og-*.png` in root).
- **Resume** is `Resume_Base.pdf` at root — make sure it's the current version.
- LinkedIn/GitHub in JSON-LD `sameAs` are good; consider a visible footer link row too.

---

## 9. Quick-apply checklist
1. ✅ **Done (LIVE):** updated the **Supabase `projects` table** — corrected
   MSN-03/04/05/08 copy, wired `github_url` (gated `show_github=false`) on the 5
   rebuilt projects, and **published MSN-01** (it was hidden). Homepage reflects it now.
2. ✅ **Done:** synced `data/projects.json` (fallback) + the static `/projects` cards.
3. ⏳ **You:** `git push` the 5 repos to `github.com/PranavKaja/<repo>` (names in §5).
4. ⏳ **You:** set `show_github = true` for those 5 — via `admin.html`, or one SQL:
   `update projects set show_github=true where github_url is not null;` — so the
   "Case file / GitHub" button appears in the mission popup.
5. ⏳ **You (optional):** §6b chips on `/projects`, §6c detail-page repo buttons,
   §6d CSS dedupe, reconcile the Heart detail page "70K+ records" text (§8).
6. ✅ Supabase change is already live; the static-file edits deploy on your next push.
