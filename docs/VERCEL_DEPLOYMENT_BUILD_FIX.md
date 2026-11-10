# Vercel Deployment Hotfix: Monorepo Package Resolution & Build Fix Report

**Document Version:** 1.0.0  
**Target Architecture:** Next.js 15 App Router Frontend (`apps/web`) + NestJS 11 Backend (`apps/api`) + Workspace Packages  
**Resolution Status:** VERIFIED — Clean production build passing across all 9 monorepo packages.

---

## 1. Executive Summary & Exact Root Cause

### The Primary Failure
Vercel deployment failed during `turbo run build` at commit `47fef76` with:
```
packages/data-ingestion/src/ingestion-pipeline.ts
error TS2307: Cannot find module '@cricket/player-ratings' or its corresponding type declarations.
```
Accompanied by warnings:
- `WARNING no output files found for task @cricket/player-ratings#build`
- `We could not find your Prisma schema in the default locations`

### Root Cause Analysis

The failure was not caused by a missing dependency in `package.json` (`@cricket/player-ratings` was already listed in `packages/data-ingestion/package.json`). Instead, it was caused by a combination of three root causes:

1. **Stale Committed `tsconfig.tsbuildinfo` Files:**
   - Every package in the monorepo had `tsconfig.tsbuildinfo` checked into Git, while `dist/` was properly gitignored.
   - On a clean checkout (such as Vercel CI), `dist/` does not exist on disk, but `tsconfig.tsbuildinfo` was checked out with recent timestamps.
   - When Turbo executed `tsc --build` for `@cricket/player-ratings`, TypeScript compared `tsconfig.tsbuildinfo` with the source files, concluded that all files were unchanged, and **skipped emitting `dist/`**.
   - Because `dist/index.d.ts` was not created, Turbo reported `no output files found for task @cricket/player-ratings#build`.
   - When `@cricket/data-ingestion` subsequently ran its build, TypeScript looked for `./dist/index.d.ts` in `@cricket/player-ratings`, found nothing, and threw `error TS2307: Cannot find module '@cricket/player-ratings'`.

2. **Hidden Syntax & Type Incompatibilities Masked by Cached Buildinfo:**
   - `packages/cricket-rules/src/validators.ts`: `validateFieldingRestrictions` was typed with `fielders: readonly { ... }` instead of an array type `fielders: readonly { ... }[]`. This failed TypeScript compilation with `error TS1354` and `error TS2339`.
   - `packages/simulation-engine/src/rulesets/t20-ruleset.ts`: The anonymous test match rule classes declared `override readonly followOnDeficitThreshold`, `newBallOverThreshold`, and `testScheduleConfig` with `override` when they were not declared on the base `T20Ruleset` class, throwing `error TS4113`.

3. **Prisma Generation Stage in CI:**
   - `database/package.json` used `"build": "tsc --build"` without invoking `prisma generate`.
   - On clean CI installs, `@prisma/client` runtime and types were ungenerated, causing downstream packages importing `@cricket/database` to fail.
   - Furthermore, Vercel's automated Prisma detection expected the schema in `./prisma/schema.prisma` instead of `database/prisma/schema.prisma`.

---

## 2. Dependency Graph: Before and After

### Package Dependency Hierarchy

```
                             apps/web
                          (Next.js 15)
                               │
            ┌──────────────────┼──────────────────┐
            ▼                  ▼                  ▼
  @cricket/simulation-engine  @cricket/validation  @cricket/data-ingestion
            │                                             │
            ├──────────────────┐                          │
            ▼                  ▼                          ▼
  @cricket/cricket-rules  @cricket/player-ratings ◄───────┘
            │                  │
            └─────────┬────────┘
                      ▼
            @cricket/shared-types
```

- `@cricket/player-ratings` depends only on `@cricket/shared-types`.
- `@cricket/data-ingestion` depends on `@cricket/shared-types`, `@cricket/cricket-rules`, and `@cricket/player-ratings`.
- Turbo's task graph (`dependsOn: ["^build"]`) correctly schedules:
  `shared-types#build` ➔ `player-ratings#build` ➔ `data-ingestion#build`.

---

## 3. Files Changed and Fixes Implemented

