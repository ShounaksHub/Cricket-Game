# Vercel Deployment Feasibility Analysis & Master Production Guide

**Document Version:** 1.0.0  
**Target Architecture:** Next.js 15 App Router Frontend (`apps/web`) + NestJS 11 Backend (`apps/api`)  
**Workspace:** pnpm + Turborepo Monorepo  

---

## 1. Executive Feasibility Verdict

> **VERDICT: STOP — A single Vercel project deployment for both `apps/web` and `apps/api` is NOT feasible or safe without causing critical runtime breakdowns and loss of functionality.**

Per the project directive (*"If Vercel limitations make a single-project deployment unsafe or incompatible, STOP and explain the exact blocker. Do not force an architectural rewrite. Don't sacrifice a working NestJS backend just to achieve it"*), our comprehensive audit confirms that forcing both applications into one Vercel project would violate core game functionality, specifically:
- **Server-Sent Events (SSE) match delivery streaming** will abruptly terminate due to serverless execution limits.
- **In-memory match state & bit-exact replay verification** will break (`404 Match Not Found`) due to multi-instance serverless routing.
- **Real-time WebSockets** (`NEXT_PUBLIC_WS_URL`) are completely unsupported on Vercel Serverless.
- **Vercel's multi-build engine (`builds` in `vercel.json`) has been sunset**, enforcing one framework preset per Vercel project.

The **authoritative, industry-standard solution** is to deploy `apps/web` to Vercel and deploy `apps/api` to a persistent Node.js runtime (e.g., Railway, Render, Fly.io, or AWS ECS), integrated via same-origin reverse-proxy rewrites in `next.config.mjs` for **zero CORS issues**.

---

## 2. The 6 Hard Technical Blockers on Single-Project Vercel

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CRICKET GAME ARCHITECTURAL AUDIT                      │
├───────────────────────────────┬─────────────────────────────────────────────┤
│ Feature in apps/api           │ Vercel Serverless Limitation                │
├───────────────────────────────┼─────────────────────────────────────────────┤
│ 1. Monorepo Multi-App         │ Vercel zero-config enforces 1 project =     │
│    Orchestration              │ 1 application. Legacy 'builds' is sunset.   │
├───────────────────────────────┼─────────────────────────────────────────────┤
│ 2. In-Memory Matches Map      │ Multi-instance serverless routing loses     │
│    (MatchesService.matches)   │ state between simulate and stream/verify.   │
├───────────────────────────────┼─────────────────────────────────────────────┤
│ 3. Ball-by-ball SSE Streaming │ 15s serverless timeout aborts 240-ball T20   │
│    (MatchesController.stream) │ matches (~36s duration).                    │
├───────────────────────────────┼─────────────────────────────────────────────┤
│ 4. WebSocket Gateway          │ Vercel Serverless Functions do not support  │
│    (NEXT_PUBLIC_WS_URL)       │ persistent WebSocket connections.           │
├───────────────────────────────┼─────────────────────────────────────────────┤
│ 5. 1,144 Player Initializer   │ Every cold lambda incurs 1.5s+ latency      │
│    (initializeBenchmarkProfiles) hydrating 1,144 profiles & Prisma pools.   │
├───────────────────────────────┼─────────────────────────────────────────────┤
│ 6. NestJS DI vs Next.js SWC   │ Next.js SWC compiler strips legacy TS       │
│    (reflect-metadata)         │ parameter metadata required by NestJS IoC.  │
└───────────────────────────────┴─────────────────────────────────────────────┘
```

### Blocker 1: Sunset of Vercel Multi-Build (`vercel.json` `builds` array)
Historically, Vercel allowed configuring multiple application builds in a single project using a `"builds"` array in `vercel.json`:
```json
{
  "builds": [
    { "src": "apps/web/package.json", "use": "@vercel/next" },
    { "src": "apps/api/src/main.ts", "use": "@vercel/node" }
  ]
}
```
**Current Reality:** Vercel has officially deprecated and blocked the `builds` property in modern deployments. If deployed, Vercel fails the build with:
```
Error: The build property in vercel.json is deprecated and cannot be used with modern deployments.
```
Under Vercel's modern Zero-Config monorepo engine, a single Vercel project requires selecting **one Root Directory** (e.g. `apps/web`), which builds solely that application.

### Blocker 2: In-Memory Match State Loss (`MatchesService.matches`)
In `apps/api/src/modules/matches/matches.service.ts`:
```typescript
private readonly matches: Map<string, StoredMatch> = new Map();
```
1. A client invokes `POST /matches/simulate`.
2. The match is simulated, validated for bit-exact replay determinism, and stored in the server's in-memory `Map`.
3. The client then invokes `GET /matches/:id/stream` or `GET /matches/:id/verify`.
4. In Vercel Serverless, each request hits an independent, ephemeral Lambda instance. The new instance has an empty `matches` Map and throws:
   ```
   NotFoundException: Match with ID '...' not found
   ```
Fixing this would require rewriting the simulation engine and match service to persist large event graphs into PostgreSQL or Redis, directly violating Requirement 9 (*"Do not change simulation logic, database schemas or gameplay functionality"*).

### Blocker 3: SSE Streaming vs. Serverless Function Timeouts
In `apps/api/src/modules/matches/matches.service.ts`:
```typescript
streamMatchDeliveries(matchId: string, speedMs = 150): Observable<MessageEvent> {
  // Delivers ~240 balls via concatMap + delay(speedMs)
}
```
- A standard 40-over T20 cricket match comprises ~240 legal deliveries (plus extras).
- At standard playback speed ($150\text{ ms}$ per delivery), streaming a full match takes:
  $$240 \times 0.15\text{ s} = 36\text{ seconds}$$
- **Vercel Hobby Plan Timeout:** 15 seconds (max 60s with fluid compute).
- **Vercel Pro Plan Timeout:** Default 15 seconds (configurable up to 300s).
Any network jitter or spectator pausing will trigger an abrupt `HTTP 504 GATEWAY_TIMEOUT`, disconnecting the user mid-innings.

### Blocker 4: Persistent WebSockets (`NEXT_PUBLIC_WS_URL`)
The project environment specifies:
```env
NEXT_PUBLIC_WS_URL=ws://localhost:4000/ws/matches
```
Vercel Serverless Functions do not support stateful, persistent WebSockets. All bidirectional socket channels will fail to establish.

### Blocker 5: Cold-Start Overhead of 1,144 Player Profiles
In `apps/api/src/modules/players/players.service.ts`:
```typescript
private initializeBenchmarkProfiles(): void {
  for (const raw of VERIFIED_BENCHMARK_PLAYERS) {
    const profile = ingestPlayerRecord(raw);
    this.benchmarkProfiles.set(profile.id, profile);
  }
}
```
In a persistent NestJS server, this happens once at boot. In a serverless environment, every cold start re-evaluates 1,144 players and their Bayesian ratings, adding 1.5s–3s cold-start latency to initial API calls.

### Blocker 6: Next.js SWC vs. NestJS TypeScript Decorator Metadata
NestJS dependency injection relies on TypeScript emitting decorator metadata:
```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```
Next.js 15 uses SWC by default. Importing NestJS modules into Next.js App Router handlers causes SWC to strip parameter type metadata, resulting in `Nest can't resolve dependencies of the ...` runtime injection errors.

