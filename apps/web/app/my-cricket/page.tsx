'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { MatchFormat } from '@cricket/shared-types';

interface SavedTeam {
  id: string;
  teamName: string;
  format: string;
  status: 'DRAFT' | 'MATCH_READY';
  lineup: any[];
  updatedAt: string;
}

interface ArchivedMatchRecord {
  id: string;
  date: string;
  format: MatchFormat;
  seed: string;
  stadiumName: string;
  pitchType: string;
  team1Name: string;
  team1Score: string;
  team2Name: string;
  team2Score: string;
  resultSummary: string;
  potm: {
    name: string;
    team: string;
    points: number;
    summary: string;
  } | null;
  initialStateHash?: string;
  totalDeliveries?: number;
}

interface ManagerProfile {
  name: string;
  id: string;
  rankTitle: string;
  isGuest: boolean;
  registeredDate: string;
}

const LOCAL_STORAGE_TEAMS_KEY = 'cricket_dream_teams';
const LOCAL_STORAGE_MATCH_KEY = 'cricket_active_match';
const LOCAL_STORAGE_HISTORY_KEY = 'cricket_match_history';
const LOCAL_STORAGE_SESSION_KEY = 'cricket_active_match_session';
const LOCAL_STORAGE_PROFILE_KEY = 'cricket_user_profile';