| File | Change Category | Description |
| :--- | :--- | :--- |
| `tsconfig.base.json` | TypeScript Config | Added `"tsBuildInfoFile": "./dist/tsconfig.tsbuildinfo"` so incremental build data is always co-located in `dist/` and cleaned when `dist/` is removed. |
| `packages/player-ratings/tsconfig.json` | TypeScript Config | Simplified to inherit from base config (`"module": "NodeNext"`), removing detached `"composite": true`. |
| `packages/data-ingestion/tsconfig.json` | TypeScript Config | Simplified to inherit from base config, ensuring consistent non-composite output path. |
| `.gitignore` | Git Tracking | Added `*.tsbuildinfo` and `*.tsbuildinfo*` to prevent build state from ever being committed to Git. |
| `*tsbuildinfo` (8 files) | Git Untracking | Untracked all checked-in `tsconfig.tsbuildinfo` files via `git rm --cached`. |
| `packages/cricket-rules/src/validators.ts` | Syntax Fix | Fixed `fielders: readonly { ... }[]` parameter array typing in `validateFieldingRestrictions`. |
| `packages/simulation-engine/src/rulesets/t20-ruleset.ts` | Type Fix | Declared `followOnDeficitThreshold?`, `newBallOverThreshold?`, and `testScheduleConfig?` on `T20Ruleset`. |
| `database/package.json` | Prisma Config | Added `"prisma": { "schema": "prisma/schema.prisma" }` and updated `"build": "prisma generate && tsc --build"`. |
| `package.json` (root) | Prisma Config | Added `"prisma": { "schema": "database/prisma/schema.prisma" }` to guide Vercel's schema detection. |
| `turbo.json` | Turbo Outputs | Updated `"test": { "outputs": [] }` to silence empty coverage warnings when running test suites. |
| `packages/data-ingestion/tests/ingestion.test.ts` | Regression Test | Added integration test verifying direct import and execution of rating functions from `@cricket/player-ratings`. |

---

## 4. Prisma Warning Investigation

### Finding:
Vercel reported:
```
We could not find your Prisma schema in the default locations (./prisma/schema.prisma, ./schema.prisma)
```
In this monorepo, the Prisma schema is located at `database/prisma/schema.prisma`.

### Resolution:
1. Root `package.json` now explicitly declares:
   ```json
   "prisma": {
     "schema": "database/prisma/schema.prisma"
   }
   ```
2. `database/package.json` now binds:
   ```json
   "prisma": {
     "schema": "prisma/schema.prisma"
   },
   "scripts": {
     "build": "prisma generate && tsc --build"
   }
   ```
3. Frontend note: `apps/web` does **not** import `@cricket/database` or `@prisma/client`. Database operations are isolated to `@cricket/api`. Thus, the frontend build does not depend on database network connectivity or migration execution.

---

## 5. Verification Commands & Actual Results

### Clean-Checkout Simulation
All `dist/` directories, `.turbo` caches, and `.next/` bundles were deleted prior to verification.

```bash
# 1. Clean install verification
pnpm install --frozen-lockfile
# Result: Lockfile up to date, verified in 166ms

# 2. Independent player-ratings build
pnpm --filter @cricket/player-ratings run build
# Result: Code 0, dist/index.d.ts generated

# 3. Independent data-ingestion build
pnpm --filter @cricket/data-ingestion run build
# Result: Code 0, dist/index.d.ts generated

# 4. Monorepo Turborepo build
pnpm turbo run build
# Result: 9/9 packages successful (0 cached, 1m24s)

# 5. Typecheck verification
pnpm turbo run typecheck
# Result: 16/16 tasks successful (Code 0)

# 6. Test suite execution
pnpm turbo run test
# Result: 15/15 tasks successful (Code 0)

# 7. Next.js production build
pnpm --filter @cricket/web build
# Result: Compiled successfully, 7/7 static routes generated
```

---

## 6. Vercel Build Configuration for Production

When configuring the project on Vercel:

| Parameter | Recommended Setting | Purpose |
| :--- | :--- | :--- |
| **Framework Preset** | `Next.js` | Native Vercel Next.js 15 detection |
| **Root Directory** | `apps/web` | Points to frontend application |
| **Include files outside Root Directory** | **Checked (Enabled)** | Allows resolution of workspace packages (`@cricket/*`) |
| **Build Command** | `cd ../.. && pnpm turbo run build --filter=@cricket/web...` | Builds dependency tree before Next.js |
| **Output Directory** | `.next` | Default Next.js production artifact directory |
| **Install Command** | `pnpm install` | Uses workspace lockfile |

---

## 7. Regression Protection

A dedicated test case in `packages/data-ingestion/tests/ingestion.test.ts` now validates:
```typescript
describe('Workspace Cross-Package Resolution: @cricket/player-ratings', () => {
  it('successfully imports and executes rating calculations from @cricket/player-ratings', async () => {
    const playerRatings = await import('@cricket/player-ratings');
    expect(playerRatings.calculateFormatRating).toBeDefined();
    expect(playerRatings.calculatePlayerAttributes).toBeDefined();
    expect(playerRatings.computeEraMetrics).toBeDefined();
    ...
  });
});
```
This guarantees that any future workspace configuration or export path regressions will be detected during CI before deployment.
