# Cricket Dream XI: AI-Slop & Robotic Copy Elimination Report

**Audit Target:** All user-facing screens (`apps/web/app/page.tsx`, `apps/web/app/match/page.tsx`, `apps/web/app/dream-teams/page.tsx`, `apps/web/app/players/page.tsx`, `apps/web/app/my-cricket/page.tsx`, components, modals, and headers).  
**Objective:** Eradicate generic AI-generated buzzwords, cyber/sci-fi terms, repetitive slogans, and awkward double slashes (`//`).

---

## 1. Eliminated Copy & Replacements Summary

| Context | Original Robotic / AI-Slop Text | Authentic Cricket Editorial Replacement | Screen / File |
|---|---|---|---|
| Header & Shell | `OFFLINE ENGINE v2.4` chip | Clean cricket status / rules trigger | `StitchHeader.tsx` |
| Match Arena | `STEP 02 // SQUAD & RIVALRY` | `STEP 2: SQUADS & TEAMS` | `match/page.tsx` |
| Breadcrumbs | `PAVILION / MATCH ARENA // LIVE • T20` | `PAVILION / MATCH ARENA • LIVE • T20` | `match/page.tsx` |
| Main Controls | `MATCH ENGINE COCKPIT (ZONE B & ZONE C)` | `MATCH SIMULATION VIEW` | `match/page.tsx` |
| Striker HUD | `STRIKER ON PITCH • FORM 96` | `STRIKER • [Dynamic SR]% S/R` | `match/page.tsx` |
| Striker Stance | Hardcoded `RHB • ANCHOR / ACCEL` | Dynamic `[LHB/RHB] • [ROLE]` | `match/page.tsx` |
| Striker Gauge | `TIMING ZONE: LOCKED IN (94%)` | `BOUNDARY SCORING: [% IN BOUNDARIES]` | `match/page.tsx` |
| Non-Striker | `RUNNING FIT 98%` | Dynamic `[LHB/RHB] • NON-STRIKER` | `match/page.tsx` |
| Bowler HUD | Hardcoded `FAST SEAM • 144 KM/H` | Dynamic `[STYLE] • [REAL SPEED] KM/H` | `match/page.tsx` |
| Bowler Controls | `YOUR BOWLING MANAGEMENT COCKPIT` | `BOWLING MANAGEMENT & TACTICS` | `match/page.tsx` |
| Home Cover | `DIRECT ACCESS TILES • 03 NODES` | `QUICK ACTIONS` | `page.tsx` |
| Home Hero | `PAVILION ACCESS UNLOCKED // HYDERABAD COLOSSEUM` | `PAVILION MATCH HUB • HYDERABAD` | `page.tsx` |
| Telemetry Copy | `Matches played will be archived with full telemetry` | `Matches played are archived with ball-by-ball scorecards` | `page.tsx` |
| Dream Teams | `TACTICAL ROSTER & TELEMETRY DECK` | `TACTICAL SQUAD & TEAM BALANCE` | `dream-teams/page.tsx` |
| Vault History | `LOAD SEED` | `REPLAY MATCH` | `match/page.tsx` |
| Test Scoreboard | `10.1 / 9999 OV` and `PROJECTED 16698` | `10.1 OV` and `PROJECTED —` | `match/page.tsx` |
| Bowling Dropdown | Raw `(4/999 ov - ACTIVE)` | Categorized Frontline Pace / Spin / All-Rounders with O-M-R-W | `match/page.tsx` |

---

## 2. Visual Slop & Effect Reductions

1. **Neon Glow Orbs:** Removed high-radius ambient blur layers (`w-[1200px] h-[550px] blur-[140px] bg-primary/15`) in `apps/web/app/page.tsx`. Replaced with subtle editorial canvas shading and clean section boundaries.
2. **Double Slashes (`//`):** Removed all artificial programming comments rendered as text inside section headers.
3. **Cards-Inside-Cards Nesting:** Simplified match controls from quadruple-nested boxes into a clean 2-column editorial grid.
4. **Authentic Data Sources:** Replaced static fake percentages ("Fit 98%", "Form 96%") with live computed match statistics (e.g., boundary proportions, strike rate, spell economy).

