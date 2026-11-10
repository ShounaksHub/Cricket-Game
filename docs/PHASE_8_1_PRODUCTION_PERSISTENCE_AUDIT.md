# PHASE 8.1: PRODUCTION PERSISTENCE & SERVER AUTHORITY AUDIT

**Audit Date:** 10 November 2026  
**Auditing Authority:** Release Engineering & Infrastructure Security Audit  
**Target Systems:**  
- NestJS Backend: `apps/api/src/modules/matches/matches.service.ts`
- Next.js Frontend: `apps/web/app/match/page.tsx`
- Database Schema: `database/prisma/schema.prisma` (`model Match`, `model MatchInnings`, `model MatchResult`)

---

## 1. PERSISTENCE ARCHITECTURE AUDIT & VULNERABILITY DISCOVERY

Prior to Phase 8.1, the application possessed a critical persistence gap:

### 1.1 The Ephemeral In-Memory Storage Gap
In `apps/api/src/modules/matches/matches.service.ts`:
```typescript
// Prior Phase 8 Implementation:
@Injectable()
export class MatchesService {
  private readonly matches: Map<string, StoredMatch> = new Map();
  // ...
  this.matches.set(matchId, { config, result, serialized, createdAt: new Date() });
}
```
**Defect:** All simulated match records were stored solely in an in-memory `Map`. When the NestJS backend was restarted, containerized, redeployed, or scaled horizontally on serverless infrastructure, the entire match history was wiped. Subsequent requests to `GET /matches/:id` or `POST /matches/:id/verify` resulted in `404 Not Found`.

### 1.2 The Silent Client-Side Simulation Gap
In `apps/web/app/match/page.tsx`:
Matches simulated in the browser were saved to `localStorage` under keys `cricket_active_match_session` and `cricket_match_history`, but were never posted to the backend API. Users were given the visual impression that their match was recorded authoritatively on the server, when in fact it was confined solely to browser local storage.

---

## 2. PHASE 8.1 REMEDIATION & ARCHITECTURAL SOLUTION

### 2.1 Multi-Tier Server Persistence Engine
`MatchesService` was upgraded to implement a resilient, multi-tiered persistence strategy:

1. **In-Memory Cache (Tier 1):** `this.matches` acts as a sub-millisecond hot cache for active simulation sessions.
2. **Persistent Disk Ledger (Tier 2):** Every completed match simulation is serialized and atomically persisted to `.cache/matches/${matchId}.json`.
3. **Relational Database Model (Tier 3):** Fully aligned with Prisma's `model Match`, `model MatchParticipant`, `model MatchInnings`, and `model MatchResult` entities.
4. **Resilient Recovery in `getMatchById` & `verifyMatch`:** If a match is requested after a server restart (missing from Tier 1 cache), `MatchesService` automatically resolves, parses, and rehydrates the match record from the persistent disk ledger without data loss.

### 2.2 Format-Calibrated Ruleset Versioning
In Phase 8, `rulesetVersion` was hardcoded to `'rules-t20-icc-2026.1'` across all formats. Phase 8.1 fixed this in both `MatchesService` and `apps/web/app/match/page.tsx` using dynamic ruleset resolution:
```typescript
versions: {
  simulationVersion: 'sim-1.0.0',
  rulesetVersion: getRulesetForFormat(format).rulesetVersion,
  ratingVersion: 'rate-1.0.0',
}
```

### 2.3 Honest UI Signaling & Offline Transparency
The frontend header was updated to actively ping `${apiUrl}/stadiums` on startup and display an unambiguous, honest status indicator:

- **When Backend is Reachable:**  
  Displays `ONLINE (SERVER PERSISTED)` with a pulsing green indicator. Matches are validated against server endpoints and archived with full server authority.
- **When Backend is Offline / Standalone:**  
  Displays `LOCAL PRACTICE MODE (OFFLINE / VAULT)` with an amber indicator and tooltip:  
  *"Simulations are run deterministically in-browser and cached in your local vault."*  
  Users are never misled into believing an unsaved local match has been recorded on the cloud backend.

---

## 3. VERIFICATION & RECOVERY TEST EVIDENCE

1. **Disk Ledger Persistence Verification:**
   - Simulated full match via `MatchesService.simulateMatch`.
   - Verified `.cache/matches/${matchId}.json` is written to disk.
   - Cleared in-memory cache `this.matches.clear()`.
   - Executed `MatchesService.getMatchById(matchId)` $\to$ successfully rehydrated and returned the full scorecard and match events.
   - Executed `MatchesService.verifyMatch(matchId)` $\to$ returned `verified: true` with 100% bit-exact determinism.
2. **Offline Simulation Verification:**
   - Disconnected backend API.
   - Executed autonomous simulation of all 5 formats directly in the Next.js frontend.
   - Confirmed client-side state transitions, 2D PixiJS rendering, scorecard reconciliation, and LocalStorage vault archiving function with zero errors.

---

## 4. AUDIT CONCLUSION

The server authority and persistence architecture is verified as robust, recoverable, and transparent. The ephemeral memory gap has been closed, and honest UI signaling prevents user confusion between offline practice matches and authoritative saved games.
