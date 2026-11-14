# Cricket Dream XI: Editorial Minimalist Design System

**Specification Version:** 1.0.0  
**Design Philosophy:** Publication-Grade Cricket Management & Editorial Minimalism  
**Target Atmosphere:** Authentic, timeless cricket journal meets sophisticated, high-performance sports analytics simulator.

---

## 1. Core Principles

1. **Restraint over Clutter:** Every container, border, card, and text label must serve a direct gameplay or informational purpose. Zero decorative neon gradients, zero blur orbs, zero artificial telemetry buzzwords.
2. **Authentic Cricket Nomenclature:** Replace all sci-fi, cybernetic, and gaming jargon with genuine cricket terminology (e.g., *Stance*, *Corridor of Uncertainty*, *Pace Off*, *Spell Figures*, *MCC Law Compliance*).
3. **Typographic Hierarchy as Architecture:** Clean proportions guide the user's attention. Headlines use Manrope with refined letter spacing; body copy uses Inter for legibility; scores, overs, run rates, and figures strictly use monospace tabular numerals.
4. **Hairline Precision:** Thin, 1px borders (`#303a31`) define boundaries without visual heaviness.
5. **Purposeful Color:** Deep pitch charcoal backgrounds (`#101410`) provide high contrast; restrained grass greens (`#78dc77`) and warm gold/olive tones (`#a9d55f`) are reserved strictly for active game state, live deliveries, and successful events.

---

## 2. Color Palette & Token Architecture

All colors are defined as CSS custom properties in `apps/web/app/globals.css` and mapped to Tailwind CSS v4 `@theme`.

### Backgrounds & Surfaces
- `var(--color-surface)`: `#101410` (Primary deep charcoal turf canvas)
- `var(--color-surface-card)`: `#181f19` (Elevated editorial surface for scorecards and lineups)
- `var(--color-surface-elevated)`: `#202920` (Secondary elevation for active states and controls)
- `var(--color-surface-recessed)`: `#0c0f0c` (Recessed well for statistics, tables, and pitch visualizer)

### Hairlines & Borders
- `var(--color-border-hairline)`: `#303a31` (1px subtle separation boundary)
- `var(--color-border-focus)`: `#435144` (Interactive focus and selected state outline)

### Cricket Typography & Ink
- `var(--color-text-chalk)`: `#f4f5f0` (High-contrast chalk white for headings, batter names, and total runs)
- `var(--color-text-slate)`: `#a2aaa1` (Balanced grey for labels, descriptions, and non-active metadata)
- `var(--color-text-subdued)`: `#6b756c` (Muted ink for secondary metrics and unit labels)

### Signal Accents
- `var(--color-primary)`: `#78dc77` (Grass green — live action, active striker, winning runs)
- `var(--color-secondary)`: `#a9d55f` (Pitch olive — run rates, partnership metrics, secondary actions)
- `var(--color-tertiary)`: `#e9c349` (Trophy gold — captain insignia, targets, milestone badges)
- `var(--color-wicket-red)`: `#c92a2a` (Out / Wicket — dismissals, falling wickets, loss margins)
- `var(--color-telemetry-blue)`: `#38bdf8` (Pace / Sky blue — bowling figures, weather, wind)
- `var(--color-warning-amber)`: `#f59e0b` (Required run rate alert, pressure situations)

---

## 3. Typography Scale & Guidelines

| Token | Family | Weight | Size / Line-height | Usage |
|---|---|---|---|---|
| `font-display-lg` | Manrope | 800 | 48px / 56px | Hero editorial mastheads |
| `font-headline-lg` | Manrope | 700 | 28px / 36px | Major section titles |
| `font-headline-md` | Manrope | 600 | 20px / 28px | Card headings, team names |
| `font-body-md` | Inter | 400 / 500 | 14px / 20px | Commentary, player descriptions |
| `font-body-sm` | Inter | 400 | 12px / 16px | Field notes, small labels |
| `font-label-caps` | Inter | 600 / 700 | 10px / 11px | All-caps cricket tags (OVERS, S/R, ECON) |
| `font-scoreboard-xl` | Tabular Mono | 800 | 36px / 40px | Live team runs & wickets (`142/3`) |
| `font-scoreboard-md` | Tabular Mono | 700 | 18px / 22px | Player scores (`48*`), overs (`16.2`) |

---

## 4. Component Patterns

### A. Scorecard Banner
- Clear distinction between team batting and team bowling.
- Overs formatted with clear units: `16.2 / 20 OV` for limited overs; `10.1 OV` for Test matches.
- Wicket indicator uses `--color-wicket-red` with high-contrast text.

### B. Striker & Bowler Cards
- Eliminates fake progress meters ("TIMING ZONE 94%").
- Dynamic batter stance (`LHB` / `RHB`) and primary role.
- Real scoring profile (boundary percentage and strike rate).
- Dynamic bowler delivery speed and genuine style (Fast, Fast-Medium, Off-Spin, Leg-Spin).

### C. Bowling Management Suite
- Categorized optgroups: **Frontline Pace Bowlers**, **Frontline Spin Bowlers**, **All-Rounders**, **Part-Time Bowlers**.
- Spell figures formatted as `Overs — Maidens — Runs — Wickets (Economy)`.
- Quick Select Strike Bowler buttons for rapid single-click captaincy nominations.
- MCC Law 21.7 compliance indicator clearly disabling consecutive over selections.

