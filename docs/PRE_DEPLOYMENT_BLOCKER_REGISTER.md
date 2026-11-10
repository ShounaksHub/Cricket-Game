# PRE-DEPLOYMENT BLOCKER REGISTER (P0 / P1 / P2 / P3)

**Document Date:** 10 November 2026  
**Auditor:** Release Engineering & Pre-Deployment Review Board  
**Target Deployment Platforms:** Vercel (Frontend Next.js) + Railway/Render (Backend NestJS + Database)  

---

## 1. BLOCKER CLASSIFICATION SCHEMA

- **P0 (Critical Blocker):** Application cannot be deployed. Causes fatal crashes, data corruption, or blocks core gameplay loops.
- **P1 (High Blocker):** Significant production gap, deployment risk, or missing production environment configuration required for public release.
- **P2 (Medium Non-Blocker):** Enhancements and features targeted for immediate post-deployment milestones (e.g. Phase 9 multiplayer).
- **P3 (Low Non-Blocker):** Cosmetic, visual, or future roadmap items (e.g. Phase 11 3D rendering).

---

## 2. BLOCKER REGISTER & RESOLUTION STATUS

| ID | Priority | Category | Description | Status in Phase 8 | Resolution Details |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BLK-01** | **P0** | Engine | Innings transition hardcoded to T20; T10, ODI, and Test matches could not transition from Innings 1 to Innings 2. | **RESOLVED** | Implemented universal multi-format state transition machine in `delivery-transition.ts`. |
| **BLK-02** | **P0** | UI / UX | Format selection buttons in `apps/web/app/match/page.tsx` omitted `TEST_RED_BALL` and `TEST_PINK_BALL`. | **RESOLVED** | Expanded format selector to all 5 formats with dedicated buttons and labels. |
| **BLK-03** | **P0** | UI / UX | Live match header hardcoded over limits to `/ 20 ov` and projected scores to `* 20`. | **RESOLVED** | Made live scoreboard format-aware: 10 ov (T10), 20 ov (T20), 50 ov (ODI), Day/Session/Lead (Test). |
| **BLK-04** | **P1** | Deployment | Ephemeral filesystem on Vercel/Railway causes SQLite database state to reset on redeployments/cold starts. | **MITIGATED** | `docs/VERCEL_DEPLOYMENT_FEASIBILITY_AND_SETUP.md` provides detailed PostgreSQL/Supabase configuration for persistent cloud production. Single-player local simulation works 100% in-memory/standalone without external DB. |
| **BLK-05** | **P1** | Security | Default CORS origins allow all local domains; production domains need explicit whitelist in backend `main.ts`. | **MITIGATED** | Configured `ALLOWED_ORIGINS` environment variable support in NestJS backend. |
| **BLK-06** | **P2** | Feature | Online multiplayer matchmaking and live spectator lobbies. | **SCHEDULED** | Explicitly scoped as Phase 9 milestone in strategic product roadmap. |
| **BLK-07** | **P2** | Auth | Dedicated cloud authentication provider (OAuth/JWT) for persistent multi-device user profiles. | **SCHEDULED** | Slated for Phase 9 multiplayer authentication. |
| **BLK-08** | **P3** | Visuals | 3D stadium models, photorealistic grass shaders, and crowd audio. | **SCHEDULED** | Explicitly scoped as Phase 11 milestone; top-down PixiJS 2D canvas is primary broadcast engine. |

---

## 3. PRE-DEPLOYMENT BLOCKER SUMMARY

- **Active P0 Blockers:** **0** (All P0 items resolved in Phase 8).
- **Active P1 Blockers:** **0** (All P1 operational items mitigated and documented).
- **P2 / P3 Non-Blockers:** Deferred to Phases 9–11 per project roadmap.

**Pre-Deployment Blocker Verdict: ZERO P0/P1 BLOCKERS REMAINING**.
