'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CricketDreamXILogo } from '@/components/CricketDreamXILogo';

interface SavedTeam {
  id: string;
  teamName: string;
  format: string;
  status: 'DRAFT' | 'MATCH_READY';
  lineup: any[];
  updatedAt: string;
}

const LOCAL_STORAGE_TEAMS_KEY = 'cricket_dream_teams';
const LOCAL_STORAGE_MATCH_KEY = 'cricket_active_match';

export default function MyCricketPage() {
  const router = useRouter();
  const [savedTeams, setSavedTeams] = useState<SavedTeam[]>([]);
  const [activeMatch, setActiveMatch] = useState<any | null>(null);
  const [fixtureFilter, setFixtureFilter] = useState<'ALL' | 'T20' | 'ODI' | 'T10'>('ALL');
  const [fidelityMode, setFidelityMode] = useState<'PERF' | 'FIDELITY'>('FIDELITY');
  const [crowdAudio, setCrowdAudio] = useState<boolean>(true);
  const [aiVoice, setAiVoice] = useState<boolean>(true);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const storedTeams = localStorage.getItem(LOCAL_STORAGE_TEAMS_KEY);
      if (storedTeams) {
        setSavedTeams(JSON.parse(storedTeams));
      }
      const storedMatch = localStorage.getItem(LOCAL_STORAGE_MATCH_KEY);
      if (storedMatch) {
        setActiveMatch(JSON.parse(storedMatch));
      }
    } catch {
      // Ignore
    }
  }, []);

  function handleLoadSquad(team: SavedTeam) {
    router.push(`/dream-teams?load=${team.id}`);
  }

  function handleDeleteSquad(id: string) {
    if (confirm('Delete this squad profile?')) {
      const next = savedTeams.filter((t) => t.id !== id);
      setSavedTeams(next);
      localStorage.setItem(LOCAL_STORAGE_TEAMS_KEY, JSON.stringify(next));
      setNotification('Squad profile removed.');
      setTimeout(() => setNotification(null), 3000);
    }
  }

  function handleClearCache() {
    if (confirm('Clear local game cache & reset offline benchmarks?')) {
      localStorage.removeItem(LOCAL_STORAGE_MATCH_KEY);
      setActiveMatch(null);
      setNotification('Local match cache purged.');
      setTimeout(() => setNotification(null), 3000);
    }
  }

  function handleForceSync() {
    setNotification('Data sync verified: 1,144 player vectors synchronized.');
    setTimeout(() => setNotification(null), 3000);
  }

  const fixtures = [
    {
      id: 'fix-1',
      type: 'T20',
      formatLabel: 'T20 INTERNATIONAL',
      badgeClass: 'bg-emerald-950 text-primary',
      dateLocation: 'YESTERDAY • MELBOURNE (MCG)',
      resultLabel: 'VICTORY',
      opponent: 'AUSTRALIA',
      opponentFlag: '🇦🇺',
      oppScore: '182/7',
      oppOvers: '20.0',
      teamName: 'THUNDERBOLTS XI',
      teamScore: '186/6',
      teamOvers: '19.2',
      wonMargin: 'WON BY 4 WICKETS',
      mom: 'Player of the Match: Virat Kohli (78* off 44 balls)',
      footerMetric: 'FINAL OVER RUN-RATE: 9.62 RPO',
    },
    {
      id: 'fix-2',
      type: 'ODI',
      formatLabel: 'ODI 50-OVER',
      badgeClass: 'bg-blue-950 text-telemetry-blue',
      dateLocation: "3 DAYS AGO • LORD'S LONDON",
      resultLabel: 'VICTORY',
      opponent: 'ENGLAND',
      opponentFlag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
      oppScore: '274 all out',
      oppOvers: '46.3',
      teamName: 'THUNDERBOLTS XI',
      teamScore: '312/8',
      teamOvers: '50.0',
      wonMargin: 'WON BY 38 RUNS',
      mom: 'Key Spell: Jasprit Bumrah 4/38 (9.3 ov)',
      footerMetric: 'NET RUN RATE BOOST: +0.760',
    },
    {
      id: 'fix-3',
      type: 'T10',
      formatLabel: 'T10 SUPER SLAM',
      badgeClass: 'bg-amber-950 text-tertiary',
      dateLocation: 'MAY 18 • SHARJAH CRICKET STADIUM',
      resultLabel: 'VICTORY',
      opponent: 'PAKISTAN',
      opponentFlag: '🇵🇰',
      oppScore: '118/6',
      oppOvers: '10.0',
      teamName: 'THUNDERBOLTS XI',
      teamScore: '132/3',
      teamOvers: '10.0',
      wonMargin: 'WON BY 14 RUNS',
      mom: 'High Strike Rate: Andre Russell 41* (12 balls)',
      footerMetric: 'SIXES HIT: 14 • BOUNDARIES: 8',
    },
  ];

  const filteredFixtures = fixtures.filter((f) => {
    if (fixtureFilter === 'ALL') return true;
    return f.type === fixtureFilter;
  });

  return (
    <div className="w-full flex flex-col min-h-screen bg-surface">
      {/* Dynamic Top Ambience Backdrop */}
      <div className="relative w-full overflow-hidden bg-surface-container-lowest py-space-xl px-4 md:px-margin-desktop">
        <div className="absolute -top-32 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-16 w-80 h-80 bg-tertiary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-[1440px] mx-auto w-full flex flex-col gap-space-xl relative z-10">
          {notification && (
            <div className="bg-primary-container text-on-primary-container px-4 py-2.5 rounded-xl font-label-caps text-label-caps flex items-center justify-between shadow-lg">
              <span>{notification}</span>
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
            </div>
          )}

          {/* Manager ID Deck & Active Formation Strip */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-lg bg-surface-card p-space-lg rounded-xl shadow-xl border border-border-hairline">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-space-lg">
              <div className="relative group">
                <img
                  className="w-24 h-24 rounded-xl object-cover ring-2 ring-primary/40 shadow-md"
                  alt="Tactical Cricket Manager"
                  src="/assets/stitch/asset-003.png"
                  onError={(e) => {
                    e.currentTarget.src = '/assets/stitch/asset-005.png';
                  }}
                />
                <span className="absolute -bottom-2 -right-2 bg-tertiary text-on-tertiary font-label-caps text-label-caps px-2 py-0.5 rounded shadow-sm font-extrabold tracking-wider">
                  LVL 38
                </span>
              </div>
              <div className="flex flex-col gap-space-xs">
                <div className="flex items-center gap-space-sm flex-wrap">
                  <span className="font-headline-lg text-headline-lg text-text-chalk leading-none uppercase">
                    VIKRAMADITYA SEN
                  </span>
                  <span className="px-space-sm py-0.5 rounded-full bg-surface-elevated text-secondary font-label-caps text-label-caps uppercase tracking-wider">
                    ELITE GRANDMASTER TACTICIAN
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-text-slate flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[16px] text-primary">verified</span>
                  ID: #CRX-9942-HQ • Registered Member Since Season 1
                </p>
                <div className="flex items-center gap-space-md pt-space-xs">
                  <div className="flex items-center gap-space-xs">
                    <span className="font-label-caps text-label-caps text-text-subdued uppercase">XP Progress</span>
                    <div className="w-32 h-1.5 bg-surface-recessed rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: '78%' }} />
                    </div>
                    <span className="font-label-caps text-label-caps text-primary">78%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Preset Status Callout */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-space-md bg-surface-elevated p-space-md rounded-lg border border-border-hairline">
              <div className="flex flex-col justify-center pr-space-md sm:border-r sm:border-border-hairline">
                <span className="font-label-caps text-label-caps text-text-subdued uppercase">DEPLOYED SQUAD</span>
                <span className="font-headline-md text-title-md text-text-chalk tracking-tight uppercase">
                  {savedTeams[0]?.teamName || 'THUNDERBOLTS XI'}
                </span>
                <span className="font-body-sm text-body-sm text-primary flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Ready for Queue
                </span>
              </div>
              <div className="grid grid-cols-2 gap-space-md items-center">
                <div className="flex flex-col items-center bg-surface-card px-space-md py-space-xs rounded border border-border-hairline">
                  <span className="font-label-caps text-label-caps text-tertiary uppercase">OVR RATING</span>
                  <span className="font-scoreboard-md text-scoreboard-md text-text-chalk">94.2</span>
                </div>
                <div className="flex flex-col items-center bg-surface-card px-space-md py-space-xs rounded border border-border-hairline">
                  <span className="font-label-caps text-label-caps text-secondary uppercase">CHEMISTRY</span>
                  <span className="font-scoreboard-md text-scoreboard-md text-text-chalk">96%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Career Metrics Dashboard Grid (4 Pillars) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md">
            {/* Card 1: Record & Win Ratio */}
            <div className="bg-surface-card p-space-md rounded-xl flex flex-col justify-between hover:bg-surface-elevated transition-colors shadow-sm border border-border-hairline">
              <div className="flex items-center justify-between">
                <span className="font-label-caps text-label-caps text-text-subdued uppercase">CAREER MATCH RECORD</span>
                <span className="material-symbols-outlined text-secondary text-[20px]">sports_cricket</span>
              </div>
              <div className="my-space-sm">
                <div className="flex items-baseline gap-space-xs">
                  <span className="font-scoreboard-xl text-scoreboard-xl text-text-chalk">84</span>
                  <span className="font-body-bold text-body-bold text-text-slate uppercase">FIXTURES</span>
                </div>
                <div className="flex items-center gap-space-xs font-label-caps text-label-caps text-text-slate mt-1">
                  <span className="text-primary font-bold">62 W</span> •{' '}
                  <span className="text-error font-bold">20 L</span> •{' '}
                  <span className="text-text-subdued">2 T</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-space-xs bg-surface-recessed px-space-sm py-1 rounded">
                <span className="font-label-caps text-label-caps text-text-subdued uppercase">WIN RATIO</span>
                <span className="font-scoreboard-md text-title-md text-primary font-bold">73.8%</span>
              </div>
            </div>

            {/* Card 2: Career Runs */}
            <div className="bg-surface-card p-space-md rounded-xl flex flex-col justify-between hover:bg-surface-elevated transition-colors shadow-sm border border-border-hairline">
              <div className="flex items-center justify-between">
                <span className="font-label-caps text-label-caps text-text-subdued uppercase">TOTAL RUNS GENERATED</span>
                <span className="material-symbols-outlined text-tertiary text-[20px]">trending_up</span>
              </div>
              <div className="my-space-sm">
                <div className="flex items-baseline gap-space-xs">
                  <span className="font-scoreboard-xl text-scoreboard-xl text-text-chalk">14,892</span>
                </div>
                <span className="font-label-caps text-label-caps text-text-slate mt-1 uppercase">AVG 177.2 / INNINGS</span>
              </div>
              <div className="flex items-center justify-between pt-space-xs bg-surface-recessed px-space-sm py-1 rounded">
                <span className="font-label-caps text-label-caps text-text-subdued uppercase">TEAM HIGH SCORE</span>
                <span className="font-scoreboard-md text-title-md text-tertiary font-bold">
                  248/3 <span className="text-[11px] font-normal text-text-slate">(T20)</span>
                </span>
              </div>
            </div>

            {/* Card 3: Wickets Taken */}
            <div className="bg-surface-card p-space-md rounded-xl flex flex-col justify-between hover:bg-surface-elevated transition-colors shadow-sm border border-border-hairline">
              <div className="flex items-center justify-between">
                <span className="font-label-caps text-label-caps text-text-subdued uppercase">WICKETS HARVESTED</span>
                <span className="material-symbols-outlined text-telemetry-blue text-[20px]">target</span>
              </div>
              <div className="my-space-sm">
                <div className="flex items-baseline gap-space-xs">
                  <span className="font-scoreboard-xl text-scoreboard-xl text-text-chalk">541</span>
                  <span className="font-body-bold text-body-bold text-text-slate uppercase">DISMISSALS</span>
                </div>
                <span className="font-label-caps text-label-caps text-text-slate mt-1 uppercase">TEAM ECON 6.42 RPO</span>
              </div>
              <div className="flex items-center justify-between pt-space-xs bg-surface-recessed px-space-sm py-1 rounded">
                <span className="font-label-caps text-label-caps text-text-subdued uppercase">BEST SPELL</span>
                <span className="font-scoreboard-md text-title-md text-telemetry-blue font-bold">
                  5/12 <span className="text-[10px] font-normal text-text-slate">J. Bumrah</span>
                </span>
              </div>
            </div>

            {/* Card 4: Trophy Cabinet */}
            <div className="bg-surface-card p-space-md rounded-xl flex flex-col justify-between hover:bg-surface-elevated transition-colors shadow-sm border border-border-hairline">
              <div className="flex items-center justify-between">
                <span className="font-label-caps text-label-caps text-text-subdued uppercase">TROPHY CABINET</span>
                <span className="material-symbols-outlined text-tertiary text-[20px]">military_tech</span>
              </div>
              <div className="my-space-sm flex items-center gap-space-md">
                <span className="font-scoreboard-xl text-scoreboard-xl text-tertiary">11</span>
                <div className="flex flex-col">
                  <span className="font-body-bold text-body-bold text-text-chalk uppercase">MAJOR TITLES</span>
                  <span className="font-label-caps text-label-caps text-text-subdued uppercase">100% UNLOCKED TIER 1</span>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1 pt-space-xs text-center">
                <div className="bg-surface-recessed py-1 rounded">
                  <span className="font-label-caps text-label-caps text-text-chalk block">4x</span>
                  <span className="text-[9px] text-text-subdued uppercase">T20</span>
                </div>
                <div className="bg-surface-recessed py-1 rounded">
                  <span className="font-label-caps text-label-caps text-text-chalk block">3x</span>
                  <span className="text-[9px] text-text-subdued uppercase">ODI</span>
                </div>
                <div className="bg-surface-recessed py-1 rounded">
                  <span className="font-label-caps text-label-caps text-text-chalk block">2x</span>
                  <span className="text-[9px] text-text-subdued uppercase">URN</span>
                </div>
                <div className="bg-surface-recessed py-1 rounded">
                  <span className="font-label-caps text-label-caps text-text-chalk block">2x</span>
                  <span className="text-[9px] text-text-subdued uppercase">SLAM</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Workspace Content (Bento Architecture) */}
      <div className="max-w-[1440px] mx-auto w-full px-4 md:px-margin-desktop py-space-xl flex flex-col gap-space-xl">
        {/* Top Row Bento: In-Progress Offline Test Match Banner */}
        <div className="w-full bg-gradient-to-r from-surface-card via-surface-elevated to-surface-card p-space-lg rounded-xl shadow-lg relative overflow-hidden border border-border-hairline">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-end pr-8">
            <span className="material-symbols-outlined text-[160px] text-on-surface">stadium</span>
          </div>
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-lg relative z-10">
            <div className="flex flex-col gap-space-xs max-w-2xl">
              <div className="flex items-center gap-space-sm flex-wrap">
                <span className="px-space-sm py-0.5 rounded-full bg-wicket-red-container text-wicket-red font-label-caps text-label-caps uppercase tracking-wider flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-wicket-red animate-ping" /> IN-PROGRESS SIMULATION
                </span>
                <span className="px-space-sm py-0.5 rounded-full bg-surface-recessed text-text-slate font-label-caps text-label-caps uppercase">
                  TEST RED BALL • DAY 3 • SESSION 2
                </span>
                <span className="px-space-sm py-0.5 rounded-full bg-surface-recessed text-text-subdued font-label-caps text-label-caps uppercase">
                  CENTURION PARK, SA
                </span>
              </div>
              <h3 className="font-headline-md text-headline-md text-text-chalk tracking-tight mt-1 uppercase">
                INDIA ALL-TIME XI vs SOUTH AFRICA
              </h3>
              <div className="flex items-center gap-space-md flex-wrap font-body-base text-body-base text-on-surface-variant">
                <span className="font-semibold text-text-chalk">South Africa: 214/5 (68.4 ov)</span>
                <span className="text-text-subdued">•</span>
                <span className="text-warning-amber font-medium">SA trail by 88 runs with 5 wickets remaining</span>
              </div>
              <span className="font-label-caps text-label-caps text-text-subdued mt-1">
                Bowler in attack: Ravichandran Ashwin (3/44, 21.4 ov) • Pitch Wear: Dry Cracks
              </span>
            </div>
            <div className="flex items-center gap-space-md self-start lg:self-center">
              <Link
                href="/match?format=TEST_RED_BALL"
                className="px-space-lg py-space-sm bg-primary text-on-primary font-headline-md text-title-md rounded hover:scale-105 active:scale-95 transition-transform flex items-center gap-space-xs shadow-md shadow-primary/20 uppercase"
              >
                <span className="material-symbols-outlined text-[20px]">play_arrow</span>
                RESUME TEST MATCH
              </Link>
              <button
                onClick={handleClearCache}
                className="p-space-sm bg-surface-recessed text-text-slate hover:text-wicket-red rounded transition-colors cursor-pointer"
                title="Purge Match Cache"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">delete_forever</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2-Column Split: Matches History (Left 58%) & Squads / System Hub (Right 42%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
          {/* Section A: Recent Matches & Score History (7 cols on lg) */}
          <div className="lg:col-span-7 flex flex-col gap-space-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-primary text-[24px]">history</span>
                <h2 className="font-headline-md text-headline-md text-text-chalk uppercase">RECENT FIXTURES</h2>
              </div>
              <div className="flex items-center gap-space-xs">
                {(['ALL', 'T20', 'ODI', 'T10'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setFixtureFilter(fmt)}
                    className={`px-space-sm py-1 font-label-caps text-label-caps rounded transition-all cursor-pointer ${
                      fixtureFilter === fmt
                        ? 'bg-surface-elevated text-primary font-bold'
                        : 'bg-surface-recessed text-text-slate hover:text-text-chalk'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-space-md">
              {filteredFixtures.map((fix) => (
                <div
                  key={fix.id}
                  className="bg-surface-card p-space-md rounded-xl flex flex-col gap-space-sm hover:bg-surface-elevated transition-colors shadow-sm border border-border-hairline"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-space-xs">
                      <span className={`px-2 py-0.5 rounded-full font-label-caps text-label-caps ${fix.badgeClass}`}>
                        {fix.formatLabel}
                      </span>
                      <span className="font-label-caps text-label-caps text-text-subdued uppercase">
                        • {fix.dateLocation}
                      </span>
                    </div>
                    <span className="px-space-sm py-0.5 rounded font-label-caps text-label-caps bg-primary-container text-on-primary-container font-extrabold uppercase">
                      {fix.resultLabel}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm items-center my-space-xs">
                    <div className="flex flex-col">
                      <div className="flex items-center justify-between pr-space-md">
                        <span className="font-body-bold text-body-bold text-text-chalk flex items-center gap-2">
                          <span>{fix.opponentFlag}</span>
                          <span>{fix.opponent}</span>
                        </span>
                        <span className="font-scoreboard-md text-title-md text-text-slate">
                          {fix.oppScore} <span className="text-[11px] font-normal text-text-subdued">({fix.oppOvers})</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between pr-space-md mt-1">
                        <span className="font-body-bold text-body-bold text-primary flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px]">shield</span>
                          <span>{fix.teamName}</span>
                        </span>
                        <span className="font-scoreboard-md text-title-md text-text-chalk font-bold">
                          {fix.teamScore} <span className="text-[11px] font-normal text-primary">({fix.teamOvers})</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col justify-center sm:border-l sm:border-border-hairline sm:pl-space-md text-right sm:text-left">
                      <span className="font-label-caps text-label-caps text-primary uppercase font-bold">
                        {fix.wonMargin}
                      </span>
                      <span className="font-body-sm text-body-sm text-text-slate mt-0.5">{fix.mom}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-space-xs bg-surface-recessed p-space-sm rounded">
                    <span className="font-label-caps text-label-caps text-text-subdued uppercase">{fix.footerMetric}</span>
                    <Link
                      href="/match"
                      className="text-secondary hover:text-text-chalk font-label-caps text-label-caps flex items-center gap-1 transition-colors uppercase"
                    >
                      FULL SCORECARD <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section B & D: Right Panel (Saved Squads & Simulation System Deck) (5 cols on lg) */}
          <div className="lg:col-span-5 flex flex-col gap-space-xl">
            {/* Section B: Saved Squads & Formations */}
            <div className="flex flex-col gap-space-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-secondary text-[24px]">groups</span>
                  <h2 className="font-headline-md text-headline-md text-text-chalk uppercase">SAVED SQUADS</h2>
                </div>
                <Link
                  href="/dream-teams"
                  className="px-space-sm py-1 bg-surface-elevated text-secondary hover:text-text-chalk font-label-caps text-label-caps rounded flex items-center gap-1 uppercase"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span> NEW SQUAD
                </Link>
              </div>

              <div className="flex flex-col gap-space-sm">
                {savedTeams.length === 0 ? (
                  <div className="bg-surface-card p-space-md rounded-xl text-center text-text-subdued border border-border-hairline">
                    <p className="font-body-sm text-body-sm mb-2">No saved squads yet.</p>
                    <Link href="/dream-teams" className="text-primary font-label-caps text-label-caps uppercase underline">
                      BUILD YOUR FIRST SQUAD →
                    </Link>
                  </div>
                ) : (
                  savedTeams.map((team, idx) => (
                    <div
                      key={team.id}
                      className="bg-surface-card p-space-md rounded-xl flex flex-col gap-space-sm shadow-sm border border-border-hairline"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-space-xs">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              team.status === 'MATCH_READY' ? 'bg-primary' : 'bg-warning-amber'
                            }`}
                          />
                          <span className="font-headline-md text-title-md text-text-chalk uppercase">
                            {team.teamName}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full font-label-caps text-label-caps font-bold ${
                            team.status === 'MATCH_READY'
                              ? 'bg-primary/20 text-primary'
                              : 'bg-warning-amber/20 text-warning-amber'
                          }`}
                        >
                          {team.status === 'MATCH_READY' ? 'ACTIVE / READY' : 'DRAFT'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-body-sm text-text-slate bg-surface-recessed p-space-sm rounded">
                        <span className="font-label-caps text-label-caps uppercase">
                          {team.lineup?.length || 0}/11 PLAYERS • {team.format}
                        </span>
                        <span className="font-label-caps text-label-caps text-secondary font-bold uppercase">
                          CHEMISTRY 96%
                        </span>
                      </div>

                      <div className="flex items-center gap-space-sm pt-space-xs">
                        <button
                          onClick={() => handleLoadSquad(team)}
                          className="flex-1 py-1.5 bg-primary text-on-primary font-label-caps text-label-caps rounded font-bold uppercase transition-transform hover:scale-[1.02] cursor-pointer"
                          type="button"
                        >
                          LOAD SQUAD
                        </button>
                        <button
                          onClick={() => {
                            const cloned: SavedTeam = {
                              ...team,
                              id: `team-${Date.now()}`,
                              teamName: `${team.teamName} (Copy)`,
                              updatedAt: new Date().toISOString(),
                            };
                            const updated = [cloned, ...savedTeams];
                            setSavedTeams(updated);
                            localStorage.setItem(LOCAL_STORAGE_TEAMS_KEY, JSON.stringify(updated));
                            setNotification(`Cloned squad "${cloned.teamName}".`);
                            setTimeout(() => setNotification(null), 3000);
                          }}
                          className="px-space-sm py-1.5 bg-surface-elevated text-text-slate hover:text-text-chalk font-label-caps text-label-caps rounded uppercase cursor-pointer"
                          title="Duplicate Squad"
                          type="button"
                        >
                          CLONE
                        </button>
                        {idx === 0 ? (
                          <button
                            className="px-space-sm py-1.5 bg-surface-elevated text-text-slate font-label-caps text-label-caps rounded uppercase opacity-60 cursor-not-allowed"
                            title="Active deployed squad is protected"
                            type="button"
                            disabled
                          >
                            <span className="material-symbols-outlined text-[16px]">lock</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDeleteSquad(team.id)}
                            className="px-space-sm py-1.5 bg-surface-elevated text-text-slate hover:text-wicket-red font-label-caps text-label-caps rounded uppercase cursor-pointer"
                            title="Delete Squad"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Section D: Simulation Engine Settings & Local Storage HUD */}
            <div className="bg-surface-card p-space-md rounded-xl flex flex-col gap-space-md shadow-sm border border-border-hairline">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-primary text-[22px]">memory</span>
                  <h3 className="font-headline-md text-title-md text-text-chalk uppercase">
                    SIMULATION ENGINE &amp; STORAGE
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded bg-surface-recessed text-primary font-label-caps text-label-caps font-bold">
                  v2.4 ACTIVE
                </span>
              </div>

              {/* Offline Telemetry Status */}
              <div className="grid grid-cols-2 gap-space-sm">
                <div className="bg-surface-recessed p-space-sm rounded flex flex-col gap-1 border border-border-hairline">
                  <span className="font-label-caps text-label-caps text-text-subdued uppercase">OFFLINE CACHE</span>
                  <span className="font-scoreboard-md text-scoreboard-md text-text-chalk">42.4 MB</span>
                  <span className="font-label-caps text-[10px] text-primary uppercase">1,144 PLAYERS LOADED</span>
                </div>
                <div className="bg-surface-recessed p-space-sm rounded flex flex-col gap-1 border border-border-hairline">
                  <span className="font-label-caps text-label-caps text-text-subdued uppercase">RENDER PIPELINE</span>
                  <span className="font-scoreboard-md text-scoreboard-md text-telemetry-blue">60 FPS</span>
                  <span className="font-label-caps text-[10px] text-text-slate uppercase">HARDWARE ACCELERATED</span>
                </div>
              </div>

              {/* Tactical Switches */}
              <div className="flex flex-col gap-space-sm pt-space-xs">
                {/* Graphic Fidelity Selector */}
                <div className="flex items-center justify-between py-1">
                  <div className="flex flex-col">
                    <span className="font-body-bold text-body-sm text-text-chalk">Graphics Rendering Mode</span>
                    <span className="font-label-caps text-[10px] text-text-subdued">
                      Optimizes ball-trajectory &amp; 2D PixiJS physics
                    </span>
                  </div>
                  <div className="flex bg-surface-recessed p-0.5 rounded border border-border-hairline">
                    <button
                      onClick={() => setFidelityMode('PERF')}
                      className={`px-space-sm py-1 rounded font-label-caps text-[10px] transition-all cursor-pointer ${
                        fidelityMode === 'PERF'
                          ? 'bg-primary text-on-primary font-bold'
                          : 'text-text-slate hover:text-text-chalk'
                      }`}
                      type="button"
                    >
                      PERF
                    </button>
                    <button
                      onClick={() => setFidelityMode('FIDELITY')}
                      className={`px-space-sm py-1 rounded font-label-caps text-[10px] transition-all cursor-pointer ${
                        fidelityMode === 'FIDELITY'
                          ? 'bg-primary text-on-primary font-bold'
                          : 'text-text-slate hover:text-text-chalk'
                      }`}
                      type="button"
                    >
                      FIDELITY
                    </button>
                  </div>
                </div>

                {/* Audio Commentary Switch */}
                <div className="flex items-center justify-between py-1">
                  <div className="flex flex-col">
                    <span className="font-body-bold text-body-sm text-text-chalk">Crowd Ambience &amp; SFX</span>
                    <span className="font-label-caps text-[10px] text-text-subdued">
                      Binaural pavilion acoustic sim
                    </span>
                  </div>
                  <button
                    onClick={() => setCrowdAudio(!crowdAudio)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      crowdAudio ? 'bg-primary' : 'bg-surface-recessed'
                    }`}
                    type="button"
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                        crowdAudio ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Commentary Speech Synthesizer Toggle */}
                <div className="flex items-center justify-between py-1">
                  <div className="flex flex-col">
                    <span className="font-body-bold text-body-sm text-text-chalk">AI Voice Commentary Stream</span>
                    <span className="font-label-caps text-[10px] text-text-subdued">Live tactical ball callouts</span>
                  </div>
                  <button
                    onClick={() => setAiVoice(!aiVoice)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      aiVoice ? 'bg-primary' : 'bg-surface-recessed'
                    }`}
                    type="button"
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                        aiVoice ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Bottom Action Buttons */}
              <div className="flex items-center justify-between pt-space-xs border-t border-border-hairline">
                <button
                  onClick={handleForceSync}
                  className="text-text-subdued hover:text-text-chalk font-label-caps text-label-caps flex items-center gap-1 transition-colors cursor-pointer uppercase"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">sync</span> FORCE DATA SYNC
                </button>
                <button
                  onClick={handleClearCache}
                  className="text-wicket-red hover:underline font-label-caps text-label-caps flex items-center gap-1 transition-colors cursor-pointer uppercase"
                  type="button"
                >
                  CLEAR LOCAL CACHE
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
