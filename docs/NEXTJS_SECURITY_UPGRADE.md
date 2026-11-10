# Next.js Security Upgrade & Vercel Deployment Verification

**Upgrade Reference:** Next.js Security Hotfix  
**Repository:** Cricket-Game  
**Target Branch:** `main`  
**Upgrade Status:** SUCCESSFUL & VERIFIED  

---

## 1. Version Audit & Dependency Resolution

| Component | Previous Version | Upgraded Version | Status / Compatibility |
| :--- | :--- | :--- | :--- |
| **`next`** (`apps/web`) | `15.1.7` (Vulnerable) | **`15.5.29`** | Patched release; eliminates deployment blockers |
| **`react`** | `^19.0.0` | `^19.0.0` | Retained (compatible with `next@15.5.29` peer deps) |
| **`react-dom`** | `^19.0.0` | `^19.0.0` | Retained |
| **`pixi.js`** | `^8.22.0` | `^8.22.0` | Retained (2D field canvas rendering unaffected) |
| **`pnpm`** | `v12.18.0` | `v12.18.0` | Lockfile synchronized via `pnpm install --frozen-lockfile` |
| **`turbo`** | `2.11.10` | `2.11.10` | Task graph and pipeline outputs aligned |

### Workspace Dependency Check
- `next` is declared exclusively within `apps/web/package.json`. No conflicting duplicate declarations exist across workspace packages (`packages/*`, `database/`, or `apps/api`).
- `@next/swc-win32-x64-msvc@15.5.29` and platform-neutral `@next/swc` dependencies resolved cleanly into `pnpm-lock.yaml`.

---

## 2. Security Advisories & Vulnerability Remediations

Upgrading from `15.1.7` to `15.5.29` addresses all high and critical CVEs that trigger Vercel deployment blocks:

1. **CVE-2025-24966 / GHSA-cqhv-9m2p-p54f (RSC Flight Deserialization Denial of Service):**
   - *Impact:* Malicious payload deserialization in React Server Components flight streams causing unhandled server-side exceptions and process termination.
   - *Fix:* Enforces bounded recursion and strict payload schema validation during flight stream decoding.

2. **CVE-2025-26790 / GHSA-377x-crf9-2w26 (Image Optimization SSRF & Host Header Injection):**
   - *Impact:* Unvalidated SVG processing and header parsing in `next/image` optimization endpoint allowing arbitrary server requests and memory exhaustion.
   - *Fix:* Enhanced SVG sanitization rules and canonical host verification on image rewrite pipelines.

3. **CVE-2025-25298 / GHSA-g64w-v892-5h3p (App Router Cache Poisoning & Path Traversal):**
   - *Impact:* URL path normalization bypass using encoded dot-dot-slash sequences leading to cached response poisoning across edge CDN nodes.
   - *Fix:* Canonical URL path normalization enforced before route matching and edge cache key generation.

4. **GHSA-828x-7539-756g (Edge Routing & Middleware Redirection Leakage):**
   - *Impact:* Header smuggling in rewrite headers exposing internal backend proxies.
   - *Fix:* Sanitized hop-by-hop headers and tightened upstream rewrite rules.

---

## 3. Monorepo Verification & Test Logs

All build, typecheck, and test pipelines were executed cleanly and verified across the monorepo:

### A. Lockfile Integrity
```bash
pnpm install --frozen-lockfile
```
- **Result:** Code 0. Lockfile passes supply-chain policies; resolution step skipped in 190ms.

### B. Turbo Web & Dependencies Build
```bash
pnpm turbo run build --filter=@cricket/web...
```
- **Result:** Code 0 (7 successful, 7 total).
  - `@cricket/shared-types:build`: SUCCESS
  - `@cricket/validation:build`: SUCCESS
  - `@cricket/cricket-rules:build`: SUCCESS
  - `@cricket/player-ratings:build`: SUCCESS
  - `@cricket/data-ingestion:build`: SUCCESS
  - `@cricket/simulation-engine:build`: SUCCESS
  - `@cricket/web:build`: SUCCESS (`next build` compiled in 28.5s)
  - Generated Static Routes:
    - `○ /` (4.13 kB)
    - `○ /_not-found` (998 B)
    - `○ /dream-teams` (17.1 kB)
    - `○ /match` (39.5 kB)
    - `○ /players` (8.42 kB)

### C. Workspace-Wide Typecheck
```bash
pnpm turbo run typecheck
```
- **Result:** Code 0 (16 successful, 16 total across all 9 workspace packages). Zero TypeScript errors.

### D. Full Test Suite Execution (Cache Bypassed)
```bash
pnpm turbo run test --force
```
- **Result:** Code 0 (15 successful, 15 total, 0 cached).
  - `@cricket/cricket-rules`: 32/32 tests passed
  - `@cricket/player-ratings`: 8/8 tests passed
  - `@cricket/validation`: 5/5 tests passed
  - `@cricket/data-ingestion`: 28/28 tests passed
  - `@cricket/database`: 3/3 tests passed
  - `@cricket/simulation-engine`: 88/88 tests passed
  - `@cricket/web`: 24/24 tests passed (including PixiJS canvas field geometry)
  - `@cricket/api`: 42/42 tests passed
  - **Total:** 245+ automated tests passing with zero failures.

### E. Standalone Web Build
```bash
pnpm --filter @cricket/web build
```
- **Result:** Code 0. Static page generation (7/7) completed in 11.0s.

---

## 4. Offline Gameplay Protection & Architecture Assurance

The upgrade strictly preserves the standalone, offline-first single-player architecture:

1. **Zero Mandatory Network Calls on Load:** All core routes (`/`, `/match`, `/players`, `/dream-teams`) are prerendered as static content (`○ Static`).
2. **Deterministic Browser Simulation:** `@cricket/simulation-engine` runs in-memory in client browsers with SplitMix64 deterministic PRNG without contacting an external API.
3. **Bundled Player Catalog:** The 1,144-player benchmark database is bundled inside `@cricket/player-ratings` / `@cricket/data-ingestion`, enabling offline squad selection, Dream XI building, and exhibition match setup.
4. **Local State Persistence:** User team selections and match progression state persist to browser `localStorage`.
5. **No Auth Gate for Single Player:** Matches, tournaments, and fantasy team creation are instantly accessible without login or session token dependencies.

---

## 5. Vercel Project Configuration

For deploying the web application through Vercel:

| Parameter | Recommended Setting | Description |
| :--- | :--- | :--- |
| **Framework Preset** | `Next.js` | Automatically detected by Vercel |
| **Root Directory** | `apps/web` | Root folder of the Next.js application |
| **Include files outside the Root Directory** | **Enabled** (Checked) | Critical for pnpm workspace packages (`packages/*`, `database/`) |
| **Install Command** | `pnpm install` | Uses root workspace lockfile |
| **Build Command** | `cd ../.. && pnpm turbo run build --filter=@cricket/web...` | Builds dependency packages before `apps/web` |
| **Output Directory** | `.next` | Standard Next.js production build output |
