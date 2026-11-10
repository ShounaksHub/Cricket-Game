'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Shield, Trophy, Activity, CheckCircle2, Server, Globe2, Sparkles } from 'lucide-react';
import type { MatchFormat } from '@cricket/shared-types';

interface ApiHealthResponse {
  status: string;
  service: string;
  version: string;
  uptimeSeconds: number;
  database: {
    status: string;
    latencyMs?: number;
    error?: string;
  };
}

export default function LandingPage() {
  const [apiHealth, setApiHealth] = useState<ApiHealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    async function checkBackend() {
      try {
        const res = await fetch(`${apiUrl}/health`);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data: ApiHealthResponse = await res.json();
        setApiHealth(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Backend unreachable');
      } finally {
        setLoading(false);
      }
    }

    checkBackend();
  }, [apiUrl]);

  const formats: { code: MatchFormat; name: string; overs: string; desc: string }[] = [
    { code: 'T10', name: 'T10 Cricket', overs: '10 Overs / Innings', desc: 'Hyper-aggressive power hitting and death-over execution.' },
    { code: 'T20', name: 'T20 Cricket', overs: '20 Overs / Innings', desc: 'Powerplays, middle-overs spin matchups, and tactical acceleration.' },
    { code: 'ODI', name: 'One Day International', overs: '50 Overs / Innings', desc: 'Innings consolidation, two new white balls, and 3-stage powerplays.' },
    { code: 'TEST_RED_BALL', name: 'Test Match (Red Ball)', overs: 'Multi-Day / 90 Overs/Day', desc: 'Traditional attrition, multi-session stamina, follow-ons, and wear.' },
    { code: 'TEST_PINK_BALL', name: 'Test Match (Pink Ball)', overs: 'Day-Night / Twilight', desc: 'Floodlight visibility shifts, twilight swing, and dew modulation.' },
  ];

  return (
    <main className="min-h-screen bg-[#0E1013] text-[#F8F9FA] px-4 py-8 md:px-12 md:py-16">
      {/* Top Navigation Bar */}
      <nav className="max-w-6xl mx-auto flex items-center justify-between pb-8 border-b border-[#2E3440]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#0D4A38] border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#F8F9FA]">CRICKET DREAM SIMULATION</h1>
            <p className="text-xs tracking-widest text-[#9CA3AF] uppercase">Architectural Foundation v1.0.0</p>
          </div>
        </div>

        {/* Backend Communication Telemetry Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#181B20] border border-[#2E3440] text-xs">
          <Server className="w-3.5 h-3.5 text-[#9CA3AF]" />
          <span className="text-[#9CA3AF]">API:</span>
          {loading ? (
            <span className="text-yellow-400 font-mono animate-pulse">Connecting...</span>
          ) : apiHealth ? (
            <div className="flex items-center gap-1.5 text-emerald-400 font-mono font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>ONLINE ({apiHealth.database.status === 'up' ? `DB: ${apiHealth.database.latencyMs}ms` : 'STANDALONE'})</span>
            </div>
          ) : (
            <span className="text-rose-400 font-mono">OFFLINE ({error})</span>
          )}
        </div>
      </nav>

      {/* Hero Header */}
      <section className="max-w-4xl mx-auto text-center mt-12 md:mt-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0D4A38]/30 border border-[#0D4A38] text-xs text-[#D4AF37] mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>PHASE 8: MULTI-FORMAT ENGINE (T10, T20, ODI, TEST RED & PINK BALL) LIVE</span>
        </div>
        <h2 className="text-4xl md:text-6xl font-serif font-bold tracking-tight text-[#F8F9FA] mb-6 leading-tight">
          Global Cricket Dream Team & Simulation Engine
        </h2>
        <p className="text-lg md:text-xl text-[#9CA3AF] max-w-2xl mx-auto mb-10 leading-relaxed">
          Assemble cross-era playing XIs from 1,144 verified players, challenge situational AI opponents, and experience authoritative multi-format cricket simulations governed by true MCC laws.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/match"
            className="px-6 py-3.5 rounded-md bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-[#0E1013] font-bold shadow-lg shadow-[#D4AF37]/20 transition flex items-center gap-2"
          >
            <Trophy className="w-4 h-4 text-[#0E1013]" />
            <span>Play Match (All 5 Formats)</span>
          </Link>
          <Link
            href="/dream-teams"
            className="px-6 py-3.5 rounded-md bg-[#0D4A38] hover:bg-[#0D4A38]/90 text-[#F8F9FA] font-medium border border-[#D4AF37]/40 shadow-lg shadow-[#0D4A38]/20 transition flex items-center gap-2"
          >
            <Shield className="w-4 h-4 text-[#D4AF37]" />
            <span>Build Your Dream Team (1,144 Players)</span>
          </Link>
          <Link
            href="/players"
            className="px-6 py-3.5 rounded-md bg-[#181B20] hover:bg-[#22262E] text-[#F8F9FA] font-medium border border-[#2E3440] transition flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-[#9CA3AF]" />
            <span>Explore Player Registry & Ratings</span>
          </Link>
        </div>
      </section>

      {/* Supported Formats Grid */}
      <section className="max-w-6xl mx-auto mt-20">
        <div className="flex items-center justify-between mb-8 pb-3 border-b border-[#2E3440]/60">
          <h3 className="text-xl font-serif font-bold text-[#F8F9FA] flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-[#D4AF37]" />
            <span>Supported Cricket Formats</span>
          </h3>
          <span className="text-xs text-[#9CA3AF] uppercase tracking-wider">All 5 Formats Playable</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {formats.map((f) => (
            <div
              key={f.code}
              className="p-5 rounded-lg bg-[#181B20] border border-[#2E3440] hover:border-[#D4AF37]/50 transition duration-200"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#22262E] text-[#D4AF37] border border-[#2E3440]">
                  {f.code}
                </span>
                <span className="text-xs text-[#9CA3AF] font-mono">{f.overs}</span>
              </div>
              <h4 className="text-lg font-bold text-[#F8F9FA] mb-2">{f.name}</h4>
              <p className="text-sm text-[#9CA3AF] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Strategic Product Roadmap & Future Milestones (Phases 8–11) */}
      <section className="max-w-6xl mx-auto mt-20">
        <div className="flex items-center justify-between mb-8 pb-3 border-b border-[#2E3440]/60">
          <div>
            <h3 className="text-xl font-serif font-bold text-[#F8F9FA] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#D4AF37]" />
              <span>Strategic Product Roadmap</span>
            </h3>
            <p className="text-xs text-[#9CA3AF] mt-1">Long-term vision: From multi-format foundation to photorealistic 3D cricket simulation</p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-[#0D4A38]/40 text-[#D4AF37] border border-[#D4AF37]/30">
            Phases 8 – 11
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Phase 8 */}
          <div className="p-5 rounded-xl bg-gradient-to-b from-[#181B20] to-[#121418] border border-emerald-500/40 relative overflow-hidden">
            <div className="absolute top-0 right-0 px-2 py-0.5 bg-emerald-500 text-[#0E1013] text-[10px] font-mono font-bold rounded-bl uppercase">
              Current
            </div>
            <div className="text-xs font-mono text-emerald-400 font-bold mb-2">PHASE 8</div>
            <h4 className="text-base font-bold text-[#F8F9FA] mb-2">Multi-Format Engine & Audit</h4>
            <p className="text-xs text-[#9CA3AF] leading-relaxed mb-4">
              Native simulation for T10, T20, ODI, Test Red Ball & Pink Ball. Session tracking, follow-on mechanics, 80-over new ball reset, and comprehensive codebase pre-deployment audit.
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" /> Fully Implemented
            </div>
          </div>

          {/* Phase 9 */}
          <div className="p-5 rounded-xl bg-[#181B20] border border-[#2E3440] hover:border-[#D4AF37]/50 transition duration-200">
            <div className="text-xs font-mono text-[#D4AF37] font-bold mb-2">PHASE 9</div>
            <h4 className="text-base font-bold text-[#F8F9FA] mb-2">Multiplayer & Live Rooms</h4>
            <p className="text-xs text-[#9CA3AF] leading-relaxed mb-4">
              Real-time WebSocket multiplayer matchmaking, peer-to-peer tactical head-to-head battles, spectator lobbies, and synchronized live broadcast rooms.
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-mono">
              <Activity className="w-3.5 h-3.5" /> Next Release
            </div>
          </div>

          {/* Phase 10 */}
          <div className="p-5 rounded-xl bg-[#181B20] border border-[#2E3440] hover:border-[#D4AF37]/30 transition duration-200">
            <div className="text-xs font-mono text-[#9CA3AF] font-bold mb-2">PHASE 10</div>
            <h4 className="text-base font-bold text-[#F8F9FA] mb-2">Franchise & Career Dynasty</h4>
            <p className="text-xs text-[#9CA3AF] leading-relaxed mb-4">
              Multi-season franchise dynasty leagues, IPL-style mega auctions, player salary caps, youth scouting academy, and progressive player rating evolution.
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-[#9CA3AF] font-mono">
              Planned Architecture
            </div>
          </div>

          {/* Phase 11 */}
          <div className="p-5 rounded-xl bg-[#181B20] border border-[#2E3440] hover:border-[#D4AF37]/30 transition duration-200">
            <div className="text-xs font-mono text-[#9CA3AF] font-bold mb-2">PHASE 11</div>
            <h4 className="text-base font-bold text-[#F8F9FA] mb-2">3D Stadiums & Visuals</h4>
            <p className="text-xs text-[#9CA3AF] leading-relaxed mb-4">
              WebGPU-accelerated photorealistic 3D stadium geometry, volumetric atmospheric lighting, 3D trajectory ball physics, and multi-angle broadcast replay cameras.
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-[#9CA3AF] font-mono">
              Future Milestone
            </div>
          </div>
        </div>
      </section>

      {/* System Status & Verification Checklist */}
      <section className="max-w-6xl mx-auto mt-16 p-6 rounded-xl bg-[#181B20]/80 border border-[#2E3440]">
        <h4 className="text-base font-bold text-[#F8F9FA] mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Pre-Deployment Verification Matrix</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-3 rounded bg-[#0E1013] border border-[#2E3440]">
            <span className="text-[#9CA3AF] block mb-1">WORKSPACE</span>
            <span className="text-emerald-400">pnpm + Turborepo Monorepo</span>
          </div>
          <div className="p-3 rounded bg-[#0E1013] border border-[#2E3440]">
            <span className="text-[#9CA3AF] block mb-1">FRONTEND RUNTIME</span>
            <span className="text-emerald-400">Next.js 15.1.7 (React 19)</span>
          </div>
          <div className="p-3 rounded bg-[#0E1013] border border-[#2E3440]">
            <span className="text-[#9CA3AF] block mb-1">BACKEND RUNTIME</span>
            <span className="text-emerald-400">NestJS 11 (Node 24 LTS)</span>
          </div>
          <div className="p-3 rounded bg-[#0E1013] border border-[#2E3440]">
            <span className="text-[#9CA3AF] block mb-1">PLAYER DATABASE</span>
            <span className="text-emerald-400">1,144 Verified Records</span>
          </div>
        </div>
      </section>
    </main>
  );
}
