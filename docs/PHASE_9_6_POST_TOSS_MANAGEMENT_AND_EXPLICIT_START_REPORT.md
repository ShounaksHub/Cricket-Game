# PHASE 9.6: MANDATORY POST-TOSS TEAM MANAGEMENT, OPENING BOWLER & FIELD SETUP, AND EXPLICIT SIMULATION START REPORT

**Project:** Cricket Dream XI  
**Repository:** `ShounaksHub/Cricket-Game`  
**Phase:** 9.6  
**Status:** COMPLETE & VERIFIED  

---

## 1. Root Cause of Previous Failure

In Phase 9.4, pre-innings management was designed around modal popups (`PreInningsManagementModal.tsx`), but the coin toss ceremony in `apps/web/app/match/page.tsx` contained a button labelled `COMMENCE MATCH SIMULATION` that immediately called `handleStartMatch()`. This simultaneously created the simulation result, set `isPlaying = true`, and directly transitioned `phase` from `'TOSS'` to `'LIVE'`, bypassing user opening bowler selection, pre-match field configuration, and batting order verification.

---

## 2. Updated Match Lifecycle

The lifecycle in `apps/web/app/match/page.tsx` has been updated to:

$$\text{SETUP} \longrightarrow \text{TOSS} \longrightarrow \text{POST\_TOSS\_MANAGEMENT} \longrightarrow \text{LIVE} \longrightarrow \text{COMPLETED}$$

1. **Stage A (Toss):** The toss is conducted, the winning captain selects BAT or BOWL, and the button `CONFIRM TOSS & PROCEED TO MANAGEMENT →` advances to `POST_TOSS_MANAGEMENT`. Under no circumstances is the first delivery initialized or advanced.
2. **Stage B (Post-Toss Management Screen):** A full dedicated UI view displaying match details, toss winner/decision, batting and bowling teams, and specific team controls.
3. **Stage C (Batting First Management):** When the user-controlled team bats first, the screen presents the opening batting pair (#1 Striker and #2 Non-Striker) with portraits, roles, and ratings, plus reordering controls for remaining slots (#3 to #11) and an "Auto Select" option.
4. **Stage D (Opening Bowler Selection):** When the user-controlled team bowls first, the screen immediately displays eligible frontline bowlers from the squad, format quota limits, ratings, and AI recommendation, with manual picker and "Auto Select" options.
5. **Stage E (Opening Field Placement):** When bowling first, `InteractiveFieldEditor` is rendered on screen with drag-and-drop repositioning and presets (`BALANCED_RING`, `ATTACKING_CLOSE_CATCHERS`, `DEATH_BOUNDARY_DEFENSE`, `SPIN_CHOKE`, `CUSTOM`), with real-time validation against format Powerplay restrictions (max fielders outside the 30-yard circle) and MCC Law 28.4 (max 5 leg-side fielders, max 2 behind popping crease).
6. **Stage F (Mandatory START SIMULATION):** A prominent `START SIMULATION` button remains disabled if field or lineup configurations are invalid. Only upon clicking this button is the match configuration committed and transitioned to `LIVE`.
7. **Hard Invariant:** `stepToNextDelivery()` strictly asserts `if (phase !== 'LIVE') return;`, guaranteeing zero deliveries can execute prior to user confirmation.

---

## 3. Persistence and Pre-Match Recovery

- Added `cricket_active_pre_match` in `localStorage` storing format, stadium, pitch, weather, toss result, opening bowler, user batting lineup, and custom fielders.
- If the browser refreshes during `POST_TOSS_MANAGEMENT`, the page restores all user selections in `POST_TOSS_MANAGEMENT` without commencing simulation.
- Once `START SIMULATION` is clicked, `cricket_active_pre_match` is cleared and the standard active match session tracking takes over.

---

## 4. Verification & Test Results

### 4.1 Dedicated Phase 9.6 Regression Suite
`apps/web/test/phase-9-6-post-toss-management.spec.ts`:
- `✓ initializes in POST_TOSS_MANAGEMENT after toss decision and enforces delivery count 0`
- `✓ stepToNextDelivery strictly rejects execution if phase is not LIVE`
- `✓ reorders the batting lineup correctly and preserves 11 unique players`
- `✓ correctly assigns nominated user opening bowler as Innings 1 strike bowler`
- `✓ enforces format-specific over quotas (T10: 2, T20: 4, ODI: 10, Test: 9999)`
- `✓ validates MCC Law 28.4 and Powerplay restrictions`
- `✓ rejects illegal field with >5 leg-side fielders`
- `✓ executes first delivery only after START SIMULATION confirms and enters LIVE`
- `✓ works across all 5 cricket formats (T10, T20, ODI, Test Red Ball, Test Pink Ball)`

### 4.2 Workspace Test & Build Integrity
- **Full Turbo Test Suite:** 15/15 successful packages, 286/286 tests passed.
- **Web Package Tests:** 14/14 test files passed, 99/99 tests passed.
- **TypeScript Typecheck:** `pnpm --filter=@cricket/web typecheck` passed with 0 errors.
- **Production Build:** `next build` compiled cleanly into optimized static assets.
