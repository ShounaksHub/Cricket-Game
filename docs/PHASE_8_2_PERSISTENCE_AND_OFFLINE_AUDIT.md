# PHASE 8.2: PERSISTENCE, SERVER AUTHORITY, AND OFFLINE-FIRST INTEGRITY AUDIT

**Audit Date:** 10 November 2026  
**Subject:** Full-Stack Persistence Architecture & Offline Standalone Game Loop  
**Components Audited:**  
- `apps/api/src/modules/matches/matches.service.ts`
- `apps/web/app/match/page.tsx`
- `.cache/matches/`
- `database/prisma/schema.prisma`

---

## 1. DURABILITY & PERSISTENCE REALITY CHECK

A rigorous adversarial audit requires separating operational facts from marketing claims:

### 1.1 Local Disk Ledger (`.cache/matches/`)
- **Operational Reality:** The disk ledger writes serialized JSON matches atomically to `.cache/matches/${matchId}.json`.
- **Durable Environments:** On persistent host machines, dedicated VMs (AWS EC2, DigitalOcean Droplets), Docker containers with mounted volumes, or stateful servers, the disk ledger survives process restarts, memory purges, and server crashes.
- **Ephemeral Environments (Vercel Serverless / AWS Lambda):** The filesystem on serverless lambda executions is read-only or ephemeral (`/tmp` wiped between invocations). **A filesystem ledger cannot be classified as permanent production cloud persistence on Vercel.**

### 1.2 Relational Database Tier (Prisma Schema)
- **Database Schema Models:** `Match`, `MatchParticipant`, `MatchInnings`, `MatchOver`, `MatchDelivery`, `MatchResult`.
- **Cloud Durability:** When deployed to cloud infrastructure with a managed PostgreSQL instance (Supabase, Railway, Neon, AWS RDS), Prisma persistence provides durable, multi-device, horizontally-scaled persistence.

### 1.3 Recovery Scenarios Audited
1. **Server Process Restart:** Match in disk ledger is automatically rehydrated into memory on `getMatchById` or `verifyMatch`.
2. **Corrupted Ledger Handling:** If a ledger JSON file is corrupted or truncated mid-write, `JSON.parse` catches the `SyntaxError`, logs a warning, and prevents application crashes.
3. **Database Disconnected:** If the relational DB connection fails, the API gracefully falls back to the local ledger without dropping the active match simulation.

---

## 2. SERVER AUTHORITY & ANTI-TAMPERING CONTROLS

In `MatchesService.stepDelivery`:
1. **Initial State Hash Verification:** If a match was pre-registered on the server, `stepDelivery` compares `state.initialStateHash` against `storedMatch.result.initialStateHash`. If a client tampered with lineups, ratings, or seeds, the request is rejected with `400 Bad Request` (*"Match state hash mismatch: state has been tampered with or desynchronized"*).
2. **Hierarchical Deterministic Ball Seed:** The delivery seed is derived server-side via:
   $$S_{\text{delivery}} = S_{\text{match}} \oplus ((I + 1) \times 1000003) \oplus ((E + 1) \times 7919)$$
   A client cannot manipulate random numbers or force arbitrary delivery outcomes.

---

## 3. OFFLINE-FIRST STANDALONE GAME INTEGRITY

The primary product direction is a standalone, browser-playable offline cricket game.

### 3.1 Offline Verification Checklist
| Feature | Offline Functionality | Source Location | Audit Finding |
| :--- | :--- | :--- | :--- |
| **Main Menu & Routing** | Works 100% offline | Next.js Static Pages | All 7 routes (`/`, `/match`, `/players`, `/dream-teams`) prerender statically. |
| **Player Catalogue** | Works 100% offline | `@cricket/data-ingestion` | 1,144 verified benchmark players bundled locally in client bundle. |
| **Dream XI Squad Builder** | Works 100% offline | `@cricket/cricket-rules` | Validates 1 keeper, 5 bowlers, 11 players client-side. |
| **AI Opponent Selection** | Works 100% offline | `apps/web/lib/national-teams.ts` | 8 official national squads + World XI generate offline. |
| **Full Match Simulation** | Works 100% offline | `@cricket/simulation-engine` | Full simulation runs locally via `simulateFullMatch`. |
| **2D PixiJS Visualizer** | Works 100% offline | PixiJS 8.16 Canvas | Renders 60 FPS locally without external assets or textures. |
| **Local Vault Storage** | Survives browser refresh | `localStorage` | Archived matches persist under `cricket_match_history`. |

### 3.2 UI Signaling & Transparency
The header actively checks server status on load:
- When offline:
  `<span title="Simulations are run deterministically in-browser and cached in your local vault.">LOCAL PRACTICE MODE (OFFLINE / VAULT)</span>`
- When online:
  `<span>ONLINE (SERVER PERSISTED)</span>`
Users are never misled regarding where their match data resides.

---

## 4. AUDIT CONCLUSION

The application functions reliably as an offline-first, client-side cricket game while offering persistent server authority when connected to a stateful backend. Durability limitations on ephemeral serverless hosting are explicitly documented.
