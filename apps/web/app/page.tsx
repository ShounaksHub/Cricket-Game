'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { MatchFormat } from '@cricket/shared-types';
import { CricketDreamXILogo } from '@/components/CricketDreamXILogo';
import { UpcomingUpdatesSection } from '@/components/UpcomingUpdatesSection';
import { UpcomingFeatureModal } from '@/components/UpcomingFeatureModal';
import { FEATURE_REGISTRY, PlannedFeature } from '@/lib/feature-registry';

export default function HomeScreen() {
  const router = useRouter();
  const [formatFilter, setFormatFilter] = useState<'all' | 'white' | 'red'>('all');
  const [savedTeam, setSavedTeam] = useState<{
    name: string;
    captainName: string;
    vcName: string;
    playerCount: number;
    synergy: number;
  } | null>(null);
  const [careerStats, setCareerStats] = useState<{
    totalRuns: number;
    totalMatches: number;
    totalWins: number;
    winPercentage: string;
  }>({
    totalRuns: 0,
    totalMatches: 0,
    totalWins: 0,
    winPercentage: '0.0',
  });
  const [activeMatch, setActiveMatch] = useState<{
    format: MatchFormat;
    userTeamName: string;
    aiTeamName: string;
    scoreStr: string;
    oversStr: string;
    targetStr?: string;
    ballsThisOver: string[];
    isChasing?: boolean;
    equationStr?: string;
  } | null>(null);
  const [recentCompletedMatch, setRecentCompletedMatch] = useState<{
    format: MatchFormat;
    resultSummary: string;
    team1Name: string;
    team1Score: string;
    team2Name: string;
    team2Score: string;
    potm?: {
      name: string;
      team: string;
      points?: number;
      summary?: string;
    } | null;
  } | null>(null);
  const [selectedUpcomingFeature, setSelectedUpcomingFeature] = useState<PlannedFeature | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Load genuine career metrics & most recent completed match from cricket_match_history
    try {
      const rawHistory = localStorage.getItem('cricket_match_history');
      if (rawHistory) {
        const history = JSON.parse(rawHistory);
        if (Array.isArray(history) && history.length > 0) {
          let runs = 0;
          let wins = 0;
          for (const m of history) {
            const sum = (m.resultSummary || '').toLowerCase();
            if (sum.includes('won by') || sum.includes('victory')) wins++;
            const mRuns = (m.team1Score || '').match(/^(\d+)/);
            if (mRuns) runs += parseInt(mRuns[1], 10);
            const mRuns2 = (m.team2Score || '').match(/^(\d+)/);
            if (mRuns2) runs += parseInt(mRuns2[1], 10);
          }
          setCareerStats({
            totalRuns: runs,
            totalMatches: history.length,
            totalWins: wins,
            winPercentage: ((wins / history.length) * 100).toFixed(1),
          });

          // Most recent completed match
          const latest = history[0];
          if (latest) {
            setRecentCompletedMatch({
              format: latest.format || 'T20',
              resultSummary: latest.resultSummary || 'Match Finished',
              team1Name: latest.team1Name || 'Your XI',
              team1Score: latest.team1Score || '-',
              team2Name: latest.team2Name || 'Opponent XI',
              team2Score: latest.team2Score || '-',
              potm: latest.potm || null,
            });
          }
        }
      }
    } catch {}

    // Load saved custom dream team from localStorage
    try {
      const rawSquads = localStorage.getItem('cricket_dream_teams');
      if (rawSquads) {
        const parsed = JSON.parse(rawSquads);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const team = parsed[0];
          const cap = team.players?.find((p: any) => p.isCaptain);
          const vc = team.players?.find((p: any) => p.isViceCaptain);
          setSavedTeam({
            name: team.teamName || team.name || 'My Dream XI',
            captainName: cap?.name || 'V. Kohli',
            vcName: vc?.name || 'J. Bumrah',
            playerCount: team.players?.length || 11,
            synergy: 96,
          });
        }
      }
    } catch {
      // Fallback to default benchmark
    }

    // Load active match session from cricket_active_match_session or legacy cricket_active_match
    try {
      const rawSession = localStorage.getItem('cricket_active_match_session');
      if (rawSession) {
        const session = JSON.parse(rawSession);
        if (session && session.visibleEvents && Array.isArray(session.visibleEvents)) {
          const events = session.visibleEvents;
          const lastEvent = events[events.length - 1];
          const runs = lastEvent?.scorecardDelta?.totalRuns ?? 0;
          const wickets = lastEvent?.scorecardDelta?.totalWickets ?? 0;
          const completedOvers = Math.floor(events.length / 6);
          const ballsInOver = events.length % 6;
          const oversStr = `${completedOvers}.${ballsInOver}`;
          const balls = events.slice(-6).map((e: any) => {
            if (e.outcome === 'WICKET') return 'W';
            if (e.outcome === 'SIX') return '6';
            if (e.outcome === 'FOUR') return '4';
            if (e.outcome === 'DOT') return '•';
            return String(e.runsBat + (e.extras?.wides || 0) + (e.extras?.noBalls || 0));
          });

          setActiveMatch({
            format: session.format || 'T20',
            userTeamName: session.userTeamName || 'YOUR XI',
            aiTeamName: session.aiTeamName || 'OPPONENT XI',
            scoreStr: `${runs}/${wickets}`,
            oversStr,
            targetStr: undefined,
            ballsThisOver: balls.length > 0 ? balls : ['•', '•', '•', '•', '•', '•'],
            isChasing: false,
          });
        }
      } else {
        const rawMatch = localStorage.getItem('cricket_active_match');
        if (rawMatch) {
          const parsed = JSON.parse(rawMatch);
          if (parsed?.matchState) {
            const inn = parsed.matchState.innings?.[parsed.matchState.currentInningsIndex];
            if (inn) {
              const balls = inn.deliveries?.slice(-6).map((d: any) => {
                if (d.outcome === 'WICKET') return 'W';
                if (d.runsBatter === 6) return '6';
                if (d.runsBatter === 4) return '4';
                if (d.runsBatter === 0) return '•';
                return String(d.runsTotal);
              }) || ['1', '4', 'W', '6', '●'];

              setActiveMatch({
                format: parsed.format || 'T20',
                userTeamName: parsed.matchState.config?.teamA?.name || 'IND',
                aiTeamName: parsed.matchState.config?.teamB?.name || 'AUS',
                scoreStr: `${inn.runs}/${inn.wickets}`,
                oversStr: `${Math.floor(inn.ballsBowled / 6)}.${inn.ballsBowled % 6}`,
                targetStr: inn.target ? `TARGET ${inn.target} RUNS` : undefined,
                ballsThisOver: balls.length > 0 ? balls : ['1', '4', 'W', '6', '●'],
                isChasing: !!inn.target,
              });
            }
          }
        }
      }
    } catch {
      // Fallback
    }
  }, []);

  function handleStartFormat(format: MatchFormat) {
    router.push(`/match?format=${format}`);
  }

  return (
    <div className="flex flex-col w-full relative overflow-hidden select-none">
      {/* Top Atmospheric Glow & Spatial Grid */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1200px] h-[550px] bg-gradient-to-b from-primary/15 via-secondary-container/10 to-transparent blur-[140px] pointer-events-none rounded-full z-0" />
      <div className="absolute top-20 right-[-100px] w-96 h-96 bg-telemetry-blue/10 blur-[120px] pointer-events-none rounded-full z-0" />
      <div className="absolute top-96 left-[-120px] w-96 h-96 bg-tertiary/10 blur-[130px] pointer-events-none rounded-full z-0" />

      {/* Hero Panoramic Sports Section */}
      <section className="relative w-full z-10 px-4 md:px-margin-desktop py-space-xl max-w-[1440px] mx-auto flex flex-col justify-between min-h-[580px] lg:min-h-[640px] rounded-xl overflow-hidden mt-space-sm shadow-xl bg-surface-recessed">
        {/* Stadium Background Visual */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-screen scale-105 pointer-events-none"
          style={{ backgroundImage: `url('/assets/stitch/stadium-hero.png')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/85 to-surface/40 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-surface-recessed via-surface/60 to-transparent pointer-events-none" />

        {/* Stadium Live Telemetry Overline Tag */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-space-sm w-full">
          <div className="flex items-center gap-space-xs bg-surface-card/90 backdrop-blur-md px-space-md py-space-xs rounded-full shadow-sm">
            <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
            <span className="w-2 h-2 rounded-full bg-primary -ml-2.5" />
            <span className="font-label-caps text-label-caps text-primary tracking-widest uppercase">
              SEASON 2025 • PAVILION ACCESS UNLOCKED
            </span>
            <span className="text-text-subdued font-label-caps text-label-caps">/</span>
            <span className="font-label-caps text-label-caps text-secondary-fixed-dim">
              HYDERABAD COLOSSEUM
            </span>
          </div>

          {/* Quick Match Telemetry Pill */}
          <div className="hidden md:flex items-center gap-space-md bg-surface-container/80 backdrop-blur-md px-space-md py-space-xs rounded-lg shadow-sm">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-[16px] text-tertiary">wb_sunny</span>
              <span className="font-label-caps text-label-caps text-text-chalk">DAY-NIGHT DRY CRACK</span>
            </div>
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-[16px] text-telemetry-blue">air</span>
              <span className="font-label-caps text-label-caps text-text-slate">14 KM/H CROSSWIND</span>
            </div>
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-[16px] text-primary">speed</span>
              <span className="font-label-caps text-label-caps text-primary">FAST OUTFIELD (1.2x)</span>
            </div>
          </div>
        </div>

        {/* Central Hero Headline & Value Proposition */}
        <div className="relative z-10 max-w-4xl flex flex-col gap-space-md my-auto pt-space-xl pb-space-lg">
          <div className="flex items-center gap-space-sm">
            <CricketDreamXILogo
              variant="monogram"
              theme="dark"
              height={28}
              className="h-7 w-auto"
            />
            <span className="px-space-sm py-1 rounded-full bg-surface-elevated font-label-caps text-label-caps text-text-chalk uppercase tracking-widest shadow-sm border border-border-hairline flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              AUTHENTIC ICC SIMULATION ENGINE
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-secondary hidden sm:inline-block" />
            <span className="font-label-caps text-label-caps text-text-slate uppercase tracking-wider hidden sm:inline-block">
              BROADCAST TELEMETRY HUD
            </span>
          </div>

          <h1 className="font-display-lg text-display-lg text-text-chalk tracking-tight uppercase leading-none drop-shadow-md">
            YOUR TEAM.<br />
            <span className="bg-gradient-to-r from-text-chalk via-primary to-secondary bg-clip-text text-transparent">
              YOUR ERA.
            </span>
            <br />
            YOUR GAME.
          </h1>

          <p className="font-headline-md text-title-md text-text-slate max-w-2xl font-normal leading-relaxed">
            Assemble an unstoppable international XI, craft tactical field placements, and lead the chase against world-class bowling algorithms in zero-latency offline play.
          </p>

          {/* Primary Action CTA Cluster */}
          <div className="flex flex-wrap items-center gap-space-md pt-space-sm">
            {/* Main 'PLAY CRICKET' CTA */}
            <Link
              href="/match"
              className="group relative px-space-xl py-4 bg-primary text-on-primary font-headline-md text-title-md tracking-wider uppercase rounded-lg shadow-[0_4px_24px_rgba(120,220,119,0.35)] hover:shadow-[0_8px_32px_rgba(120,220,119,0.5)] transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center gap-space-sm"
              id="btn-play-cricket"
            >
              <span className="material-symbols-outlined text-[26px] group-hover:rotate-45 transition-transform duration-300">
                sports_cricket
              </span>
              <span className="font-extrabold tracking-widest">PLAY CRICKET</span>
              <span className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-1">
                arrow_forward
              </span>
            </Link>

            {/* Secondary 'BUILD YOUR DREAM XI' CTA */}
            <Link
              href="/dream-teams"
              className="group px-space-lg py-4 bg-surface-card hover:bg-surface-elevated text-text-chalk font-headline-md text-title-md uppercase tracking-wider rounded-lg shadow-sm transition-all flex items-center gap-space-sm"
              id="btn-build-xi"
            >
              <span className="material-symbols-outlined text-[22px] text-secondary group-hover:scale-110 transition-transform">
                shield_person
              </span>
              <span className="font-bold">BUILD DREAM XI</span>
              <span className="font-label-caps text-label-caps px-2 py-0.5 rounded bg-surface-container text-secondary-fixed">
                11/11 READY
              </span>
            </Link>

            {/* Tertiary Quick Resume Action */}
            <Link
              href="/match?resume=true"
              className="group px-space-md py-4 bg-surface-container/60 hover:bg-surface-container text-text-slate hover:text-text-chalk font-label-caps text-label-caps uppercase tracking-widest rounded-lg transition-all flex items-center gap-space-xs"
              id="btn-quick-resume"
            >
              <span className="material-symbols-outlined text-[18px] text-telemetry-blue group-hover:animate-pulse">
                play_circle
              </span>
              <span>
                {activeMatch
                  ? `QUICK RESUME (${activeMatch.format} ${activeMatch.oversStr} OV)`
                  : 'QUICK RESUME (T20 16.2 OV)'}
              </span>
            </Link>
          </div>
        </div>

        {/* Micro Stats Ticker Bar */}
        <div className="relative z-10 w-full pt-space-md flex flex-wrap items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-xl">
            <div className="flex flex-col">
              <span className="font-label-caps text-label-caps text-text-subdued uppercase">RECORDED CAREER RUNS</span>
              <span className="font-scoreboard-md text-scoreboard-md text-text-chalk">
                {careerStats.totalRuns.toLocaleString()}{' '}
                <span className="font-label-caps text-label-caps text-primary">
                  {careerStats.totalMatches > 0 ? `(${careerStats.totalMatches} FIXTURES)` : 'LOCAL BENCHMARK'}
                </span>
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-caps text-label-caps text-text-subdued uppercase">WIN RATIO</span>
              <span className="font-scoreboard-md text-scoreboard-md text-secondary">
                {careerStats.winPercentage}%{' '}
                <span className="font-label-caps text-label-caps text-text-slate">
                  ({careerStats.totalWins}/{careerStats.totalMatches} WINS)
                </span>
              </span>
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="font-label-caps text-label-caps text-text-subdued uppercase">ROSTER VAULT</span>
              <span className="font-scoreboard-md text-scoreboard-md text-tertiary">
                1,144 PLAYERS{' '}
                <span className="font-label-caps text-label-caps text-tertiary-fixed-dim">100% AUDITED</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-[18px] text-primary">verified</span>
            <span className="font-label-caps text-label-caps text-text-slate uppercase tracking-wider">
              CERTIFIED CRICKET MATCH SIMULATOR ENGINE
            </span>
          </div>
        </div>
      </section>

      {/* Section 2: Quick Access Tactical Operations (3 Crisp Cards) */}
      <section className="w-full max-w-[1440px] mx-auto px-4 md:px-margin-desktop py-space-xl z-10">
        <div className="flex items-end justify-between mb-space-md">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-space-xs">
              <span className="w-2 h-2 rounded-full bg-secondary" />
              <span className="font-label-caps text-label-caps text-secondary uppercase tracking-widest">
                TACTICAL COMMAND
              </span>
            </div>
            <h2 className="font-headline-lg text-headline-lg text-text-chalk tracking-tight uppercase">
              ACTIVE LOCKER ROOM & RUNNING CAMPAIGNS
            </h2>
          </div>
          <span className="font-label-caps text-label-caps text-text-subdued uppercase tracking-widest hidden sm:inline-block">
            DIRECT ACCESS TILES • 03 NODES
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg">
          {/* Card 1: YOUR DREAM XI */}
          <div className="group relative bg-surface-card hover:bg-surface-elevated rounded-xl p-space-lg flex flex-col justify-between transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-1 overflow-hidden border border-border-hairline">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all pointer-events-none" />
            <div>
              <div className="flex items-center justify-between w-full mb-space-md">
                <span className="font-label-caps text-label-caps px-2.5 py-1 rounded bg-secondary-container text-on-secondary-container uppercase tracking-wider font-extrabold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">groups</span>
                  YOUR DREAM XI
                </span>
                <span className="font-label-caps text-label-caps text-primary px-2 py-0.5 rounded bg-surface-recessed flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px] text-tertiary">military_tech</span>
                  {savedTeam ? `${savedTeam.synergy}% SYNERGY` : '96% SYNERGY'}
                </span>
              </div>

              <div className="flex items-center gap-space-md mb-space-md">
                <div className="w-14 h-14 rounded-lg bg-surface-container flex items-center justify-center shadow-inner relative flex-shrink-0">
                  <span className="material-symbols-outlined text-[32px] text-primary">bolt</span>
                  <span className="absolute -top-1.5 -right-1.5 bg-tertiary text-on-tertiary font-label-caps text-[9px] px-1 py-0.2 rounded font-extrabold shadow-sm">
                    C
                  </span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-headline-md text-headline-md text-text-chalk tracking-tight truncate group-hover:text-primary transition-colors">
                    {savedTeam ? savedTeam.name : 'MY DREAM XI'}
                  </span>
                  <span className="font-body-sm text-body-sm text-text-slate">
                    Captain:{' '}
                    <strong className="text-text-chalk">
                      {savedTeam ? savedTeam.captainName : 'V. Kohli'} (C)
                    </strong>{' '}
                    • VC:{' '}
                    <strong className="text-text-chalk">
                      {savedTeam ? savedTeam.vcName : 'J. Bumrah'}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Composition Pill Bar */}
              <div className="bg-surface-recessed p-space-sm rounded-lg mb-space-md flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-body-sm">
                  <span className="font-label-caps text-label-caps text-text-subdued uppercase">
                    SQUAD ROSTER BALANCE
                  </span>
                  <span className="font-label-caps text-label-caps text-primary font-bold">
                    {savedTeam ? `${savedTeam.playerCount} / 11 SELECTED` : '11 / 11 SELECTED'}
                  </span>
                </div>
                {/* Progress Segment Meter */}
                <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden flex gap-0.5">
                  <div className="h-full bg-secondary" style={{ width: '36%' }} title="4 Pure Batsmen" />
                  <div className="h-full bg-warning-amber" style={{ width: '10%' }} title="1 Wicketkeeper" />
                  <div className="h-full bg-tertiary" style={{ width: '27%' }} title="3 All-Rounders" />
                  <div className="h-full bg-telemetry-blue" style={{ width: '27%' }} title="3 Strike Bowlers" />
                </div>
                <div className="flex justify-between font-label-caps text-[10px] text-text-subdued pt-0.5">
                  <span className="text-secondary-fixed">4 BAT</span>
                  <span className="text-warning-amber">1 WK</span>
                  <span className="text-tertiary-fixed">3 AR</span>
                  <span className="text-telemetry-blue">3 BOWL</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-space-sm pt-space-xs">
              <Link
                href="/dream-teams"
                className="flex-1 py-2.5 px-space-md bg-surface-container hover:bg-surface-bright text-text-chalk font-label-caps text-label-caps uppercase tracking-wider rounded transition-colors flex items-center justify-center gap-space-xs"
              >
                <span className="material-symbols-outlined text-[16px]">edit_note</span>
                <span>EDIT LINEUP</span>
              </Link>
              <Link
                href="/match"
                className="py-2.5 px-space-sm bg-primary/10 hover:bg-primary/20 text-primary rounded transition-colors flex items-center justify-center"
                title="Play with Squad"
              >
                <span className="material-symbols-outlined text-[18px]">play_arrow</span>
              </Link>
            </div>
          </div>

          {/* Card 2: CONTINUE MATCH (Active Match Live Node) */}
          <div className="group relative bg-surface-card hover:bg-surface-elevated rounded-xl p-space-lg flex flex-col justify-between transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-1 overflow-hidden border border-border-hairline">
            <div className="absolute top-0 right-0 w-36 h-36 bg-warning-amber/10 rounded-full blur-2xl pointer-events-none group-hover:bg-warning-amber/20 transition-all" />
            <div>
              <div className="flex items-center justify-between w-full mb-space-md">
                <span className={`font-label-caps text-label-caps px-2.5 py-1 rounded uppercase tracking-wider font-extrabold flex items-center gap-1.5 ${
                  activeMatch ? 'bg-wicket-red-container text-on-error animate-pulse' : 'bg-surface-container text-text-subdued'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${activeMatch ? 'bg-wicket-red' : 'bg-text-subdued'}`} />
                  {activeMatch ? 'MATCH IN PROGRESS' : 'READY FOR KICKOFF'}
                </span>
                <span className="font-label-caps text-label-caps text-text-chalk px-2 py-0.5 rounded bg-surface-recessed font-mono">
                  {activeMatch ? `${activeMatch.format} LEAGUE` : 'QUICK SIMULATOR'}
                </span>
              </div>

              {/* Fixture Header */}
              <div className="flex items-center justify-between mb-space-sm">
                <div className="flex items-center gap-space-xs truncate">
                  <span className="font-headline-md text-title-md text-text-chalk font-extrabold truncate max-w-[130px]">
                    {activeMatch ? activeMatch.userTeamName : (savedTeam?.name || 'YOUR XI')}
                  </span>
                  <span className="font-label-caps text-label-caps text-text-subdued font-bold">vs</span>
                  <span className="font-headline-md text-title-md text-text-slate font-extrabold truncate max-w-[130px]">
                    {activeMatch ? activeMatch.aiTeamName : 'AI WORLD XI'}
                  </span>
                </div>
                <span className="font-label-caps text-label-caps text-secondary-fixed bg-surface-container px-2 py-0.5 rounded shrink-0">
                  {activeMatch?.isChasing ? 'CHASING TARGET' : activeMatch ? '1ST INNINGS' : 'NEW DERBY'}
                </span>
              </div>

              {/* Live Scoreboard Sub-Widget */}
              <div className="bg-surface-recessed p-space-md rounded-lg mb-space-md flex flex-col gap-space-xs">
                <div className="flex items-baseline justify-between">
                  <span className="font-scoreboard-xl text-scoreboard-xl text-text-chalk leading-none tracking-tight">
                    {activeMatch ? activeMatch.scoreStr : '0/0'}
                  </span>
                  <span className="font-scoreboard-md text-scoreboard-md text-text-slate">
                    {activeMatch ? activeMatch.oversStr : '0.0'}{' '}
                    <span className="font-label-caps text-label-caps text-text-subdued font-normal">
                      / {activeMatch ? (activeMatch.format === 'T10' ? '10' : activeMatch.format === 'ODI' ? '50' : '20') : '20'} OV
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-body-sm text-text-subdued pt-1">
                  <span className="font-label-caps text-label-caps text-warning-amber">
                    {activeMatch?.targetStr || 'STANDARD MATCHPLAY'}
                  </span>
                  <span className="font-label-caps text-label-caps text-primary">
                    {activeMatch ? 'BALLISTICS READY' : 'CLICK TO LAUNCH'}
                  </span>
                </div>
                {/* Over Ball Feed */}
                <div className="flex items-center gap-1.5 pt-2">
                  <span className="font-label-caps text-[10px] text-text-subdued uppercase">THIS OVER:</span>
                  {(activeMatch?.ballsThisOver || ['•', '•', '•', '•', '•', '•']).map((b, idx) => (
                    <span
                      key={idx}
                      className={`w-5 h-5 rounded-full flex items-center justify-center font-label-caps text-[10px] font-bold ${
                        b === 'W'
                          ? 'bg-wicket-red-container text-error font-extrabold'
                          : b === '6'
                          ? 'bg-primary-container text-on-primary-container font-extrabold shadow-sm'
                          : b === '4'
                          ? 'bg-primary/20 text-primary font-bold'
                          : b === '•' || b === '●'
                          ? 'bg-surface-elevated text-text-subdued'
                          : 'bg-surface-container text-text-chalk'
                      }`}
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <Link
              href={activeMatch ? '/match?resume=true' : '/match'}
              className="w-full py-2.5 px-space-md bg-warning-amber text-surface-container-lowest font-headline-md text-body-bold uppercase tracking-wider rounded shadow-[0_4px_16px_rgba(245,158,11,0.25)] hover:shadow-[0_4px_24px_rgba(245,158,11,0.4)] transition-all flex items-center justify-center gap-space-xs font-bold"
            >
              <span className="material-symbols-outlined text-[18px]">sports</span>
              <span>{activeMatch ? 'RESUME MATCH' : 'START LIVE MATCH'}</span>
            </Link>
          </div>

          {/* Card 3: RECENT MATCH (Victory Record) */}
          <div className="group relative bg-surface-card hover:bg-surface-elevated rounded-xl p-space-lg flex flex-col justify-between transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-1 overflow-hidden border border-border-hairline">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 pointer-events-none transition-all" />
            <div>
              <div className="flex items-center justify-between w-full mb-space-md">
                <span className="font-label-caps text-label-caps px-2.5 py-1 rounded bg-surface-container text-primary uppercase tracking-wider font-extrabold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-primary">trophy</span>
                  {recentCompletedMatch ? 'COMPLETED MATCH' : 'MATCH VAULT'}
                </span>
                <span className="font-label-caps text-label-caps text-text-subdued px-2 py-0.5 rounded bg-surface-recessed font-mono">
                  {recentCompletedMatch ? `${recentCompletedMatch.format} DERBY` : 'ARCHIVE READY'}
                </span>
              </div>
              <div className="flex flex-col mb-space-sm">
                <span className="font-label-caps text-label-caps text-secondary-fixed uppercase tracking-widest font-extrabold mb-1">
                  {recentCompletedMatch ? recentCompletedMatch.resultSummary : 'NO PAST MATCHES YET'}
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-headline-md text-title-md text-text-chalk truncate max-w-[170px]">
                    {recentCompletedMatch ? recentCompletedMatch.team1Name : 'YOUR SQUAD'}
                  </span>
                  <span className="font-scoreboard-md text-scoreboard-md text-text-chalk">
                    {recentCompletedMatch ? recentCompletedMatch.team1Score : '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-text-slate">
                  <span className="font-headline-md text-title-md text-text-slate truncate max-w-[170px]">
                    {recentCompletedMatch ? recentCompletedMatch.team2Name : 'OPPONENT'}
                  </span>
                  <span className="font-scoreboard-md text-scoreboard-md text-text-slate">
                    {recentCompletedMatch ? recentCompletedMatch.team2Score : '-'}
                  </span>
                </div>
              </div>

              {/* Player of the Match Spotlight */}
              {recentCompletedMatch?.potm ? (
                <div className="bg-surface-recessed p-space-sm rounded-lg mb-space-md flex items-center gap-space-sm">
                  <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[20px] text-tertiary">star</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-label-caps text-[10px] text-tertiary uppercase tracking-wider font-bold">
                        PLAYER OF MATCH
                      </span>
                      <span className="w-1 h-1 rounded-full bg-text-subdued" />
                      <span className="font-label-caps text-[10px] text-text-subdued">
                        {recentCompletedMatch.potm.team}
                      </span>
                    </div>
                    <span className="font-body-bold text-body-bold text-text-chalk truncate">
                      {recentCompletedMatch.potm.name}
                      {recentCompletedMatch.potm.summary ? (
                        <span className="font-body-sm text-text-slate font-normal ml-1">
                          • {recentCompletedMatch.potm.summary}
                        </span>
                      ) : null}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-surface-recessed p-space-sm rounded-lg mb-space-md flex items-center gap-space-sm">
                  <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[20px] text-primary">sports_cricket</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="text-[10px] font-mono text-primary uppercase font-bold tracking-wider">
                      HISTORICAL REPLAYS
                    </div>
                    <span className="font-body-sm text-text-slate">
                      Matches played will be archived with full telemetry &amp; POTM awards.
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-space-sm">
              <Link
                href="/my-cricket"
                className="flex-1 py-2.5 px-space-md bg-surface-container hover:bg-surface-bright text-text-chalk font-label-caps text-label-caps uppercase tracking-wider rounded transition-colors flex items-center justify-center gap-space-xs"
              >
                <span className="material-symbols-outlined text-[16px]">analytics</span>
                <span>{recentCompletedMatch ? 'FULL SCORECARD' : 'VIEW MATCH HISTORY'}</span>
              </Link>
              <Link
                href="/my-cricket"
                className="py-2.5 px-space-sm bg-surface-container hover:bg-surface-bright text-text-slate hover:text-text-chalk rounded transition-colors"
                title="Match History & Replays"
              >
                <span className="material-symbols-outlined text-[18px]">replay</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Quick Play Format Carousel / Selector (5 Tactile Cards) */}
      <section className="w-full max-w-[1440px] mx-auto px-4 md:px-margin-desktop py-space-xl z-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-space-sm mb-space-lg">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-space-xs">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span className="font-label-caps text-label-caps text-primary uppercase tracking-widest">
                TACTICAL ARENA
              </span>
            </div>
            <h2 className="font-headline-lg text-headline-lg text-text-chalk tracking-tight uppercase">
              SELECT MATCH FORMAT
            </h2>
            <p className="font-body-base text-body-base text-text-slate">
              From frantic 10-over blitzes to grueling 5-day red ball attrition.
            </p>
          </div>

          {/* Quick Category Toggle Pills */}
          <div className="flex items-center p-1 bg-surface-card rounded-lg gap-1 border border-border-hairline">
            <button
              onClick={() => setFormatFilter('all')}
              className={`px-space-md py-1.5 rounded font-label-caps text-label-caps uppercase font-bold transition-all ${
                formatFilter === 'all' ? 'text-on-primary bg-primary' : 'text-text-slate hover:text-text-chalk'
              }`}
              type="button"
            >
              ALL FORMATS
            </button>
            <button
              onClick={() => setFormatFilter('white')}
              className={`px-space-md py-1.5 rounded font-label-caps text-label-caps uppercase font-bold transition-all ${
                formatFilter === 'white' ? 'text-on-primary bg-primary' : 'text-text-slate hover:text-text-chalk'
              }`}
              type="button"
            >
              LIMITED OVERS
            </button>
            <button
              onClick={() => setFormatFilter('red')}
              className={`px-space-md py-1.5 rounded font-label-caps text-label-caps uppercase font-bold transition-all ${
                formatFilter === 'red' ? 'text-on-primary bg-primary' : 'text-text-slate hover:text-text-chalk'
              }`}
              type="button"
            >
              TEST CRICKET
            </button>
          </div>
        </div>

        {/* 5 Distinct Format Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-space-md">
          {/* Format 1: T10 SUPER SLAM */}
          {(formatFilter === 'all' || formatFilter === 'white') && (
            <div className="group relative bg-surface-card hover:bg-surface-elevated rounded-xl p-space-md flex flex-col justify-between transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-1 overflow-hidden border border-border-hairline">
              <div className="h-1 w-full bg-gradient-to-r from-tertiary-fixed to-warning-amber rounded-full mb-space-md" />
              <div>
                <div className="flex items-center justify-between mb-space-sm">
                  <div className="w-10 h-10 rounded-full bg-[#261F0A] flex items-center justify-center shadow-inner" title="White Kookaburra Ball">
                    <svg className="w-6 h-6 text-tertiary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 3a9 9 0 0 1 9 9M3 12a9 9 0 0 1 9 9" strokeDasharray="2 2" />
                    </svg>
                  </div>
                  <span className="font-label-caps text-label-caps px-2 py-0.5 rounded bg-[#261F0A] text-tertiary font-extrabold">
                    T10 SLAM
                  </span>
                </div>
                <h3 className="font-headline-md text-title-md text-text-chalk uppercase group-hover:text-tertiary transition-colors mb-1">
                  SUPER SLAM
                </h3>
                <span className="font-scoreboard-md text-scoreboard-md text-tertiary block mb-space-sm">
                  10 OVERS <span className="font-label-caps text-label-caps text-text-subdued font-normal">/ INNINGS</span>
                </span>
                <p className="font-body-sm text-body-sm text-text-slate mb-space-md line-clamp-2">
                  Non-stop power hitting, maximum field restrictions, and aggressive death deliveries. 15 minute match.
                </p>
                <div className="space-y-1.5 bg-surface-recessed p-space-sm rounded-lg mb-space-md">
                  <div className="flex justify-between font-label-caps text-label-caps">
                    <span className="text-text-subdued">PACE OF PLAY</span>
                    <span className="text-tertiary font-bold">HYPER SPEED</span>
                  </div>
                  <div className="flex justify-between font-label-caps text-label-caps">
                    <span className="text-text-subdued">POWERPLAY</span>
                    <span className="text-text-chalk">3 OVERS</span>
                  </div>
                  <div className="flex justify-between font-label-caps text-label-caps">
                    <span className="text-text-subdued">MAX PER BOWLER</span>
                    <span className="text-text-chalk">2 OVERS</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleStartFormat('T10')}
                className="w-full py-2 bg-surface-container group-hover:bg-tertiary group-hover:text-on-tertiary text-text-chalk font-label-caps text-label-caps uppercase tracking-wider rounded font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                <span>START T10</span>
              </button>
            </div>
          )}

          {/* Format 2: T20 WORLD CUP */}
          {(formatFilter === 'all' || formatFilter === 'white') && (
            <div className="group relative bg-surface-card hover:bg-surface-elevated rounded-xl p-space-md flex flex-col justify-between transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-1 overflow-hidden border border-border-hairline">
              <div className="h-1 w-full bg-gradient-to-r from-primary to-secondary rounded-full mb-space-md" />
              <div>
                <div className="flex items-center justify-between mb-space-sm">
                  <div className="w-10 h-10 rounded-full bg-[#0C2B1D] flex items-center justify-center shadow-inner" title="White Kookaburra Ball">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M6 6c3 3 3 9 0 12M18 6c-3 3-3 9 0 12" />
                    </svg>
                  </div>
                  <span className="font-label-caps text-label-caps px-2 py-0.5 rounded bg-[#0C2B1D] text-primary font-extrabold">
                    T20 CLASSIC
                  </span>
                </div>
                <h3 className="font-headline-md text-title-md text-text-chalk uppercase group-hover:text-primary transition-colors mb-1">
                  WORLD CUP T20
                </h3>
                <span className="font-scoreboard-md text-scoreboard-md text-primary block mb-space-sm">
                  20 OVERS <span className="font-label-caps text-label-caps text-text-subdued font-normal">/ INNINGS</span>
                </span>
                <p className="font-body-sm text-body-sm text-text-slate mb-space-md line-clamp-2">
                  The global gold standard. Strategic middle-over anchor shifts and electric death overs simulation.
                </p>
                <div className="space-y-1.5 bg-surface-recessed p-space-sm rounded-lg mb-space-md">
                  <div className="flex justify-between font-label-caps text-label-caps">
                    <span className="text-text-subdued">PACE OF PLAY</span>
                    <span className="text-primary font-bold">DYNAMIC STRATEGY</span>
                  </div>
                  <div className="flex justify-between font-label-caps text-label-caps">
                    <span className="text-text-subdued">POWERPLAY</span>
                    <span className="text-text-chalk">6 OVERS</span>
                  </div>
                  <div className="flex justify-between font-label-caps text-label-caps">
                    <span className="text-text-subdued">MAX PER BOWLER</span>
                    <span className="text-text-chalk">4 OVERS</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleStartFormat('T20')}
                className="w-full py-2 bg-primary text-on-primary font-label-caps text-label-caps uppercase tracking-wider rounded font-bold shadow-[0_4px_12px_rgba(120,220,119,0.25)] hover:shadow-[0_4px_16px_rgba(120,220,119,0.4)] transition-all flex items-center justify-center gap-1 cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                <span>START T20</span>
              </button>
            </div>
          )}

          {/* Format 3: ODI CHAMPIONSHIP */}
          {(formatFilter === 'all' || formatFilter === 'white') && (
            <div className="group relative bg-surface-card hover:bg-surface-elevated rounded-xl p-space-md flex flex-col justify-between transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-1 overflow-hidden border border-border-hairline">
              <div className="h-1 w-full bg-gradient-to-r from-telemetry-blue to-sky-300 rounded-full mb-space-md" />
              <div>
                <div className="flex items-center justify-between mb-space-sm">
                  <div className="w-10 h-10 rounded-full bg-[#0E2342] flex items-center justify-center shadow-inner" title="Two White Balls">
                    <svg className="w-6 h-6 text-telemetry-blue" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="9" cy="12" r="7" />
                      <circle cx="15" cy="12" r="7" strokeDasharray="2 2" />
                    </svg>
                  </div>
                  <span className="font-label-caps text-label-caps px-2 py-0.5 rounded bg-[#0E2342] text-telemetry-blue font-extrabold">
                    ODI SHIELD
                  </span>
                </div>
                <h3 className="font-headline-md text-title-md text-text-chalk uppercase group-hover:text-telemetry-blue transition-colors mb-1">
                  CHAMPIONSHIP
                </h3>
                <span className="font-scoreboard-md text-scoreboard-md text-telemetry-blue block mb-space-sm">
                  50 OVERS <span className="font-label-caps text-label-caps text-text-subdued font-normal">/ INNINGS</span>
                </span>
                <p className="font-body-sm text-body-sm text-text-slate mb-space-md line-clamp-2">
                  The tactical craft. Strike rotation, 3-phase field restrictions, and building immense 300+ totals.
                </p>
                <div className="space-y-1.5 bg-surface-recessed p-space-sm rounded-lg mb-space-md">
                  <div className="flex justify-between font-label-caps text-label-caps">
                    <span className="text-text-subdued">PACE OF PLAY</span>
                    <span className="text-telemetry-blue font-bold">TACTICAL CRAFT</span>
                  </div>
                  <div className="flex justify-between font-label-caps text-label-caps">
                    <span className="text-text-subdued">POWERPLAY</span>
                    <span className="text-text-chalk">10 + 30 + 10 OVERS</span>
                  </div>
                  <div className="flex justify-between font-label-caps text-label-caps">
                    <span className="text-text-subdued">MAX PER BOWLER</span>
                    <span className="text-text-chalk">10 OVERS</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleStartFormat('ODI')}
                className="w-full py-2 bg-surface-container group-hover:bg-telemetry-blue group-hover:text-surface-container-lowest text-text-chalk font-label-caps text-label-caps uppercase tracking-wider rounded font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                <span>START ODI</span>
              </button>
            </div>
          )}

          {/* Format 4: TEST RED BALL */}
          {(formatFilter === 'all' || formatFilter === 'red') && (
            <div className="group relative bg-surface-card hover:bg-surface-elevated rounded-xl p-space-md flex flex-col justify-between transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-1 overflow-hidden border border-border-hairline">
              <div className="h-1 w-full bg-gradient-to-r from-wicket-red to-error rounded-full mb-space-md" />
              <div>
                <div className="flex items-center justify-between mb-space-sm">
                  <div className="w-10 h-10 rounded-full bg-[#2E0F0F] flex items-center justify-center shadow-inner" title="Red Leather Dukes Ball">
                    <svg className="w-6 h-6 text-wicket-red" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" />
                      <path d="M12 3v18" stroke="currentColor" strokeWidth="2.5" />
                      <path d="M9 7l6 2M9 11l6 2M9 15l6 2" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </div>
                  <span className="font-label-caps text-label-caps px-2 py-0.5 rounded bg-[#2E0F0F] text-wicket-red font-extrabold">
                    RED BALL
                  </span>
                </div>
                <h3 className="font-headline-md text-title-md text-text-chalk uppercase group-hover:text-wicket-red transition-colors mb-1">
                  TEST RED BALL
                </h3>
                <span className="font-scoreboard-md text-scoreboard-md text-wicket-red block mb-space-sm">
                  5 DAYS <span className="font-label-caps text-label-caps text-text-subdued font-normal">/ 2 INNINGS EA</span>
                </span>
                <p className="font-body-sm text-body-sm text-text-slate mb-space-md line-clamp-2">
                  The purest crucible. Conventional &amp; reverse swing, crumbling pitch cracks, and slips cordon catches.
                </p>
                <div className="space-y-1.5 bg-surface-recessed p-space-sm rounded-lg mb-space-md">
                  <div className="flex justify-between font-label-caps text-label-caps">
                    <span className="text-text-subdued">PACE OF PLAY</span>
                    <span className="text-wicket-red font-bold">ENDURANCE WAR</span>
                  </div>
                  <div className="flex justify-between font-label-caps text-label-caps">
                    <span className="text-text-subdued">BALL DECAY</span>
                    <span className="text-text-chalk">80 OVERS RE-BALL</span>
                  </div>
                  <div className="flex justify-between font-label-caps text-label-caps">
                    <span className="text-text-subdued">SESSIONS</span>
                    <span className="text-text-chalk">3 PER DAY (90 OV)</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleStartFormat('TEST_RED_BALL')}
                className="w-full py-2 bg-surface-container group-hover:bg-wicket-red group-hover:text-text-chalk text-text-chalk font-label-caps text-label-caps uppercase tracking-wider rounded font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                <span>START TEST</span>
              </button>
            </div>
          )}

          {/* Format 5: TEST PINK BALL */}
          {(formatFilter === 'all' || formatFilter === 'red') && (
            <div className="group relative bg-surface-card hover:bg-surface-elevated rounded-xl p-space-md flex flex-col justify-between transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-1 overflow-hidden border border-border-hairline">
              <div className="h-1 w-full bg-gradient-to-r from-test-pink to-rose-400 rounded-full mb-space-md" />
              <div>
                <div className="flex items-center justify-between mb-space-sm">
                  <div className="w-10 h-10 rounded-full bg-[#33101E] flex items-center justify-center shadow-inner" title="Pink Kookaburra Seam">
                    <svg className="w-6 h-6 text-test-pink" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 3v18" stroke="currentColor" strokeWidth="2.5" />
                      <path d="M8 8l8 8M16 8l-8 8" stroke="currentColor" strokeWidth="1.2" />
                    </svg>
                  </div>
                  <span className="font-label-caps text-label-caps px-2 py-0.5 rounded bg-[#33101E] text-test-pink font-extrabold">
                    DAY / NIGHT
                  </span>
                </div>
                <h3 className="font-headline-md text-title-md text-text-chalk uppercase group-hover:text-test-pink transition-colors mb-1">
                  PINK BALL TEST
                </h3>
                <span className="font-scoreboard-md text-scoreboard-md text-test-pink block mb-space-sm">
                  FLOODLIGHTS <span className="font-label-caps text-label-caps text-text-subdued font-normal">/ TWILIGHT</span>
                </span>
                <p className="font-body-sm text-body-sm text-text-slate mb-space-md line-clamp-2">
                  Dramatic dusk twilight swing acceleration. Heavy evening dew factor meets extra lacquered pink seam.
                </p>
                <div className="space-y-1.5 bg-surface-recessed p-space-sm rounded-lg mb-space-md">
                  <div className="flex justify-between font-label-caps text-label-caps">
                    <span className="text-text-subdued">PACE OF PLAY</span>
                    <span className="text-test-pink font-bold">ATMOSPHERIC DRAMA</span>
                  </div>
                  <div className="flex justify-between font-label-caps text-label-caps">
                    <span className="text-text-subdued">TWILIGHT HOUR</span>
                    <span className="text-text-chalk">SWING +35%</span>
                  </div>
                  <div className="flex justify-between font-label-caps text-label-caps">
                    <span className="text-text-subdued">DEW FACTOR</span>
                    <span className="text-text-chalk">GRIP -20% AT NIGHT</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleStartFormat('TEST_PINK_BALL')}
                className="w-full py-2 bg-surface-container group-hover:bg-test-pink group-hover:text-surface-container-lowest text-text-chalk font-label-caps text-label-caps uppercase tracking-wider rounded font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                <span>START PINK TEST</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Section 4: Game Modes & Quick Challenges Bento */}
      <section className="w-full max-w-[1440px] mx-auto px-4 md:px-margin-desktop py-space-lg z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
          {/* Left Bento: Quick Scenario Challenge */}
          <div className="lg:col-span-7 bg-surface-card rounded-xl p-space-lg relative overflow-hidden shadow-md flex flex-col justify-between border border-border-hairline">
            <div className="absolute -right-8 -bottom-8 w-60 h-60 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div>
              <div className="flex items-center justify-between mb-space-md">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[18px] text-tertiary">bolt</span>
                  <span className="font-label-caps text-label-caps text-tertiary uppercase tracking-wider font-extrabold">
                    HISTORIC CLUTCH SCENARIO
                  </span>
                  <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/30 ml-2">
                    Coming Soon
                  </span>
                </div>
                <span className="font-label-caps text-label-caps px-2 py-0.5 rounded bg-surface-container text-text-slate">
                  SCENARIO ROADMAP
                </span>
              </div>
              <h3 className="font-headline-lg text-headline-lg text-text-chalk uppercase tracking-tight mb-space-xs">
                THE GABBA HEIST • 2021 TRIBUTE
              </h3>
              <p className="font-body-base text-body-base text-text-slate mb-space-md max-w-xl">
                Day 5, Final Session: Australia have set 328 to win. You are on 296/7 with Rishabh Pant batting on 78*. Score 33 runs in the final 30 balls with 3 wickets remaining.
              </p>
              <div className="grid grid-cols-3 gap-space-sm bg-surface-recessed p-space-md rounded-lg mb-space-lg max-w-lg">
                <div className="flex flex-col">
                  <span className="font-label-caps text-label-caps text-text-subdued uppercase">REQUIRED RUN RATE</span>
                  <span className="font-scoreboard-md text-scoreboard-md text-warning-amber">6.60 RPO</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-caps text-label-caps text-text-subdued uppercase">WICKETS REMAINING</span>
                  <span className="font-scoreboard-md text-scoreboard-md text-wicket-red">3 WICKETS</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-caps text-label-caps text-text-subdued uppercase">REWARD XP</span>
                  <span className="font-scoreboard-md text-scoreboard-md text-primary">+2,500 XP</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-space-md">
              <button
                onClick={() => setSelectedUpcomingFeature(FEATURE_REGISTRY['gabba-heist-scenario'])}
                className="px-space-lg py-3 bg-secondary-container hover:bg-secondary-fixed text-on-secondary-container font-headline-md text-body-bold uppercase tracking-wider rounded transition-all flex items-center gap-space-xs font-bold shadow-md cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">info</span>
                <span>SCENARIO ROADMAP</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
                  COMING SOON
                </span>
              </button>
              <span className="font-label-caps text-label-caps text-text-subdued">HISTORIC INJECTION IN DEVELOPMENT</span>
            </div>
          </div>

          {/* Right Bento: Live Pitch Weather & AI Conditions */}
          <div className="lg:col-span-5 bg-surface-card rounded-xl p-space-lg relative overflow-hidden shadow-md flex flex-col justify-between border border-border-hairline">
            <div>
              <div className="flex items-center justify-between mb-space-md">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[18px] text-telemetry-blue">thermostat</span>
                  <span className="font-label-caps text-label-caps text-telemetry-blue uppercase tracking-wider font-extrabold">
                    LIVE TELEMETRY ENGINE
                  </span>
                </div>
                <span className="font-label-caps text-label-caps px-2 py-0.5 rounded bg-surface-container text-primary font-mono">
                  SIM ENGINE v2.4
                </span>
              </div>
              <h4 className="font-headline-md text-title-md text-text-chalk uppercase mb-space-xs">
                PITCH COMPOSITION MATRIX
              </h4>
              <p className="font-body-sm text-body-sm text-text-slate mb-space-md">
                Real-time dynamic degradation calculations based on over count.
              </p>
              {/* Radar Pitch Matrix */}
              <div className="bg-surface-recessed p-space-md rounded-lg mb-space-md flex items-center justify-between">
                <div className="space-y-2 flex-1 pr-space-md">
                  <div>
                    <div className="flex justify-between font-label-caps text-label-caps mb-1">
                      <span className="text-text-slate">SEAM &amp; MOVEMENT</span>
                      <span className="text-primary font-mono">78%</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: '78%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between font-label-caps text-label-caps mb-1">
                      <span className="text-text-slate">BOUNCE &amp; CARRY</span>
                      <span className="text-telemetry-blue font-mono">84%</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-telemetry-blue" style={{ width: '84%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between font-label-caps text-label-caps mb-1">
                      <span className="text-text-slate">SPIN &amp; TURN RATE</span>
                      <span className="text-tertiary font-mono">42%</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-tertiary" style={{ width: '42%' }} />
                    </div>
                  </div>
                </div>
                {/* Mini Graphic Pitch Visualizer */}
                <div className="w-24 h-24 rounded-lg bg-surface-container flex flex-col items-center justify-center p-2 text-center flex-shrink-0 shadow-inner">
                  <span className="material-symbols-outlined text-[30px] text-secondary">grass</span>
                  <span className="font-label-caps text-[9px] text-text-slate uppercase mt-1 leading-tight">
                    GREEN TOP DENSE GRASS
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-body-sm pt-space-xs text-text-subdued">
              <span className="font-label-caps text-label-caps">OPTIMAL TOSS STRATEGY:</span>
              <span className="font-label-caps text-label-caps text-secondary-fixed font-bold">
                BOWL FIRST (OVERCAST)
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Upcoming Features & Roadmap (Phase 9.3.3) */}
      <UpcomingUpdatesSection />

      {/* Section 6: Offline Engine Status Bar & Quick Stats Strip */}
      <section className="w-full bg-surface-container-lowest mt-space-xl py-space-md z-10 border-t border-border-hairline">
        <div className="max-w-[1440px] mx-auto px-4 md:px-margin-desktop flex flex-col md:flex-row items-center justify-between gap-space-md">
          {/* Engine Status */}
          <div className="flex flex-wrap items-center gap-space-md">
            <div className="flex items-center gap-space-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-primary" />
              <span className="font-label-caps text-label-caps text-text-chalk uppercase tracking-widest font-extrabold">
                STANDALONE SIMULATION READY
              </span>
            </div>
            <span className="text-border-hairline hidden sm:inline">•</span>
            <span className="font-label-caps text-label-caps text-text-slate">OFFLINE ENGINE v2.4 ACTIVE</span>
            <span className="text-border-hairline hidden sm:inline">•</span>
            <span className="font-label-caps text-label-caps text-secondary-fixed">
              1,144 INTERNATIONAL PLAYERS LOADED
            </span>
          </div>
          {/* Quick Controls */}
          <div className="flex items-center gap-space-lg">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-[16px] text-primary">battery_charging_full</span>
              <span className="font-label-caps text-label-caps text-text-slate">BATTERY EFFICIENT SIM</span>
            </div>
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-[16px] text-telemetry-blue">cloud_off</span>
              <span className="font-label-caps text-label-caps text-text-slate">NO INTERNET REQUIRED</span>
            </div>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('open-cricket-welcome-modal'));
                }
              }}
              className="font-label-caps text-label-caps text-tertiary hover:underline uppercase tracking-wider font-bold cursor-pointer"
              type="button"
            >
              MCC LAWS & RULES
            </button>
          </div>
        </div>
      </section>

      {/* Feature Information Modal */}
      <UpcomingFeatureModal
        feature={selectedUpcomingFeature}
        isOpen={!!selectedUpcomingFeature}
        onClose={() => setSelectedUpcomingFeature(null)}
      />
    </div>
  );
}