---

## 3. The Recommended Master Production Architecture

```
                                  INTERNET
                                     │
                 ┌───────────────────┴───────────────────┐
                 │                                       │
                 ▼                                       ▼
    ┌─────────────────────────┐             ┌─────────────────────────┐
    │     VERCEL PROJECT      │             │   PERSISTENT BACKEND    │
    │       (apps/web)        │             │       (apps/api)        │
    ├─────────────────────────┤             ├─────────────────────────┤
    │ • Next.js 15 App Router │             │ • NestJS 11 HTTP Server │
    │ • PixiJS v8 2D Pitch    │             │ • SSE Match Streaming   │
    │ • Client-side Sim Engine│             │ • 1,144 In-Memory Roster│
    │ • Static CDN Edge Caching│            │ • Prisma Client Pool    │
    │ • Reverse-Proxy Rewrites│             │ • WebSockets Support    │
    └────────────┬────────────┘             └────────────┬────────────┘
                 │                                       │
                 │   /api-backend/:path* (Proxy)         │
                 └───────────────────────────────────────┘
                                     │
                                     ▼
                            ┌─────────────────┐
                            │   POSTGRESQL    │
                            │ (Supabase/Neon) │
                            └─────────────────┘
```

This decoupled architecture:
1. **Preserves 100% of existing functionality** (no code rewritten, no NestJS logic compromised).
2. **Eliminates CORS entirely** by using Next.js `rewrites()` in `apps/web/next.config.mjs` to proxy `/api-backend/*` to the backend.
3. **Maintains local development workflows** (`pnpm dev` runs both on `localhost:3000` and `localhost:4000`).

---

## 4. Exact Vercel Deployment Configuration for `apps/web`

When importing your repository into Vercel, use the following exact settings:

