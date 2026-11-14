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
    <div className="flex flex-col w-full relative overflow-hidden select-none bg-warm-paper">
      {/* Hero Panoramic Sports Section */}
      <section className="relative w-full z-10 px-4 md:px-margin-desktop py-space-xl max-w-[1440px] mx-auto flex flex-col justify-between min-h-[580px] lg:min-h-[620px] rounded-2xl overflow-hidden mt-space-sm shadow-xl bg-[#2D545E] border border-[#12343B] text-[#FBF8F2]">
        {/* Stadium Background Visual */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-luminosity scale-105 pointer-events-none"
          style={{ backgroundImage: `url('/assets/stitch/stadium-hero.png')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#12343B]/95 via-[#2D545E]/80 to-[#2D545E]/40 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#12343B]/90 via-[#2D545E]/60 to-transparent pointer-events-none" />

        {/* Stadium Live Telemetry Overline Tag */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-space-sm w-full">
          <div className="flex items-center gap-space-xs bg-[#12343B]/90 backdrop-blur-md px-space-md py-space-xs rounded-full border border-[#C89666]/30 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#E1B382] animate-ping" />
            <span className="w-2 h-2 rounded-full bg-[#E1B382] -ml-2.5" />
            <span className="font-label-caps text-label-caps text-[#E1B382] tracking-widest uppercase font-bold">
              SEASON 2026 • PAVILION ACCESS UNLOCKED
            </span>
            <span className="text-[#D8C9B5] font-label-caps text-label-caps">/</span>
            <span className="font-label-caps text-label-caps text-[#FBF8F2]">
              HYDERABAD COLOSSEUM
            </span>
          </div>

          {/* Quick Match Telemetry Pill */}
          <div className="hidden md:flex items-center gap-space-md bg-[#12343B]/80 backdrop-blur-md px-space-md py-space-xs rounded-lg border border-[#2D545E] shadow-sm">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-[16px] text-[#E1B382]">wb_sunny</span>
              <span className="font-label-caps text-label-caps text-[#FBF8F2]">DAY-NIGHT DRY CRACK</span>
            </div>
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-[16px] text-[#D8C9B5]">air</span>
              <span className="font-label-caps text-label-caps text-[#D8C9B5]">14 KM/H CROSSWIND</span>
            </div>
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-[16px] text-[#E1B382]">speed</span>
              <span className="font-label-caps text-label-caps text-[#E1B382]">FAST OUTFIELD (1.2x)</span>
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
            <span className="px-space-sm py-1 rounded-full bg-[#12343B] font-label-caps text-label-caps text-[#E1B382] uppercase tracking-widest shadow-sm border border-[#C89666]/30 flex items-center gap-1.5 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E1B382] animate-pulse" />
              AUTHENTIC MATCH SIMULATOR
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#C89666] hidden sm:inline-block" />
            <span className="font-label-caps text-label-caps text-[#D8C9B5] uppercase tracking-wider hidden sm:inline-block font-semibold">
              BROADCAST SCOREBOARD
            </span>
          </div>

          <h1 className="font-editorial-hero text-display-lg text-[#FBF8F2] tracking-tight leading-tight">
            YOUR TEAM.<br />
            <span className="text-[#E1B382] italic font-normal">
              YOUR ERA.
            </span>
            <br />
            YOUR GAME.
          </h1>

          <p className="font-sans text-title-md text-[#D8C9B5] max-w-2xl font-normal leading-relaxed">
            Build your ultimate cricket XI, set dynamic field placements, and chase glory across iconic stadiums in fast, realistic matches.
          </p>

          {/* Primary Action CTA Cluster */}
          <div className="flex flex-wrap items-center gap-space-md pt-space-sm">
            {/* Main 'PLAY CRICKET' CTA */}
            <Link
              href="/match"
              className="group relative px-space-xl py-4 bg-[#E1B382] hover:bg-[#ebd0b0] text-[#12343B] font-headline-md text-title-md rounded-lg transition-colors flex items-center gap-space-sm shadow-md font-extrabold"
              id="btn-play-cricket"
            >
              <span className="material-symbols-outlined text-[26px] group-hover:rotate-45 transition-transform duration-300">
                sports_cricket
              </span>
              <span className="tracking-wider">PLAY CRICKET</span>
              <span className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-1">
                arrow_forward
              </span>
            </Link>

            {/* Secondary 'BUILD YOUR DREAM XI' CTA */}
            <Link
              href="/dream-teams"
              className="group px-space-lg py-4 bg-[#12343B] hover:bg-[#153C44] text-[#FBF8F2] border border-[#C89666]/40 font-headline-md text-title-md uppercase tracking-wider rounded-lg shadow-sm transition-all flex items-center gap-space-sm"
              id="btn-build-xi"
            >
              <span className="material-symbols-outlined text-[22px] text-[#E1B382] group-hover:scale-110 transition-transform">
                shield_person
              </span>
              <span className="font-bold">BUILD DREAM XI</span>
              <span className="font-label-caps text-label-caps px-2 py-0.5 rounded bg-[#2D545E] text-[#E1B382] border border-[#C89666]/30">
                11/11 READY
              </span>
            </Link>

            {/* Tertiary Quick Resume Action */}
            <Link
              href="/match?resume=true"
              className="group px-space-md py-4 bg-[#2D545E]/80 hover:bg-[#12343B] text-[#D8C9B5] hover:text-[#FBF8F2] border border-[#C89666]/30 font-label-caps text-label-caps uppercase tracking-widest rounded-lg transition-all flex items-center gap-space-xs"
              id="btn-quick-resume"
            >
              <span className="material-symbols-outlined text-[18px] text-[#E1B382]">
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
        <div className="relative z-10 w-full pt-space-md flex flex-wrap items-center justify-between gap-space-md border-t border-[#12343B]/60">
          <div className="flex items-center gap-space-xl">
            <div className="flex flex-col">
              <span className="font-label-caps text-label-caps text-[#D8C9B5] uppercase">RECORDED CAREER RUNS</span>
              <span className="font-scoreboard-md text-scoreboard-md text-[#E1B382]">
                {careerStats.totalRuns.toLocaleString()}{' '}
                <span className="font-label-caps text-label-caps text-[#FBF8F2]">
                  {careerStats.totalMatches > 0 ? `(${careerStats.totalMatches} MATCHES)` : ''}
                </span>
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-caps text-label-caps text-[#D8C9B5] uppercase">WIN RATIO</span>
              <span className="font-scoreboard-md text-scoreboard-md text-[#FBF8F2]">
                {careerStats.winPercentage}%{' '}
                <span className="font-label-caps text-label-caps text-[#D8C9B5]">
                  ({careerStats.totalWins}/{careerStats.totalMatches} WINS)
                </span>
              </span>
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="font-label-caps text-label-caps text-[#D8C9B5] uppercase">ROSTER VAULT</span>
              <span className="font-scoreboard-md text-scoreboard-md text-[#E1B382]">
                1,144 players
              </span>
            </div>
          </div>
          <div className="flex items-center gap-space-xs text-[#D8C9B5]">
            <span className="material-symbols-outlined text-[18px] text-[#E1B382]">verified</span>
            <span className="font-label-caps text-label-caps text-[#FBF8F2] uppercase tracking-wider font-semibold">
              Cricket Dream XI
            </span>
          </div>
        </div>
      </section>

      {/* Section 2: Quick Access Operations (3 Crisp Editorial Cards) */}
      <section className="w-full max-w-[1440px] mx-auto px-4 md:px-margin-desktop py-space-xl z-10 bg-warm-paper">
        <div className="flex items-end justify-between mb-space-md">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-space-xs">
              <span className="w-2 h-2 rounded-full bg-[#C89666]" />
              <span className="font-label-caps text-label-caps text-[#C89666] uppercase tracking-widest font-bold">
                QUICK ACCESS
              </span>
            </div>
            <h2 className="font-editorial-title text-headline-lg text-[#12343B] tracking-tight">
              Active Squads &amp; Matches
            </h2>
          </div>
          <span className="font-label-caps text-label-caps text-[#687477] uppercase tracking-widest hidden sm:inline-block">
            DIRECT ACCESS
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg">
          {/* Card 1: YOUR DREAM XI */}
          <div className="group relative bg-[#FBF8F2] hover:bg-[#FFFFFF] rounded-xl p-space-lg flex flex-col justify-between transition-all duration-300 shadow-sm hover:shadow-md overflow-hidden border border-[#D8C9B5] hover:border-[#C89666]">
            <div>
              <div className="flex items-center justify-between w-full mb-space-md">
                <span className="font-label-caps text-label-caps px-2.5 py-1 rounded bg-[#2D545E] text-[#FBF8F2] uppercase tracking-wider font-extrabold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">groups</span>
                  YOUR DREAM XI
                </span>
                <span className="font-label-caps text-label-caps text-[#12343B] px-2 py-0.5 rounded bg-[#F5EBDD] border border-[#D8C9B5] flex items-center gap-1 font-bold">
                  <span className="material-symbols-outlined text-[13px] text-[#C89666]">military_tech</span>
                  {savedTeam ? `${savedTeam.synergy}% SYNERGY` : '96% SYNERGY'}
                </span>
              </div>

              <div className="flex items-center gap-space-md mb-space-md">
                <div className="w-14 h-14 rounded-lg bg-[#F5EBDD] border border-[#D8C9B5] flex items-center justify-center relative flex-shrink-0">
                  <span className="material-symbols-outlined text-[32px] text-[#2D545E]">bolt</span>
                  <span className="absolute -top-1.5 -right-1.5 bg-[#E1B382] text-[#12343B] font-label-caps text-[9px] px-1 py-0.2 rounded font-extrabold shadow-sm">
                    C
                  </span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-editorial-title text-title-md text-[#12343B] tracking-tight truncate group-hover:text-[#2D545E] transition-colors">
                    {savedTeam ? savedTeam.name : 'MY DREAM XI'}
                  </span>
                  <span className="font-body-sm text-body-sm text-[#687477]">
                    Captain:{' '}
                    <strong className="text-[#12343B]">
                      {savedTeam ? savedTeam.captainName : 'V. Kohli'} (C)
                    </strong>{' '}
                    • VC:{' '}
                    <strong className="text-[#12343B]">
                      {savedTeam ? savedTeam.vcName : 'J. Bumrah'}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Composition Pill Bar */}
              <div className="bg-[#F5EBDD] p-space-sm rounded-lg mb-space-md flex flex-col gap-1.5 border border-[#D8C9B5]">
                <div className="flex justify-between items-center text-body-sm">
                  <span className="font-label-caps text-label-caps text-[#687477] uppercase">
                    SQUAD ROSTER BALANCE
                  </span>
                  <span className="font-label-caps text-label-caps text-[#2D545E] font-bold">
                    {savedTeam ? `${savedTeam.playerCount} / 11 SELECTED` : '11 / 11 SELECTED'}
                  </span>
                </div>
                {/* Progress Segment Meter */}
                <div className="h-2 w-full bg-[#E1D4C2] rounded-full overflow-hidden flex gap-0.5">
                  <div className="h-full bg-[#2D545E]" style={{ width: '36%' }} title="4 Pure Batsmen" />
                  <div className="h-full bg-[#C89666]" style={{ width: '10%' }} title="1 Wicketkeeper" />
                  <div className="h-full bg-[#E1B382]" style={{ width: '27%' }} title="3 All-Rounders" />
                  <div className="h-full bg-[#12343B]" style={{ width: '27%' }} title="3 Strike Bowlers" />
                </div>
                <div className="flex justify-between font-label-caps text-[10px] text-[#687477] pt-0.5 font-bold">
                  <span className="text-[#2D545E]">4 BAT</span>
                  <span className="text-[#C89666]">1 WK</span>
                  <span className="text-[#8B5F34]">3 AR</span>
                  <span className="text-[#12343B]">3 BOWL</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-space-sm pt-space-xs">
              <Link
                href="/dream-teams"
                className="flex-1 py-2.5 px-space-md bg-[#2D545E] hover:bg-[#12343B] text-[#FBF8F2] font-label-caps text-label-caps uppercase tracking-wider rounded transition-colors flex items-center justify-center gap-space-xs font-bold"
              >
                <span className="material-symbols-outlined text-[16px]">edit_note</span>
                <span>EDIT LINEUP</span>
              </Link>
              <Link
                href="/match"
                className="py-2.5 px-space-sm bg-[#F5EBDD] hover:bg-[#E1B382] text-[#12343B] border border-[#D8C9B5] rounded transition-colors flex items-center justify-center"
                title="Play with Squad"
              >
                <span className="material-symbols-outlined text-[18px]">play_arrow</span>
              </Link>
            </div>
          </div>

          {/* Card 2: CONTINUE MATCH (Active Match Live Node) */}
          <div className="group relative bg-[#FBF8F2] hover:bg-[#FFFFFF] rounded-xl p-space-lg flex flex-col justify-between transition-all duration-300 shadow-sm hover:shadow-md overflow-hidden border border-[#D8C9B5] hover:border-[#C89666]">
            <div>
              <div className="flex items-center justify-between w-full mb-space-md">
                <span className={`font-label-caps text-label-caps px-2.5 py-1 rounded uppercase tracking-wider font-extrabold flex items-center gap-1.5 ${
                  activeMatch ? 'bg-[#FCE8E8] text-[#B33232] border border-[#B33232]/30' : 'bg-[#F5EBDD] text-[#687477] border border-[#D8C9B5]'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${activeMatch ? 'bg-[#B33232] animate-pulse' : 'bg-[#687477]'}`} />
                  {activeMatch ? 'MATCH IN PROGRESS' : 'READY TO PLAY'}
                </span>
                <span className="font-label-caps text-label-caps text-[#12343B] px-2 py-0.5 rounded bg-[#F5EBDD] border border-[#D8C9B5] font-mono">
                  {activeMatch ? `${activeMatch.format} MATCH` : 'QUICK SIMULATOR'}
                </span>
              </div>

              {/* Fixture Header */}
              <div className="flex items-center justify-between mb-space-sm">
                <div className="flex items-center gap-space-xs truncate">
                  <span className="font-headline-md text-title-md text-[#12343B] font-extrabold truncate max-w-[130px]">
                    {activeMatch ? activeMatch.userTeamName : (savedTeam?.name || 'YOUR XI')}
                  </span>
                  <span className="font-label-caps text-label-caps text-[#687477] font-bold">vs</span>
                  <span className="font-headline-md text-title-md text-[#243238] font-extrabold truncate max-w-[130px]">
                    {activeMatch ? activeMatch.aiTeamName : 'AI WORLD XI'}
                  </span>
                </div>
                <span className="font-label-caps text-label-caps text-[#2D545E] bg-[#F5EBDD] border border-[#D8C9B5] px-2 py-0.5 rounded shrink-0 font-bold">
                  {activeMatch?.isChasing ? 'CHASING TARGET' : activeMatch ? '1ST INNINGS' : 'NEW DERBY'}
                </span>
              </div>

              {/* Live Scoreboard Sub-Widget */}
              <div className="bg-[#F5EBDD] p-space-md rounded-lg mb-space-md flex flex-col gap-space-xs border border-[#D8C9B5]">
                <div className="flex items-baseline justify-between">
                  <span className="font-scoreboard-xl text-scoreboard-xl text-[#12343B] leading-none tracking-tight">
                    {activeMatch ? activeMatch.scoreStr : '0/0'}
                  </span>
                  <span className="font-scoreboard-md text-scoreboard-md text-[#243238]">
                    {activeMatch ? activeMatch.oversStr : '0.0'}{' '}
                    <span className="font-label-caps text-label-caps text-[#687477] font-normal">
                      / {activeMatch ? (activeMatch.format === 'T10' ? '10' : activeMatch.format === 'ODI' ? '50' : '20') : '20'} OV
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-body-sm text-[#687477] pt-1">
                  <span className="font-label-caps text-label-caps text-[#C89666] font-bold">
                    {activeMatch?.targetStr || 'STANDARD MATCHPLAY'}
                  </span>
                  <span className="font-label-caps text-label-caps text-[#2D545E] font-bold">
                    {activeMatch ? 'BALLISTICS READY' : 'CLICK TO LAUNCH'}
                  </span>
                </div>
                {/* Over Ball Feed */}
                <div className="flex items-center gap-1.5 pt-2">
                  <span className="font-label-caps text-[10px] text-[#687477] uppercase font-bold">THIS OVER:</span>
                  {(activeMatch?.ballsThisOver || ['•', '•', '•', '•', '•', '•']).map((b, idx) => (
                    <span
                      key={idx}
                      className={`w-5 h-5 rounded-full flex items-center justify-center font-label-caps text-[10px] font-bold ${
                        b === 'W'
                          ? 'bg-[#B33232] text-white font-black'
                          : b === '6'
                          ? 'bg-[#E1B382] text-[#12343B] font-black'
                          : b === '4'
                          ? 'bg-[#2D545E] text-[#FBF8F2] font-bold'
                          : b === '•' || b === '●'
                          ? 'bg-[#EDE3D2] text-[#687477]'
                          : 'bg-[#FBF8F2] text-[#12343B] border border-[#D8C9B5]'
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
              className="w-full py-2.5 px-space-md bg-[#2D545E] hover:bg-[#12343B] text-[#FBF8F2] font-headline-md text-body-bold uppercase tracking-wider rounded transition-all flex items-center justify-center gap-space-xs font-bold shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px] text-[#E1B382]">sports</span>
              <span>{activeMatch ? 'RESUME MATCH' : 'START LIVE MATCH'}</span>
            </Link>
          </div>

          {/* Card 3: RECENT MATCH (Victory Record) */}
          <div className="group relative bg-[#FBF8F2] hover:bg-[#FFFFFF] rounded-xl p-space-lg flex flex-col justify-between transition-all duration-300 shadow-sm hover:shadow-md overflow-hidden border border-[#D8C9B5] hover:border-[#C89666]">
            <div>
              <div className="flex items-center justify-between w-full mb-space-md">
                <span className="font-label-caps text-label-caps px-2.5 py-1 rounded bg-[#2D545E] text-[#E1B382] uppercase tracking-wider font-extrabold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">trophy</span>
                  {recentCompletedMatch ? 'COMPLETED MATCH' : 'MATCH VAULT'}
                </span>
                <span className="font-label-caps text-label-caps text-[#687477] px-2 py-0.5 rounded bg-[#F5EBDD] border border-[#D8C9B5] font-mono">
                  {recentCompletedMatch ? `${recentCompletedMatch.format} DERBY` : 'ARCHIVE READY'}
                </span>
              </div>
              <div className="flex flex-col mb-space-sm">
                <span className="font-label-caps text-label-caps text-[#C89666] uppercase tracking-widest font-extrabold mb-1">
                  {recentCompletedMatch ? recentCompletedMatch.resultSummary : 'NO PAST MATCHES YET'}
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-headline-md text-title-md text-[#12343B] truncate max-w-[170px] font-bold">
                    {recentCompletedMatch ? recentCompletedMatch.team1Name : 'YOUR SQUAD'}
                  </span>
                  <span className="font-scoreboard-md text-scoreboard-md text-[#12343B] font-bold">
                    {recentCompletedMatch ? recentCompletedMatch.team1Score : '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#687477]">
                  <span className="font-headline-md text-title-md text-[#243238] truncate max-w-[170px]">
                    {recentCompletedMatch ? recentCompletedMatch.team2Name : 'OPPONENT'}
                  </span>
                  <span className="font-scoreboard-md text-scoreboard-md text-[#243238]">
                    {recentCompletedMatch ? recentCompletedMatch.team2Score : '-'}
                  </span>
                </div>
              </div>

              {/* Player of the Match Spotlight */}
              {recentCompletedMatch?.potm ? (
                <div className="bg-[#F5EBDD] p-space-sm rounded-lg mb-space-md flex items-center gap-space-sm border border-[#D8C9B5]">
                  <div className="w-10 h-10 rounded-full bg-[#2D545E] flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[20px] text-[#E1B382]">star</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-label-caps text-[10px] text-[#C89666] uppercase tracking-wider font-bold">
                        PLAYER OF MATCH
                      </span>
                      <span className="w-1 h-1 rounded-full bg-[#687477]" />
                      <span className="font-label-caps text-[10px] text-[#687477]">
                        {recentCompletedMatch.potm.team}
                      </span>
                    </div>
                    <span className="font-body-bold text-body-bold text-[#12343B] truncate">
                      {recentCompletedMatch.potm.name}
                      {recentCompletedMatch.potm.summary ? (
                        <span className="font-body-sm text-[#687477] font-normal ml-1">
                          • {recentCompletedMatch.potm.summary}
                        </span>
                      ) : null}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-[#F5EBDD] p-space-sm rounded-lg mb-space-md flex items-center gap-space-sm border border-[#D8C9B5]">
                  <div className="w-10 h-10 rounded-full bg-[#2D545E] flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[20px] text-[#E1B382]">sports_cricket</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="text-[10px] font-mono text-[#2D545E] uppercase font-bold tracking-wider">
                      HISTORICAL REPLAYS
                    </div>
                    <span className="font-body-sm text-[#687477]">
                      Matches played will be archived with full telemetry &amp; POTM awards.
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-space-sm">
              <Link
                href="/my-cricket"
                className="flex-1 py-2.5 px-space-md bg-[#2D545E] hover:bg-[#12343B] text-[#FBF8F2] font-label-caps text-label-caps uppercase tracking-wider rounded transition-colors flex items-center justify-center gap-space-xs font-bold"
              >
                <span className="material-symbols-outlined text-[16px]">analytics</span>
                <span>{recentCompletedMatch ? 'FULL SCORECARD' : 'VIEW MATCH HISTORY'}</span>
              </Link>
              <Link
                href="/my-cricket"
                className="py-2.5 px-space-sm bg-[#F5EBDD] hover:bg-[#E1B382] text-[#12343B] border border-[#D8C9B5] rounded transition-colors"
                title="Match History & Replays"
              >
                <span className="material-symbols-outlined text-[18px]">replay</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Quick Play Format Carousel / Selector */}
      <section className="w-full max-w-[1440px] mx-auto px-4 md:px-margin-desktop py-space-xl z-10 bg-warm-paper">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-space-sm mb-space-lg">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-space-xs">
              <span className="w-2 h-2 rounded-full bg-[#C89666]" />
              <span className="font-label-caps text-label-caps text-[#C89666] uppercase tracking-widest font-bold">
                TACTICAL ARENA
              </span>
            </div>
            <h2 className="font-editorial-title text-headline-lg text-[#12343B] tracking-tight">
              Select Match Format
            </h2>
            <p className="font-body-base text-body-base text-[#687477]">
              From frantic 10-over blitzes to grueling 5-day red ball attrition.
            </p>
          </div>

          {/* Quick Category Toggle Pills */}
          <div className="flex items-center p-1 bg-[#FBF8F2] rounded-lg gap-1 border border-[#D8C9B5]">
            <button
              onClick={() => setFormatFilter('all')}
              className={`px-space-md py-1.5 rounded font-label-caps text-label-caps uppercase font-bold transition-all cursor-pointer ${
                formatFilter === 'all' ? 'text-[#E1B382] bg-[#2D545E] shadow-sm' : 'text-[#687477] hover:text-[#12343B]'
              }`}
              type="button"
            >
              ALL FORMATS
            </button>
            <button
              onClick={() => setFormatFilter('white')}
              className={`px-space-md py-1.5 rounded font-label-caps text-label-caps uppercase font-bold transition-all cursor-pointer ${
                formatFilter === 'white' ? 'text-[#E1B382] bg-[#2D545E] shadow-sm' : 'text-[#687477] hover:text-[#12343B]'
              }`}
              type="button"
            >
              LIMITED OVERS
            </button>
            <button
              onClick={() => setFormatFilter('red')}
              className={`px-space-md py-1.5 rounded font-label-caps text-label-caps uppercase font-bold transition-all cursor-pointer ${
                formatFilter === 'red' ? 'text-[#E1B382] bg-[#2D545E] shadow-sm' : 'text-[#687477] hover:text-[#12343B]'
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
            <div className="group relative bg-[#FBF8F2] hover:bg-[#FFFFFF] rounded-xl p-space-md flex flex-col justify-between transition-all duration-300 shadow-sm hover:shadow-md overflow-hidden border border-[#D8C9B5] hover:border-[#C89666]">
              <div className="h-1 w-full bg-[#E1B382] rounded-full mb-space-md" />
              <div>
                <div className="flex items-center justify-between mb-space-sm">
                  <div className="w-10 h-10 rounded-full bg-[#2D545E] flex items-center justify-center shadow-inner" title="White Kookaburra Ball">
                    <svg className="w-6 h-6 text-[#E1B382]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 3a9 9 0 0 1 9 9M3 12a9 9 0 0 1 9 9" strokeDasharray="2 2" />
                    </svg>
                  </div>
                  <span className="font-label-caps text-label-caps px-2 py-0.5 rounded bg-[#2D545E] text-[#E1B382] font-extrabold">
                    T10 SLAM
                  </span>
                </div>
                <h3 className="font-editorial-title text-title-md text-[#12343B] group-hover:text-[#2D545E] transition-colors mb-1 font-bold">
                  Super Slam
                </h3>
                <span className="font-scoreboard-md text-scoreboard-md text-[#2D545E] block mb-space-sm">
                  10 OVERS <span className="font-label-caps text-label-caps text-[#687477] font-normal">/ INNINGS</span>
                </span>
                <p className="font-body-sm text-body-sm text-[#687477] mb-space-md line-clamp-2">
                  Non-stop power hitting, maximum field restrictions, and aggressive death deliveries. 15 minute match.
                </p>
                <div className="space-y-1.5 bg-[#F5EBDD] p-space-sm rounded-lg mb-space-md border border-[#D8C9B5]">
                  <div className="flex justify-between font-label-caps text-label-caps">
                    <span className="text-[#687477]">PACE OF PLAY</span>
                    <span className="text-[#2D545E] font-bold">HYPER SPEED</span>
                  </div>
                  <div className="flex justify-between font-label-caps text-label-caps">
                    <span className="text-[#687477]">POWERPLAY</span>
                    <span className="text-[#12343B] font-bold">3 OVERS</span>
                  </div>
                  <div className="flex justify-between font-label-caps text-label-caps">
                    <span className="text-[#687477]">MAX PER BOWLER</span>
                    <span className="text-[#12343B] font-bold">2 OVERS</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleStartFormat('T10')}
                className="w-full py-2 bg-[#2D545E] hover:bg-[#12343B] text-[#FBF8F2] font-label-caps text-label-caps uppercase tracking-wider rounded font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px] text-[#E1B382]">play_arrow</span>
                <span>START T10</span>
              </button>
            </div>
          )}

          {/* Format 2: T20 WORLD CUP */}
          {(formatFilter === 'all' || formatFilter === 'white') && (
            <div className="group relative bg-[#FBF8F2] hover:bg-[#FFFFFF] rounded-xl p-space-md flex flex-col justify-between transition-all duration-300 shadow-sm hover:shadow-md overflow-hidden border border-[#D8C9B5] hover:border-[#C89666]">
              <div className="h-1 w-full bg-[#2D545E] rounded-full mb-space-md" />
              <div>
                <div className="flex items-center justify-between mb-space-sm">
                  <div className="w-10 h-10 rounded-full bg-[#12343B] flex items-center justify-center shadow-inner" title="White Kookaburra Ball">
                    <svg className="w-6 h-6 text-[#E1B382]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M6 6c3 3 3 9 0 12M18 6c-3 3-3 9 0 12" />
                    </svg>
                  </div>
                  <span className="font-label-caps text-label-caps px-2 py-0.5 rounded bg-[#12343B] text-[#E1B382] font-extrabold">
                    T20 CLASSIC
                  </span>
                </div>
                <h3 className="font-editorial-title text-title-md text-[#12343B] group-hover:text-[#2D545E] transition-colors mb-1 font-bold">
                  World Cup T20
                </h3>
                <span className="font-scoreboard-md text-scoreboard-md text-[#2D545E] block mb-space-sm">
                  20 OVERS <span className="font-label-caps text-label-caps text-[#687477] font-normal">/ INNINGS</span>
                </span>
                <p className="font-body-sm text-body-sm text-[#687477] mb-space-md line-clamp-2">
                  The global gold standard. Strategic middle-over anchor shifts and electric death overs simulation.
                </p>
                <div className="space-y-1.5 bg-[#F5EBDD] p-space-sm rounded-lg mb-space-md border border-[#D8C9B5]">
                  <div className="flex justify-between font-label-caps text-label-caps">
                    <span className="text-[#687477]">PACE OF PLAY</span>
                    <span className="text-[#2D545E] font-bold">DYNAMIC STRATEGY</span>
                  </div>
                  <div className="flex justify-between font-label-caps text-label-caps">
                    <span className="text-[#687477]">POWERPLAY</span>
                    <span className="text-[#12343B] font-bold">6 OVERS</span>
                  </div>
                  <div className="flex justify-between font-label-caps text-label-caps">
                    <span className="text-[#687477]">MAX PER BOWLER</span>
                    <span className="text-[#12343B] font-bold">4 OVERS</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleStartFormat('T20')}
                className="w-full py-2 bg-[#E1B382] hover:bg-[#ebd0b0] text-[#12343B] font-label-caps text-label-caps uppercase tracking-wider rounded font-extrabold shadow-sm transition-all flex items-center justify-center gap-1 cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                <span>START T20</span>
              </button>
            </div>
          )}

          {/* Format 3: ODI CHAMPIONSHIP */}
          {(formatFilter === 'all' || formatFilter === 'white') && (
            <div className="group relative bg-[#FBF8F2] hover:bg-[#FFFFFF] rounded-xl p-space-md flex flex-col justify-between transition-all duration-300 shadow-sm hover:shadow-md overflow-hidden border border-[#D8C9B5] hover:border-[#C89666]">
              <div className="h-1 w-full bg-[#C89666] rounded-full mb-space-md" />
              <div>
                <div className="flex items-center justify-between mb-space-sm">
                  <div className="w-10 h-10 rounded-full bg-[#12343B] flex items-center justify-center shadow-inner" title="Two White Balls">
                    <svg className="w-6 h-6 text-[#E1B382]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="9" cy="12" r="7" />
                      <circle cx="15" cy="12" r="7" strokeDasharray="2 2" />
                    </svg>
                  </div>
                  <span className="font-label-caps text-label-caps px-2 py-0.5 rounded bg-[#12343B] text-[#E1B382] font-extrabold">
                    ODI SHIELD
                  </span>
                </div>
                <h3 className="font-editorial-title text-title-md text-[#12343B] group-hover:text-[#2D545E] transition-colors mb-1 font-bold">
                  Championship
                </h3>
                <span className="font-scoreboard-md text-scoreboard-md text-[#2D545E] block mb-space-sm">
                  50 OVERS <span className="font-label-caps text-label-caps text-[#687477] font-normal">/ INNINGS</span>
                </span>
                <p className="font-body-sm text-body-sm text-[#687477] mb-space-md line-clamp-2">
                  The tactical craft. Strike rotation, 3-phase field restrictions, and building immense 300+ totals.
                </p>
                <div className="space-y-1.5 bg-[#F5EBDD] p-space-sm rounded-lg mb-space-md border border-[#D8C9B5]">
                  <div className="flex justify-between font-label-caps text-label-caps">
                    <span className="text-[#687477]">PACE OF PLAY</span>
                    <span className="text-[#2D545E] font-bold">TACTICAL CRAFT</span>
                  </div>
                  <div className="flex justify-between font-label-caps text-label-caps">
                    <span className="text-[#687477]">POWERPLAY</span>
                    <span className="text-[#12343B] font-bold">10 + 30 + 10</span>
                  </div>
                  <div className="flex justify-between font-label-caps text-label-caps">
                    <span className="text-[#687477]">MAX PER BOWLER</span>
                    <span className="text-[#12343B] font-bold">10 OVERS</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleStartFormat('ODI')}
                className="w-full py-2 bg-[#2D545E] hover:bg-[#12343B] text-[#FBF8F2] font-label-caps text-label-caps uppercase tracking-wider rounded font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px] text-[#E1B382]">play_arrow</span>
                <span>START ODI</span>
              </button>
            </div>
          )}

          {/* Format 4: TEST RED BALL */}
          {(formatFilter === 'all' || formatFilter === 'red') && (
            <div className="group relative bg-[#FBF8F2] hover:bg-[#FFFFFF] rounded-xl p-space-md flex flex-col justify-between transition-all duration-300 shadow-sm hover:shadow-md overflow-hidden border border-[#D8C9B5] hover:border-[#C89666]">
              <div className="h-1 w-full bg-[#B33232] rounded-full mb-space-md" />
              <div>
                <div className="flex items-center justify-between mb-space-sm">
                  <div className="w-10 h-10 rounded-full bg-[#12343B] flex items-center justify-center shadow-inner" title="Red Leather Dukes Ball">
                    <svg className="w-6 h-6 text-[#E1B382]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" />
                      <path d="M12 3v18" stroke="currentColor" strokeWidth="2.5" />
                      <path d="M9 7l6 2M9 11l6 2M9 15l6 2" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </div>
                  <span className="font-label-caps text-label-caps px-2 py-0.5 rounded bg-[#12343B] text-[#E1B382] font-extrabold">
                    RED BALL
                  </span>
                </div>
                <h3 className="font-editorial-title text-title-md text-[#12343B] group-hover:text-[#2D545E] transition-colors mb-1 font-bold">
                  Test Red Ball
                </h3>
                <span className="font-scoreboard-md text-scoreboard-md text-[#2D545E] block mb-space-sm">
                  5 DAYS <span className="font-label-caps text-label-caps text-[#687477] font-normal">/ 2 INNINGS</span>
                </span>
                <p className="font-body-sm text-body-sm text-[#687477] mb-space-md line-clamp-2">
                  The purest crucible. Conventional &amp; reverse swing, crumbling pitch cracks, and slips cordon catches.
                </p>
                <div className="space-y-1.5 bg-[#F5EBDD] p-space-sm rounded-lg mb-space-md border border-[#D8C9B5]">
                  <div className="flex justify-between font-label-caps text-label-caps">
                    <span className="text-[#687477]">PACE OF PLAY</span>
                    <span className="text-[#2D545E] font-bold">ENDURANCE WAR</span>
                  </div>
                  <div className="flex justify-between font-label-caps text-label-caps">
                    <span className="text-[#687477]">BALL DECAY</span>
                    <span className="text-[#12343B] font-bold">80 OVERS</span>
                  </div>
                  <div className="flex justify-between font-label-caps text-label-caps">
                    <span className="text-[#687477]">SESSIONS</span>
                    <span className="text-[#12343B] font-bold">3 PER DAY</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleStartFormat('TEST_RED_BALL')}
                className="w-full py-2 bg-[#2D545E] hover:bg-[#12343B] text-[#FBF8F2] font-label-caps text-label-caps uppercase tracking-wider rounded font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px] text-[#E1B382]">play_arrow</span>
                <span>START TEST</span>
              </button>
            </div>
          )}

          {/* Format 5: TEST PINK BALL */}
          {(formatFilter === 'all' || formatFilter === 'red') && (
            <div className="group relative bg-[#FBF8F2] hover:bg-[#FFFFFF] rounded-xl p-space-md flex flex-col justify-between transition-all duration-300 shadow-sm hover:shadow-md overflow-hidden border border-[#D8C9B5] hover:border-[#C89666]">
              <div className="h-1 w-full bg-[#C89666] rounded-full mb-space-md" />
              <div>
                <div className="flex items-center justify-between mb-space-sm">
                  <div className="w-10 h-10 rounded-full bg-[#12343B] flex items-center justify-center shadow-inner" title="Pink Kookaburra Seam">
                    <svg className="w-6 h-6 text-[#E1B382]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 3v18" stroke="currentColor" strokeWidth="2.5" />
                      <path d="M8 8l8 8M16 8l-8 8" stroke="currentColor" strokeWidth="1.2" />
                    </svg>
                  </div>
                  <span className="font-label-caps text-label-caps px-2 py-0.5 rounded bg-[#12343B] text-[#E1B382] font-extrabold">
                    DAY / NIGHT
                  </span>
                </div>
                <h3 className="font-editorial-title text-title-md text-[#12343B] group-hover:text-[#2D545E] transition-colors mb-1 font-bold">
                  Pink Ball Test
                </h3>
                <span className="font-scoreboard-md text-scoreboard-md text-[#2D545E] block mb-space-sm">
                  FLOODLIGHTS <span className="font-label-caps text-label-caps text-[#687477] font-normal">/ TWILIGHT</span>
                </span>
                <p className="font-body-sm text-body-sm text-[#687477] mb-space-md line-clamp-2">
                  Dramatic dusk twilight swing acceleration. Heavy evening dew factor meets extra lacquered pink seam.
                </p>
                <div className="space-y-1.5 bg-[#F5EBDD] p-space-sm rounded-lg mb-space-md border border-[#D8C9B5]">
                  <div className="flex justify-between font-label-caps text-label-caps">
                    <span className="text-[#687477]">PACE OF PLAY</span>
                    <span className="text-[#2D545E] font-bold">TWILIGHT DRAMA</span>
                  </div>
                  <div className="flex justify-between font-label-caps text-label-caps">
                    <span className="text-[#687477]">TWILIGHT HOUR</span>
                    <span className="text-[#12343B] font-bold">SWING +35%</span>
                  </div>
                  <div className="flex justify-between font-label-caps text-label-caps">
                    <span className="text-[#687477]">DEW FACTOR</span>
                    <span className="text-[#12343B] font-bold">GRIP -20%</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleStartFormat('TEST_PINK_BALL')}
                className="w-full py-2 bg-[#2D545E] hover:bg-[#12343B] text-[#FBF8F2] font-label-caps text-label-caps uppercase tracking-wider rounded font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px] text-[#E1B382]">play_arrow</span>
                <span>START PINK TEST</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Section 4: Game Modes & Quick Challenges Bento */}
      <section className="w-full max-w-[1440px] mx-auto px-4 md:px-margin-desktop py-space-lg z-10 bg-warm-paper">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
          {/* Left Bento: Quick Scenario Challenge */}
          <div className="lg:col-span-7 bg-[#FBF8F2] rounded-xl p-space-lg relative overflow-hidden shadow-sm flex flex-col justify-between border border-[#D8C9B5]">
            <div>
              <div className="flex items-center justify-between mb-space-md">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[18px] text-[#C89666]">bolt</span>
                  <span className="font-label-caps text-label-caps text-[#C89666] uppercase tracking-wider font-extrabold">
                    HISTORIC CLUTCH SCENARIO
                  </span>
                  <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded border bg-[#F5EBDD] text-[#12343B] border-[#D8C9B5] ml-2">
                    Coming Soon
                  </span>
                </div>
                <span className="font-label-caps text-label-caps px-2 py-0.5 rounded bg-[#F5EBDD] text-[#687477] border border-[#D8C9B5]">
                  SCENARIO ROADMAP
                </span>
              </div>
              <h3 className="font-editorial-title text-headline-lg text-[#12343B] uppercase tracking-tight mb-space-xs">
                The Gabba Heist • 2021 Tribute
              </h3>
              <p className="font-body-base text-body-base text-[#687477] mb-space-md max-w-xl">
                Day 5, Final Session: Australia have set 328 to win. You are on 296/7 with Rishabh Pant batting on 78*. Score 33 runs in the final 30 balls with 3 wickets remaining.
              </p>
              <div className="grid grid-cols-3 gap-space-sm bg-[#F5EBDD] p-space-md rounded-lg mb-space-lg max-w-lg border border-[#D8C9B5]">
                <div className="flex flex-col">
                  <span className="font-label-caps text-label-caps text-[#687477] uppercase">REQUIRED RUN RATE</span>
                  <span className="font-mono text-title-md text-[#12343B] font-bold">6.60 RPO</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-caps text-label-caps text-[#687477] uppercase">WICKETS REMAINING</span>
                  <span className="font-mono text-title-md text-[#B33232] font-bold">3 WICKETS</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-caps text-label-caps text-[#687477] uppercase">REWARD XP</span>
                  <span className="font-mono text-title-md text-[#2D545E] font-bold">+2,500 XP</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-space-md">
              <button
                onClick={() => setSelectedUpcomingFeature(FEATURE_REGISTRY['gabba-heist-scenario'])}
                className="px-space-lg py-3 bg-[#2D545E] hover:bg-[#12343B] text-[#FBF8F2] font-label-caps text-label-caps uppercase tracking-wider rounded font-bold transition-all flex items-center gap-space-xs shadow-sm cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px] text-[#E1B382]">info</span>
                <span>SCENARIO ROADMAP</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#12343B] border border-[#C89666]/40 text-[#E1B382]">
                  COMING SOON
                </span>
              </button>
              <span className="font-label-caps text-label-caps text-[#687477]">HISTORIC INJECTION IN DEVELOPMENT</span>
            </div>
          </div>

          {/* Right Bento: Live Pitch Weather & Conditions */}
          <div className="lg:col-span-5 bg-[#FBF8F2] rounded-xl p-space-lg relative overflow-hidden shadow-sm flex flex-col justify-between border border-[#D8C9B5]">
            <div>
              <div className="flex items-center justify-between mb-space-md">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[18px] text-[#2D545E]">thermostat</span>
                  <span className="font-label-caps text-label-caps text-[#2D545E] uppercase tracking-wider font-extrabold">
                    VENUE CONDITIONS
                  </span>
                </div>
                <span className="font-label-caps text-label-caps px-2 py-0.5 rounded bg-[#F5EBDD] text-[#12343B] font-mono border border-[#D8C9B5]">
                  LIVE WEATHER
                </span>
              </div>
              <h4 className="font-editorial-title text-title-md text-[#12343B] uppercase mb-space-xs">
                Pitch &amp; Atmospheric Dynamics
              </h4>
              <p className="font-body-sm text-body-sm text-[#687477] mb-space-md">
                Dynamic pitch wear, seam deviation, and moisture swing behavior.
              </p>
              {/* Radar Pitch Matrix */}
              <div className="bg-[#F5EBDD] p-space-md rounded-lg mb-space-md flex items-center justify-between border border-[#D8C9B5]">
                <div className="space-y-2 flex-1 pr-space-md">
                  <div>
                    <div className="flex justify-between font-label-caps text-label-caps mb-1">
                      <span className="text-[#687477]">SEAM &amp; MOVEMENT</span>
                      <span className="text-[#12343B] font-mono font-bold">78%</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#E8DCB8] rounded-full overflow-hidden">
                      <div className="h-full bg-[#2D545E]" style={{ width: '78%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between font-label-caps text-label-caps mb-1">
                      <span className="text-[#687477]">BOUNCE &amp; CARRY</span>
                      <span className="text-[#12343B] font-mono font-bold">84%</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#E8DCB8] rounded-full overflow-hidden">
                      <div className="h-full bg-[#2D545E]" style={{ width: '84%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between font-label-caps text-label-caps mb-1">
                      <span className="text-[#687477]">SPIN &amp; TURN RATE</span>
                      <span className="text-[#C89666] font-mono font-bold">42%</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#E8DCB8] rounded-full overflow-hidden">
                      <div className="h-full bg-[#C89666]" style={{ width: '42%' }} />
                    </div>
                  </div>
                </div>
                {/* Mini Graphic Pitch Visualizer */}
                <div className="w-24 h-24 rounded-lg bg-[#FBF8F2] border border-[#D8C9B5] flex flex-col items-center justify-center p-2 text-center flex-shrink-0 shadow-sm">
                  <span className="material-symbols-outlined text-[28px] text-[#2D545E]">grass</span>
                  <span className="font-label-caps text-[9px] text-[#12343B] uppercase mt-1 leading-tight font-bold">
                    GREEN TOP DENSE GRASS
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-body-sm pt-space-xs text-[#687477] border-t border-[#D8C9B5]/60">
              <span className="font-label-caps text-label-caps">OPTIMAL TOSS STRATEGY:</span>
              <span className="font-label-caps text-label-caps text-[#2D545E] font-bold">
                BOWL FIRST (OVERCAST)
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Upcoming Features & Roadmap (Phase 9.3.3) */}
      <UpcomingUpdatesSection />

      {/* Section 6: Offline Engine Status Bar & Quick Stats Strip */}
      <section className="w-full bg-[#12343B] mt-space-xl py-space-md z-10 border-t border-[#2D545E]">
        <div className="max-w-[1440px] mx-auto px-4 md:px-margin-desktop flex flex-col md:flex-row items-center justify-between gap-space-md text-[#FBF8F2]">
          {/* Engine Status */}
          <div className="flex flex-wrap items-center gap-space-md">
            <div className="flex items-center gap-space-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E1B382] animate-pulse" />
              <span className="font-label-caps text-label-caps text-[#FBF8F2] uppercase tracking-widest font-extrabold">
                STANDALONE SIMULATION READY
              </span>
            </div>
            <span className="text-[#2D545E] hidden sm:inline">•</span>
            <span className="font-label-caps text-label-caps text-[#D8C9B5]">Play matches offline</span>
            <span className="text-[#2D545E] hidden sm:inline">•</span>
            <span className="font-label-caps text-label-caps text-[#E1B382] font-mono font-bold">
              1,144 PLAYERS
            </span>
          </div>
          {/* Quick Controls */}
          <div className="flex items-center gap-space-lg">
            <div className="flex items-center gap-space-xs text-[#D8C9B5]">
              <span className="material-symbols-outlined text-[16px] text-[#E1B382]">battery_charging_full</span>
              <span className="font-label-caps text-label-caps">BATTERY EFFICIENT SIM</span>
            </div>
            <div className="flex items-center gap-space-xs text-[#D8C9B5]">
              <span className="material-symbols-outlined text-[16px] text-[#E1B382]">cloud_off</span>
              <span className="font-label-caps text-label-caps">NO INTERNET REQUIRED</span>
            </div>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('open-cricket-welcome-modal'));
                }
              }}
              className="font-label-caps text-label-caps text-[#E1B382] hover:text-[#FBF8F2] hover:underline uppercase tracking-wider font-bold cursor-pointer"
              type="button"
            >
              MCC LAWS &amp; RULES
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