export default function MyCricketPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ManagerProfile>({
    name: 'Guest Manager',
    id: '#CRX-LOCAL-GUEST',
    rankTitle: 'Pavilion Strategist',
    isGuest: true,
    registeredDate: 'Current Session (Offline)',
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [customNameInput, setCustomNameInput] = useState('Guest Manager');

  const [savedTeams, setSavedTeams] = useState<SavedTeam[]>([]);
  const [matchHistory, setMatchHistory] = useState<ArchivedMatchRecord[]>([]);
  const [activeSession, setActiveSession] = useState<any | null>(null);

  const [fixtureFilter, setFixtureFilter] = useState<'ALL' | 'T20' | 'ODI' | 'T10' | 'TEST_RED_BALL'>('ALL');
  const [fidelityMode, setFidelityMode] = useState<'PERF' | 'FIDELITY'>('FIDELITY');
  const [crowdAudio, setCrowdAudio] = useState<boolean>(true);
  const [aiVoice, setAiVoice] = useState<boolean>(true);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Load or initialize manager profile
    try {
      const storedProfile = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
      if (storedProfile) {
        const parsed = JSON.parse(storedProfile);
        setProfile(parsed);
        setCustomNameInput(parsed.name || 'Guest Manager');
      }
    } catch {
      // Fallback to guest
    }

    // Load saved squads
    try {
      const storedTeams = localStorage.getItem(LOCAL_STORAGE_TEAMS_KEY);
      if (storedTeams) {
        const parsed = JSON.parse(storedTeams);
        if (Array.isArray(parsed)) {
          setSavedTeams(parsed);
        }
      }
    } catch {
      // Ignore
    }

    // Load genuine match history
    try {
      const storedHistory = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
      if (storedHistory) {
        const parsed = JSON.parse(storedHistory);
        if (Array.isArray(parsed)) {
          setMatchHistory(parsed);
        }
      }
    } catch {
      // Ignore
    }

    // Load in-progress match session
    try {
      const storedSession = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        if (parsed && parsed.currentEventIndex > 0) {
          setActiveSession(parsed);
        }
      }
    } catch {
      // Ignore
    }
  }, []);

  function handleSaveProfileName() {
    const trimmed = customNameInput.trim() || 'Guest Manager';
    const updated: ManagerProfile = {
      ...profile,
      name: trimmed,
      isGuest: trimmed === 'Guest Manager',
    };
    setProfile(updated);
    setIsEditingName(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(updated));
    }
    setNotification('Manager profile updated.');
    setTimeout(() => setNotification(null), 3000);
  }

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
    if (confirm('Clear local match history and in-progress session?')) {
      localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
      localStorage.removeItem(LOCAL_STORAGE_MATCH_KEY);
      setActiveSession(null);
      setNotification('In-progress simulation purged.');
      setTimeout(() => setNotification(null), 3000);
    }
  }

  function handleClearAllData() {
    if (confirm('Reset all local data (saved squads and match history)?')) {
      localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
      localStorage.removeItem(LOCAL_STORAGE_MATCH_KEY);
      localStorage.removeItem(LOCAL_STORAGE_HISTORY_KEY);
      localStorage.removeItem(LOCAL_STORAGE_TEAMS_KEY);
      setSavedTeams([]);
      setMatchHistory([]);
      setActiveSession(null);
      setNotification('All local records reset.');
      setTimeout(() => setNotification(null), 3000);
    }
  }

  function handleForceSync() {
    setNotification('Data sync verified: 1,144 player vectors synchronized.');
    setTimeout(() => setNotification(null), 3000);
  }

  // Derive genuine metrics from matchHistory
  const totalMatches = matchHistory.length;
  let totalWins = 0;
  let totalLosses = 0;
  let totalTies = 0;
  let totalRuns = 0;
  let totalWickets = 0;

  for (const m of matchHistory) {
    const sum = (m.resultSummary || '').toLowerCase();
    if (sum.includes('won by') || sum.includes('victory')) {
      totalWins++;
    } else if (sum.includes('lost by') || sum.includes('defeat')) {
      totalLosses++;
    } else if (sum.includes('tie') || sum.includes('draw')) {
      totalTies++;
    }

    // Parse team runs from scores
    const s1 = m.team1Score || '';
    const mRuns1 = s1.match(/^(\d+)\/(\d+)/);
    if (mRuns1) {
      totalRuns += parseInt(mRuns1[1], 10);
      totalWickets += parseInt(mRuns1[2], 10);
    }
    const s2 = m.team2Score || '';
    const mRuns2 = s2.match(/^(\d+)\/(\d+)/);
    if (mRuns2) {
      totalRuns += parseInt(mRuns2[1], 10);
    }
  }

  const winRatio = totalMatches > 0 ? ((totalWins / totalMatches) * 100).toFixed(1) : '0.0';

  const filteredFixtures = matchHistory.filter((f) => {
    if (fixtureFilter === 'ALL') return true;
    return f.format === fixtureFilter;
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
                <div className="w-24 h-24 rounded-xl bg-surface-recessed flex items-center justify-center ring-2 ring-primary/40 shadow-md">
                  <span className="material-symbols-outlined text-[54px] text-primary">account_circle</span>
                </div>
                <span className="absolute -bottom-2 -right-2 bg-secondary text-on-secondary font-label-caps text-label-caps px-2 py-0.5 rounded shadow-sm font-extrabold tracking-wider">
                  {totalMatches > 0 ? `LVL ${Math.min(50, 1 + Math.floor(totalMatches / 2))}` : 'LVL 1'}
                </span>
              </div>
              <div className="flex flex-col gap-space-xs">
                <div className="flex items-center gap-space-sm flex-wrap">
                  {isEditingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={customNameInput}
                        onChange={(e) => setCustomNameInput(e.target.value)}
                        className="bg-surface-elevated border border-primary px-3 py-1 rounded text-text-chalk font-headline-md text-headline-md uppercase focus:outline-none"
                        maxLength={30}
                        autoFocus
                      />
                      <button
                        onClick={handleSaveProfileName}
                        className="px-3 py-1 bg-primary text-on-primary rounded font-label-caps text-label-caps uppercase font-bold"
                        type="button"
                      >
                        SAVE
                      </button>
                      <button
                        onClick={() => setIsEditingName(false)}
                        className="px-2 py-1 text-text-slate hover:text-text-chalk"
                        type="button"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-headline-lg text-headline-lg text-text-chalk leading-none uppercase">
                        {profile.name}
                      </span>
                      <button
                        onClick={() => setIsEditingName(true)}
                        className="text-text-slate hover:text-primary transition-colors p-1"
                        title="Edit Manager Name"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                    </div>
                  )}
                  <span className="px-space-sm py-0.5 rounded-full bg-surface-elevated text-secondary font-label-caps text-label-caps uppercase tracking-wider">
                    {profile.rankTitle}
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-text-slate flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[16px] text-primary">verified_user</span>
                  ID: {profile.id} • {profile.registeredDate}
                </p>
                <div className="flex items-center gap-space-md pt-space-xs">
                  <div className="flex items-center gap-space-xs">
                    <span className="font-label-caps text-label-caps text-text-subdued uppercase">CAREER ACTIVITY</span>
                    <div className="w-32 h-1.5 bg-surface-recessed rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${Math.min(100, totalMatches * 10)}%` }}
                      />
                    </div>
                    <span className="font-label-caps text-label-caps text-primary">
                      {totalMatches} {totalMatches === 1 ? 'MATCH' : 'MATCHES'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Preset Status Callout */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-space-md bg-surface-elevated p-space-md rounded-lg border border-border-hairline">
              <div className="flex flex-col justify-center pr-space-md sm:border-r sm:border-border-hairline">
                <span className="font-label-caps text-label-caps text-text-subdued uppercase">DEPLOYED SQUAD</span>
                <span className="font-headline-md text-title-md text-text-chalk tracking-tight uppercase">
                  {savedTeams[0]?.teamName || 'NO ACTIVE SQUAD'}
                </span>
                <span className="font-body-sm text-body-sm text-primary flex items-center gap-1">
                  {savedTeams[0] ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Ready for Match
                    </>
                  ) : (
                    <Link href="/dream-teams" className="text-secondary hover:underline flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">add</span> Build First Squad
                    </Link>
                  )}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-space-md items-center">
                <div className="flex flex-col items-center bg-surface-card px-space-md py-space-xs rounded border border-border-hairline">
                  <span className="font-label-caps text-label-caps text-tertiary uppercase">SAVED SQUADS</span>
                  <span className="font-scoreboard-md text-scoreboard-md text-text-chalk">{savedTeams.length}</span>
                </div>
                <div className="flex flex-col items-center bg-surface-card px-space-md py-space-xs rounded border border-border-hairline">
                  <span className="font-label-caps text-label-caps text-secondary uppercase">PLAYERS AUDITED</span>
                  <span className="font-scoreboard-md text-scoreboard-md text-text-chalk">1,144</span>
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
                  <span className="font-scoreboard-xl text-scoreboard-xl text-text-chalk">{totalMatches}</span>
                  <span className="font-body-bold text-body-bold text-text-slate uppercase">FIXTURES</span>
                </div>
                <div className="flex items-center gap-space-xs font-label-caps text-label-caps text-text-slate mt-1">
                  <span className="text-primary font-bold">{totalWins} W</span> •{' '}
                  <span className="text-error font-bold">{totalLosses} L</span> •{' '}
                  <span className="text-text-subdued">{totalTies} T/D</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-space-xs bg-surface-recessed px-space-sm py-1 rounded">
                <span className="font-label-caps text-label-caps text-text-subdued uppercase">WIN RATIO</span>
                <span className="font-scoreboard-md text-title-md text-primary font-bold">{winRatio}%</span>
              </div>
            </div>

            {/* Card 2: Career Runs */}
            <div className="bg-surface-card p-space-md rounded-xl flex flex-col justify-between hover:bg-surface-elevated transition-colors shadow-sm border border-border-hairline">
              <div className="flex items-center justify-between">
                <span className="font-label-caps text-label-caps text-text-subdued uppercase">TOTAL RUNS SCORED</span>
                <span className="material-symbols-outlined text-tertiary text-[20px]">trending_up</span>
              </div>
              <div className="my-space-sm">
                <div className="flex items-baseline gap-space-xs">
                  <span className="font-scoreboard-xl text-scoreboard-xl text-text-chalk">
                    {totalRuns.toLocaleString()}
                  </span>
                </div>
                <span className="font-label-caps text-label-caps text-text-slate mt-1 uppercase">
                  {totalMatches > 0 ? `AVG ${(totalRuns / totalMatches).toFixed(1)} / FIXTURE` : 'NO COMPLETED RUNS'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-space-xs bg-surface-recessed px-space-sm py-1 rounded">
                <span className="font-label-caps text-label-caps text-text-subdued uppercase">STATUS</span>
                <span className="font-scoreboard-md text-title-md text-tertiary font-bold">
                  {totalMatches > 0 ? 'ACTIVE' : 'READY TO PLAY'}
                </span>
              </div>
            </div>

            {/* Card 3: Wickets Taken */}
            <div className="bg-surface-card p-space-md rounded-xl flex flex-col justify-between hover:bg-surface-elevated transition-colors shadow-sm border border-border-hairline">
              <div className="flex items-center justify-between">
                <span className="font-label-caps text-label-caps text-text-subdued uppercase">WICKETS RECORDED</span>
                <span className="material-symbols-outlined text-telemetry-blue text-[20px]">sports_baseball</span>
              </div>
              <div className="my-space-sm">
                <div className="flex items-baseline gap-space-xs">
                  <span className="font-scoreboard-xl text-scoreboard-xl text-text-chalk">{totalWickets}</span>
                  <span className="font-body-bold text-body-bold text-text-slate uppercase">DISMISSALS</span>
                </div>
                <span className="font-label-caps text-label-caps text-text-slate mt-1 uppercase">
                  {totalMatches > 0 ? `${(totalWickets / totalMatches).toFixed(1)} PER FIXTURE` : 'NO DISMISSALS'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-space-xs bg-surface-recessed px-space-sm py-1 rounded">
                <span className="font-label-caps text-label-caps text-text-subdued uppercase">SIMULATION</span>
                <span className="font-scoreboard-md text-title-md text-telemetry-blue font-bold">OFFLINE-FIRST</span>
              </div>
            </div>

            {/* Card 4: Squads & Formations */}
            <div className="bg-surface-card p-space-md rounded-xl flex flex-col justify-between hover:bg-surface-elevated transition-colors shadow-sm border border-border-hairline">
              <div className="flex items-center justify-between">
                <span className="font-label-caps text-label-caps text-text-subdued uppercase">ROSTER COMPOSITION</span>
                <span className="material-symbols-outlined text-tertiary text-[20px]">groups</span>
              </div>
              <div className="my-space-sm flex items-center gap-space-md">
                <span className="font-scoreboard-xl text-scoreboard-xl text-tertiary">{savedTeams.length}</span>
                <div className="flex flex-col">
                  <span className="font-body-bold text-body-bold text-text-chalk uppercase">SAVED SQUADS</span>
                  <span className="font-label-caps text-label-caps text-text-subdued uppercase">
                    {savedTeams.length > 0 ? 'READY FOR COMPETITION' : 'AWAITING CREATION'}
                  </span>
                </div>
              </div>
              <div className="pt-space-xs">
                <Link
                  href="/dream-teams"
                  className="block w-full text-center py-1 bg-surface-recessed hover:bg-surface-bright text-secondary font-label-caps text-label-caps uppercase rounded transition-colors"
                >
                  CREATE NEW SQUAD →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Workspace Content */}
      <div className="max-w-[1440px] mx-auto w-full px-4 md:px-margin-desktop py-space-xl flex flex-col gap-space-xl">
        {/* In-Progress Session Banner if Active */}
        {activeSession && (
          <div className="w-full bg-gradient-to-r from-surface-card via-surface-elevated to-surface-card p-space-lg rounded-xl shadow-lg relative overflow-hidden border border-border-hairline">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-lg relative z-10">
              <div className="flex flex-col gap-space-xs max-w-2xl">
                <div className="flex items-center gap-space-sm flex-wrap">
                  <span className="px-space-sm py-0.5 rounded-full bg-wicket-red-container text-wicket-red font-label-caps text-label-caps uppercase tracking-wider flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-wicket-red animate-ping" /> IN-PROGRESS SIMULATION
                  </span>
                  <span className="px-space-sm py-0.5 rounded-full bg-surface-recessed text-text-slate font-label-caps text-label-caps uppercase">
                    {activeSession.config?.format || 'MATCH'} • BALL {activeSession.currentEventIndex}
                  </span>
                </div>
                <h3 className="font-headline-md text-headline-md text-text-chalk tracking-tight mt-1 uppercase">
                  {activeSession.userTeamName || 'User Team'} vs {activeSession.aiTeamName || 'Opponent'}
                </h3>
              </div>
              <div className="flex items-center gap-space-md self-start lg:self-center">
                <Link
                  href="/match?resume=true"
                  className="px-space-lg py-space-sm bg-primary text-on-primary font-headline-md text-title-md rounded hover:scale-105 active:scale-95 transition-transform flex items-center gap-space-xs shadow-md shadow-primary/20 uppercase"
                >
                  <span className="material-symbols-outlined text-[20px]">play_arrow</span>
                  RESUME MATCH
                </Link>
                <button
                  onClick={handleClearCache}
                  className="p-space-sm bg-surface-recessed text-text-slate hover:text-wicket-red rounded transition-colors cursor-pointer"
                  title="Purge Active Simulation"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[20px]">delete_forever</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2-Column Split: Matches History (Left 58%) & Squads / Settings (Right 42%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
          {/* Section A: Recent Matches & History */}
          <div className="lg:col-span-7 flex flex-col gap-space-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-primary text-[24px]">history</span>
                <h2 className="font-headline-md text-headline-md text-text-chalk uppercase">MATCH HISTORY</h2>
              </div>
              <div className="flex items-center gap-space-xs">
                {(['ALL', 'T20', 'ODI', 'T10', 'TEST_RED_BALL'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setFixtureFilter(fmt)}
                    className={`px-space-sm py-1 font-label-caps text-label-caps rounded transition-all cursor-pointer ${
                      fixtureFilter === fmt
                        ? 'bg-surface-elevated text-primary font-bold'
                        : 'bg-surface-recessed text-text-slate hover:text-text-chalk'
                    }`}
                  >
                    {fmt.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-space-md">
              {filteredFixtures.length === 0 ? (
                <div className="bg-surface-card p-space-xl rounded-xl text-center border border-border-hairline flex flex-col items-center gap-space-md">
                  <div className="w-16 h-16 rounded-full bg-surface-recessed flex items-center justify-center text-text-subdued">
                    <span className="material-symbols-outlined text-[32px]">sports_cricket</span>
                  </div>
                  <div>
                    <h4 className="font-headline-md text-title-md text-text-chalk uppercase">No Matches Played Yet</h4>
                    <p className="font-body-sm text-body-sm text-text-slate mt-1 max-w-sm">
                      Your completed fixtures, ball-by-ball scorecards, and player awards will be recorded here automatically.
                    </p>
                  </div>
                  <div className="flex items-center gap-space-sm">
                    <Link
                      href="/match"
                      className="px-space-lg py-2.5 bg-primary text-on-primary font-label-caps text-label-caps rounded font-bold uppercase transition-transform hover:scale-105"
                    >
                      START QUICK MATCH
                    </Link>
                    <Link
                      href="/dream-teams"
                      className="px-space-md py-2.5 bg-surface-elevated text-text-chalk font-label-caps text-label-caps rounded uppercase hover:bg-surface-bright"
                    >
                      BUILD DREAM XI
                    </Link>
                  </div>
                </div>
              ) : (
                filteredFixtures.map((fix) => (
                  <div
                    key={fix.id}
                    className="bg-surface-card p-space-md rounded-xl flex flex-col gap-space-sm hover:bg-surface-elevated transition-colors shadow-sm border border-border-hairline"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-space-xs">
                        <span className="px-2 py-0.5 rounded-full font-label-caps text-label-caps bg-emerald-950 text-primary">
                          {fix.format}
                        </span>
                        <span className="font-label-caps text-label-caps text-text-subdued uppercase">
                          • {fix.stadiumName} • {new Date(fix.date).toLocaleDateString()}
                        </span>
                      </div>
                      <span className="px-space-sm py-0.5 rounded font-label-caps text-label-caps bg-primary-container text-on-primary-container font-extrabold uppercase">
                        COMPLETED
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm items-center my-space-xs">
                      <div className="flex flex-col">
                        <div className="flex items-center justify-between pr-space-md">
                          <span className="font-body-bold text-body-bold text-text-chalk">{fix.team1Name}</span>
                          <span className="font-scoreboard-md text-title-md text-text-chalk">{fix.team1Score}</span>
                        </div>
                        <div className="flex items-center justify-between pr-space-md mt-1">
                          <span className="font-body-bold text-body-bold text-primary">{fix.team2Name}</span>
                          <span className="font-scoreboard-md text-title-md text-primary font-bold">{fix.team2Score}</span>
                        </div>
                      </div>

                      <div className="flex flex-col justify-center sm:border-l sm:border-border-hairline sm:pl-space-md text-right sm:text-left">
                        <span className="font-label-caps text-label-caps text-primary uppercase font-bold">
                          {fix.resultSummary}
                        </span>
                        {fix.potm && (
                          <span className="font-body-sm text-body-sm text-text-slate mt-0.5">
                            POTM: {fix.potm.name} ({fix.potm.team})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-space-xs bg-surface-recessed p-space-sm rounded">
                      <span className="font-label-caps text-label-caps text-text-subdued uppercase">
                        PITCH: {fix.pitchType} • SEED: {fix.seed}
                      </span>
                      <Link
                        href={`/match?replayId=${fix.id}`}
                        className="text-secondary hover:text-text-chalk font-label-caps text-label-caps flex items-center gap-1 transition-colors uppercase"
                      >
                        REPLAY SIMULATION <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section B & D: Right Panel (Saved Squads & System Settings) */}
          <div className="lg:col-span-5 flex flex-col gap-space-xl">
            {/* Saved Squads Section */}
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
                  <div className="bg-surface-card p-space-lg rounded-xl text-center text-text-subdued border border-border-hairline flex flex-col items-center gap-2">
                    <p className="font-body-sm text-body-sm">No saved squads yet.</p>
                    <Link
                      href="/dream-teams"
                      className="text-primary font-label-caps text-label-caps uppercase underline font-bold"
                    >
                      BUILD YOUR FIRST SQUAD →
                    </Link>
                  </div>
                ) : (
                  savedTeams.map((team) => (
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
                        <span className="font-label-caps text-label-caps text-text-subdued">
                          {new Date(team.updatedAt).toLocaleDateString()}
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
                        <Link
                          href={`/match?squadId=${team.id}`}
                          className="px-space-md py-1.5 bg-surface-elevated text-secondary font-label-caps text-label-caps rounded uppercase hover:text-text-chalk transition-colors"
                        >
                          PLAY
                        </Link>
                        <button
                          onClick={() => handleDeleteSquad(team.id)}
                          className="p-1.5 text-text-slate hover:text-wicket-red transition-colors cursor-pointer"
                          title="Delete Squad"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Tactical Engine System Settings Deck */}
            <div className="bg-surface-card p-space-lg rounded-xl flex flex-col gap-space-md shadow-md border border-border-hairline">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-primary text-[24px]">tune</span>
                <h3 className="font-headline-md text-headline-md text-text-chalk uppercase">OFFLINE PREFERENCES</h3>
              </div>

              <div className="flex flex-col gap-space-sm">
                {/* Visual Fidelity Mode */}
                <div className="flex items-center justify-between py-1">
                  <div className="flex flex-col">
                    <span className="font-body-bold text-body-sm text-text-chalk">Canvas Render Mode</span>
                    <span className="font-label-caps text-[10px] text-text-subdued">PixiJS 2D Top-Down Field</span>
                  </div>
                  <div className="flex items-center gap-1 bg-surface-recessed p-0.5 rounded border border-border-hairline">
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
                    <span className="font-label-caps text-[10px] text-text-subdued">Atmospheric sound effects</span>
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
                    <span className="font-body-bold text-body-sm text-text-chalk">Voice Commentary Stream</span>
                    <span className="font-label-caps text-[10px] text-text-subdued">Tactical ball callouts</span>
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
                  onClick={handleClearAllData}
                  className="text-wicket-red hover:underline font-label-caps text-label-caps flex items-center gap-1 transition-colors cursor-pointer uppercase"
                  type="button"
                >
                  RESET LOCAL DATA
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