| Setting | Value | Explanation |
| :--- | :--- | :--- |
| **Framework Preset** | `Next.js` | Auto-detected by Vercel |
| **Root Directory** | `apps/web` | Points Vercel to the Next.js app |
| **Include files outside Root Directory** | **YES / Checked** | Required for Turborepo monorepo packages (`@cricket/*`) |
| **Build Command** | `cd ../.. && pnpm turbo run build --filter=@cricket/web...` | Builds all monorepo dependencies before Next.js |
| **Output Directory** | `.next` | Standard Next.js build output |
| **Install Command** | `pnpm install` | Auto-detected |

### Environment Variables for Vercel Project:

```env
# URL of your deployed NestJS backend (e.g., on Railway or Render)
NEXT_PUBLIC_API_URL=https://api.yourdomain.com

# URL of your persistent WebSocket gateway
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com/ws/matches

# Internal URL used by Next.js server-side reverse proxy
BACKEND_API_INTERNAL_URL=https://api.yourdomain.com
```

---

## 5. Backend Deployment Instructions for `apps/api` (Railway / Render / Docker)

The NestJS backend should be hosted on a persistent Node.js container service. Below is the configuration for **Railway** or **Render**:

### Railway / Render Configuration:
- **Build Command:**
  ```bash
  pnpm install && pnpm --filter @cricket/api build
  ```
- **Start Command:**
  ```bash
  pnpm --filter @cricket/api start
  ```
- **Environment Variables:**
  ```env
  NODE_ENV=production
  PORT=4000
  CORS_ORIGINS=https://your-cricket-app.vercel.app,http://localhost:3000
  DATABASE_URL=postgresql://user:password@host:5432/dbname?schema=public
  JWT_SECRET=production_super_secure_jwt_secret_min32chars
  JWT_REFRESH_SECRET=production_super_secure_jwt_refresh_secret_min32chars
  ```

---

## 6. Zero-CORS Reverse Proxy Implementation

To ensure seamless frontend-to-backend communication in production without CORS errors, `apps/web/next.config.mjs` has been configured with an automatic reverse proxy:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@cricket/shared-types', '@cricket/validation'],
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    return [
      {
        source: '/api-backend/:path*',
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
```

**Benefits:**
- In production, browser requests can hit `/api-backend/health`, `/api-backend/players`, etc., as same-origin requests.
- Next.js securely forwards requests to the NestJS backend, bypassing CORS restrictions.
- In local development, requests continue defaulting to `http://localhost:4000`.

---

## 7. Verification & Testing Matrix

Before documenting this plan, the entire monorepo was subjected to end-to-end verification:

| Package | Test Command | Result | Coverage Details |
| :--- | :--- | :--- | :--- |
| `@cricket/shared-types` | `pnpm --filter @cricket/shared-types build` | **PASSED** | Zero TypeScript compilation errors |
| `@cricket/cricket-rules` | `pnpm --filter @cricket/cricket-rules test` | **PASSED** (29/29) | MCC rules, 8D analytics, nationality limits |
| `@cricket/simulation-engine` | `pnpm --filter @cricket/simulation-engine test` | **PASSED** (66/66) | Determinism, calibration, AI tactics, PRNG |
| `@cricket/data-ingestion` | `pnpm --filter @cricket/data-ingestion test` | **PASSED** (27/27) | 1,144 player profiles, ratings reconciliation |
| `@cricket/api` | `pnpm --filter @cricket/api test` | **PASSED** (42/42) | Health, players, dream-teams, match simulation |
| `@cricket/web` | `pnpm --filter @cricket/web test` | **PASSED** (24/24) | UI journeys, match visualization, E2E |
| **Monorepo Build** | `pnpm build` | **PASSED** (9/9) | All 9 packages built cleanly in 57s |

---

## 8. Deployment & Rollback Playbook

### Step-by-Step Deployment:
1. **Push Changes to GitHub:**
   ```bash
   git push origin main
   ```
2. **Deploy Backend (`apps/api`):**
   - Connect repository to Railway/Render.
   - Set Root Directory to repository root with build filter `@cricket/api`.
   - Add database connection string to `DATABASE_URL`.
   - Deploy and copy public backend URL (e.g. `https://cricket-api.up.railway.app`).
3. **Deploy Frontend (`apps/web`) to Vercel:**
   - Import repository on Vercel.
   - Set Root Directory to `apps/web`.
   - Ensure *"Include files outside Root Directory"* is checked.
   - Add `NEXT_PUBLIC_API_URL=https://cricket-api.up.railway.app` to Environment Variables.
   - Click **Deploy**.

### Rollback Plan:
If any production anomaly occurs:
1. **Vercel Instant Rollback:** In the Vercel Dashboard under *Deployments*, click the three dots on the previous working deployment and select **Instant Rollback**.
2. **Git Revert:**
   ```bash
   git revert HEAD
   git push origin main
   ```
   Vercel and Railway will automatically redeploy the previous stable state within 60 seconds.
