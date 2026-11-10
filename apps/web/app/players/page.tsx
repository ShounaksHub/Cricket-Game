'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type {
  MatchFormat,
  PlayerProfile,
  PrimaryRole,
} from '@cricket/shared-types';
import {
  ingestPlayerRecord,
  VERIFIED_BENCHMARK_PLAYERS,
} from '@cricket/data-ingestion';

function getStitchRoleCategory(role: PrimaryRole): 'BATTER' | 'WK' | 'ALL-ROUNDER' | 'BOWLER' {
  if (role === 'WICKETKEEPER_BATTER') return 'WK';
  if (role === 'TOP_ORDER_BATTER' || role === 'MIDDLE_ORDER_BATTER') return 'BATTER';
  if (role === 'BATTING_ALL_ROUNDER' || role === 'BOWLING_ALL_ROUNDER') return 'ALL-ROUNDER';
  return 'BOWLER';
}

function getCountryFlag(country: string): string {
  const norm = (country || '').toLowerCase();
  if (norm.includes('ind') && !norm.includes('indies')) return '🇮🇳';
  if (norm.includes('aus')) return '🇦🇺';
  if (norm.includes('eng')) return '🏴󠁧󠁢󠁥󠁮󠁧󠁿';
  if (norm.includes('south') || norm.includes('sa')) return '🇿🇦';
  if (norm.includes('pak')) return '🇵🇰';
  if (norm.includes('zealand') || norm.includes('nz')) return '🇳🇿';
  if (norm.includes('indies') || norm.includes('wi')) return '🏝️';
  if (norm.includes('lanka') || norm.includes('sl')) return '🇱🇰';
  if (norm.includes('afghan') || norm.includes('afg')) return '🇦🇫';
  if (norm.includes('bangla') || norm.includes('ban')) return '🇧🇩';
  if (norm.includes('zimb') || norm.includes('zim')) return '🇿🇼';
  return '🏏';
}

function getPlayerPortrait(id: string, index: number): string {
  const portraitMap: Record<string, string> = {
    'p-sachin-tendulkar': '/assets/stitch/asset-028.png',
    'p-wasim-akram': '/assets/stitch/asset-029.png',
    'p-brian-lara': '/assets/stitch/asset-030.png',
    'p-glenn-mcgrath': '/assets/stitch/asset-031.png',
    'p-jacques-kallis': '/assets/stitch/asset-032.png',
    'p-muttiah-muralitharan': '/assets/stitch/asset-033.png',
    'p-rohit-sharma': '/assets/stitch/asset-004.png',
    'p-virat-kohli': '/assets/stitch/asset-005.png',
    'p-steve-smith': '/assets/stitch/asset-006.png',
    'p-joe-root': '/assets/stitch/asset-007.png',
    'p-babar-azam': '/assets/stitch/asset-008.png',
    'p-ms-dhoni': '/assets/stitch/asset-009.png',
    'p-hardik-pandya': '/assets/stitch/asset-010.png',
    'p-rashid-khan': '/assets/stitch/asset-011.png',
    'p-pat-cummins': '/assets/stitch/asset-012.png',
    'p-jasprit-bumrah': '/assets/stitch/asset-013.png',
    'p-shaheen-afridi': '/assets/stitch/asset-014.png',
  };
  if (portraitMap[id]) return portraitMap[id];
  const assetNums = [
    '004', '005', '006', '007', '008', '009', '010', '011', '012', '013', '014',
    '016', '017', '018', '019', '020', '021', '022', '023', '024', '025', '026',
    '027', '028', '029', '030', '031', '032', '033', '034', '035', '036', '037', '038'
  ];
  const num = assetNums[Math.abs(index) % assetNums.length];
  return `/assets/stitch/asset-${num}.png`;
}

const ITEMS_PER_PAGE = 8;

export default function PlayerCataloguePage() {
  const router = useRouter();
  const [selectedFormat, setSelectedFormat] = useState<MatchFormat>('T20');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'BATTER' | 'WK' | 'ALL-ROUNDER' | 'BOWLER'>('ALL');
  const [nationFilter, setNationFilter] = useState<string>('ALL');
  const [eraFilter, setEraFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'OVR_DESC' | 'NAME_ASC' | 'BAT_AVG' | 'BOWL_ECON'>('OVR_DESC');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [inspectedPlayerId, setInspectedPlayerId] = useState<string | null>(null);
  const [draftAlert, setDraftAlert] = useState<string | null>(null);

  // Ingest all 1,144 players
  const allPlayers = useMemo<PlayerProfile[]>(() => {
    return VERIFIED_BENCHMARK_PLAYERS.map(ingestPlayerRecord);
  }, []);

  // Filtered & Sorted players
  const filteredPlayers = useMemo(() => {
    let list = allPlayers.filter((p) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (p.displayName || p.fullName).toLowerCase().includes(q);
        const matchesNation = (p.primaryNationality || '').toLowerCase().includes(q);
        if (!matchesName && !matchesNation) return false;
      }

      // Role
      if (roleFilter !== 'ALL') {
        const cat = getStitchRoleCategory(p.primaryRole);
        if (cat !== roleFilter) return false;
      }

      // Nation
      if (nationFilter !== 'ALL') {
        const pNat = (p.primaryNationality || '').toLowerCase();
        if (!pNat.includes(nationFilter.toLowerCase())) return false;
      }

      // Era
      if (eraFilter !== 'ALL') {
        if (eraFilter === 'MODERN' && p.careerDebutYear < 2015) return false;
        if (eraFilter === 'GOLDEN' && (p.careerDebutYear < 1990 || p.careerDebutYear >= 2015)) return false;
        if (eraFilter === 'CLASSIC' && p.careerDebutYear >= 1990) return false;
      }

      return true;
    });

    // Sort
    list = [...list].sort((a, b) => {
      if (sortBy === 'OVR_DESC') {
        const aOvr = a.ratings[selectedFormat]?.overallRating ?? 75;
        const bOvr = b.ratings[selectedFormat]?.overallRating ?? 75;
        return bOvr - aOvr;
      }
      if (sortBy === 'NAME_ASC') {
        return (a.displayName || a.fullName).localeCompare(b.displayName || b.fullName);
      }
      if (sortBy === 'BAT_AVG') {
        const aAvg = a.formatStats[selectedFormat]?.battingAverage ?? 0;
        const bAvg = b.formatStats[selectedFormat]?.battingAverage ?? 0;
        return bAvg - aAvg;
      }
      if (sortBy === 'BOWL_ECON') {
        const aEcon = a.formatStats[selectedFormat]?.economyRate || 99;
        const bEcon = b.formatStats[selectedFormat]?.economyRate || 99;
        return aEcon - bEcon;
      }
      return 0;
    });

    return list;
  }, [allPlayers, searchQuery, roleFilter, nationFilter, eraFilter, sortBy, selectedFormat]);

  // Current inspected player (default to first player or searched)
  const activePlayer = useMemo(() => {
    if (inspectedPlayerId) {
      const found = allPlayers.find((p) => p.id === inspectedPlayerId);
      if (found) return found;
    }
    return filteredPlayers[0] || allPlayers[0];
  }, [inspectedPlayerId, filteredPlayers, allPlayers]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredPlayers.length / ITEMS_PER_PAGE) || 1;
  const pagedPlayers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPlayers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPlayers, currentPage]);

  // Role Breakdown counts
  const roleCounts = useMemo(() => {
    let bat = 0;
    let bowl = 0;
    let wk = 0;
    let ar = 0;
    for (const p of allPlayers) {
      const cat = getStitchRoleCategory(p.primaryRole);
      if (cat === 'BATTER') bat++;
      else if (cat === 'BOWLER') bowl++;
      else if (cat === 'WK') wk++;
      else if (cat === 'ALL-ROUNDER') ar++;
    }
    return { bat, bowl, wk, ar, total: allPlayers.length };
  }, [allPlayers]);

  function handleDraftPlayer(player: PlayerProfile) {
    // Add to saved dream team
    try {
      const stored = localStorage.getItem('cricket_dream_teams');
      let teams = stored ? JSON.parse(stored) : [];
      let defaultTeam = teams[0] || {
        id: `team-${Date.now()}`,
        teamName: 'THUNDERBOLTS XI',
        format: selectedFormat,
        status: 'DRAFT',
        lineup: [],
        updatedAt: new Date().toISOString(),
      };

      const existingSlot = defaultTeam.lineup?.find((s: any) => s.playerId === player.id);
      if (existingSlot) {
        setDraftAlert(`${player.displayName} is already in your Playing XI!`);
        setTimeout(() => setDraftAlert(null), 3000);
        return;
      }

      if ((defaultTeam.lineup?.length || 0) >= 11) {
        setDraftAlert(`Your squad already has 11 players! Go to Dream XI to adjust lineup.`);
        setTimeout(() => setDraftAlert(null), 3500);
        return;
      }

      const nextOrder = (defaultTeam.lineup?.length || 0) + 1;
      const newSlot = {
        playerId: player.id,
        battingOrder: nextOrder,
        isCaptain: nextOrder === 1,
        isViceCaptain: nextOrder === 2,
        isDesignatedWicketkeeper: player.primaryRole === 'WICKETKEEPER_BATTER' || player.isWicketkeeper,
      };

      defaultTeam.lineup = [...(defaultTeam.lineup || []), newSlot];
      teams = [defaultTeam, ...teams.filter((t: any) => t.id !== defaultTeam.id)];
      localStorage.setItem('cricket_dream_teams', JSON.stringify(teams));

      setDraftAlert(`Added ${player.displayName} to Playing XI (Slot #${nextOrder})!`);
      setTimeout(() => setDraftAlert(null), 3000);
    } catch {
      // Fallback
    }
  }

  function handleResetFilters() {
    setSearchQuery('');
    setRoleFilter('ALL');
    setNationFilter('ALL');
    setEraFilter('ALL');
    setSortBy('OVR_DESC');
    setCurrentPage(1);
  }

  return (
    <div className="w-full flex flex-col min-h-screen bg-surface">
      {/* Subtle Atmospheric Accent Layer */}
      <div className="relative w-full overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-tertiary/5 rounded-full blur-3xl pointer-events-none" />

        {/* Header Section */}
        <section className="max-w-[1440px] mx-auto w-full px-4 md:px-margin-desktop pt-8 pb-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-secondary" />
                <span className="font-label-caps text-label-caps text-secondary uppercase tracking-widest">
                  GLOBAL CRICKET REPOSITORY // {allPlayers.length.toLocaleString()} ARCHIVES
                </span>
              </div>
              <h1 className="font-display-lg text-display-lg text-text-chalk tracking-tight uppercase">
                EXPLORE THE GAME&apos;S GREATS
              </h1>
              <p className="font-body-base text-body-base text-text-slate max-w-2xl mt-1">
                Discover iconic cricketers across countries, generations, and match formats. Calibrate ratings,
                inspect kinetic metrics, and recruit into your Dream XI.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-surface-card px-4 py-2 rounded-lg flex items-center gap-3 shadow-sm border border-border-hairline">
                <span className="font-label-caps text-label-caps text-text-subdued uppercase">
                  SALARY CAP REMAINING
                </span>
                <span className="font-scoreboard-md text-scoreboard-md text-tertiary">₹42.5 CR</span>
              </div>
            </div>
          </div>

          {draftAlert && (
            <div className="mb-4 bg-primary-container text-on-primary-container px-4 py-2.5 rounded-xl font-label-caps text-label-caps flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">sports_cricket</span>
                <span>{draftAlert}</span>
              </div>
              <Link href="/dream-teams" className="underline font-bold text-body-sm">
                VIEW SQUAD →
              </Link>
            </div>
          )}

          {/* Search & Main Command Filters */}
          <div className="bg-surface-card rounded-xl p-4 shadow-md space-y-4 border border-border-hairline">
            {/* Global Search Bar */}
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-subdued text-[22px]">
                search
              </span>
              <input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-surface-recessed rounded-lg pl-12 pr-28 py-3.5 font-body-base text-body-base text-text-chalk placeholder:text-text-subdued focus:outline-none focus:ring-1 focus:ring-tertiary transition-all"
                placeholder="Search 1,144+ players by name, signature trait, or country..."
                type="text"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {searchQuery ? (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="p-1 text-text-subdued hover:text-text-chalk"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                ) : (
                  <span className="bg-surface-elevated font-label-caps text-label-caps text-text-slate px-2 py-1 rounded">
                    ⌘K
                  </span>
                )}
                <button
                  onClick={() => setCurrentPage(1)}
                  className="bg-primary hover:bg-primary-container text-on-primary font-body-bold text-body-sm px-3.5 py-1.5 rounded transition-all flex items-center gap-1 shadow-[0_2px_8px_rgba(120,220,119,0.3)]"
                >
                  <span>FILTER</span>
                </button>
              </div>
            </div>

            {/* Role Quick Toggle Pills */}
            <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => {
                    setRoleFilter('ALL');
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 rounded-full font-label-caps text-label-caps uppercase transition-all ${
                    roleFilter === 'ALL'
                      ? 'bg-primary text-on-primary shadow-[0_2px_10px_rgba(120,220,119,0.25)]'
                      : 'bg-surface-elevated text-text-slate hover:bg-surface-bright'
                  }`}
                >
                  ALL PLAYERS ({roleCounts.total})
                </button>
                <button
                  onClick={() => {
                    setRoleFilter('BATTER');
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 rounded-full font-label-caps text-label-caps uppercase transition-all flex items-center gap-1.5 ${
                    roleFilter === 'BATTER'
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-elevated text-secondary hover:bg-surface-bright'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                  BATTERS ({roleCounts.bat})
                </button>
                <button
                  onClick={() => {
                    setRoleFilter('BOWLER');
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 rounded-full font-label-caps text-label-caps uppercase transition-all flex items-center gap-1.5 ${
                    roleFilter === 'BOWLER'
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-elevated text-telemetry-blue hover:bg-surface-bright'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-telemetry-blue" />
                  BOWLERS ({roleCounts.bowl})
                </button>
                <button
                  onClick={() => {
                    setRoleFilter('WK');
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 rounded-full font-label-caps text-label-caps uppercase transition-all flex items-center gap-1.5 ${
                    roleFilter === 'WK'
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-elevated text-warning-amber hover:bg-surface-bright'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-warning-amber" />
                  WICKETKEEPERS ({roleCounts.wk})
                </button>
                <button
                  onClick={() => {
                    setRoleFilter('ALL-ROUNDER');
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 rounded-full font-label-caps text-label-caps uppercase transition-all flex items-center gap-1.5 ${
                    roleFilter === 'ALL-ROUNDER'
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-elevated text-tertiary hover:bg-surface-bright'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
                  ALL-ROUNDERS ({roleCounts.ar})
                </button>
              </div>

              {/* Sort Dropdown Bar */}
              <div className="flex items-center gap-2">
                <span className="font-label-caps text-label-caps text-text-subdued uppercase">SORT BY:</span>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="appearance-none bg-surface-elevated text-text-chalk font-body-bold text-body-sm pl-3 pr-8 py-1.5 rounded-lg focus:outline-none cursor-pointer border border-border-hairline"
                  >
                    <option value="OVR_DESC">Overall Rating (High to Low)</option>
                    <option value="NAME_ASC">Player Name (A-Z)</option>
                    <option value="BAT_AVG">Batting Average (Descending)</option>
                    <option value="BOWL_ECON">Bowling Economy (Tightest)</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-text-subdued text-[18px]">
                    expand_more
                  </span>
                </div>
              </div>
            </div>

            {/* Secondary Multi-Tier Filter Docks */}
            <div className="flex flex-wrap items-center gap-3 pt-2 text-text-slate">
              {/* Country Filter */}
              <div className="flex items-center gap-2 bg-surface-recessed px-3 py-1.5 rounded-lg border border-border-hairline">
                <span className="material-symbols-outlined text-[16px] text-text-subdued">public</span>
                <span className="font-label-caps text-label-caps text-text-subdued uppercase">COUNTRY:</span>
                <select
                  value={nationFilter}
                  onChange={(e) => {
                    setNationFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-text-chalk font-body-sm text-body-sm focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Nations</option>
                  <option value="India">🇮🇳 India (IND)</option>
                  <option value="Australia">🇦🇺 Australia (AUS)</option>
                  <option value="England">🏴󠁧󠁢󠁥󠁮󠁧󠁿 England (ENG)</option>
                  <option value="Pakistan">🇵🇰 Pakistan (PAK)</option>
                  <option value="West Indies">🏝️ West Indies (WI)</option>
                  <option value="South Africa">🇿🇦 South Africa (SA)</option>
                  <option value="Sri Lanka">🇱🇰 Sri Lanka (SL)</option>
                  <option value="New Zealand">🇳🇿 New Zealand (NZ)</option>
                  <option value="Afghanistan">🇦🇫 Afghanistan (AFG)</option>
                </select>
              </div>

              {/* Era Filter */}
              <div className="flex items-center gap-2 bg-surface-recessed px-3 py-1.5 rounded-lg border border-border-hairline">
                <span className="material-symbols-outlined text-[16px] text-text-subdued">
                  history_toggle_off
                </span>
                <span className="font-label-caps text-label-caps text-text-subdued uppercase">ERA:</span>
                <select
                  value={eraFilter}
                  onChange={(e) => {
                    setEraFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-text-chalk font-body-sm text-body-sm focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Eras</option>
                  <option value="MODERN">Modern Era (2015 - Present)</option>
                  <option value="GOLDEN">Golden Era (1990 - 2014)</option>
                  <option value="CLASSIC">Classic Legends (Pre-1990)</option>
                </select>
              </div>

              {/* Format Suitability */}
              <div className="flex items-center gap-2 bg-surface-recessed px-3 py-1.5 rounded-lg border border-border-hairline">
                <span className="material-symbols-outlined text-[16px] text-text-subdued">
                  sports_cricket
                </span>
                <span className="font-label-caps text-label-caps text-text-subdued uppercase">FORMAT:</span>
                <div className="flex items-center gap-1.5 ml-1">
                  {(['T20', 'ODI', 'TEST_RED_BALL'] as MatchFormat[]).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setSelectedFormat(fmt)}
                      className={`px-2 py-0.5 rounded font-label-caps text-[10px] cursor-pointer transition-all ${
                        selectedFormat === fmt
                          ? fmt === 'T20'
                            ? 'bg-[#0C2B1D] text-primary ring-1 ring-primary'
                            : fmt === 'ODI'
                            ? 'bg-[#0E2342] text-telemetry-blue ring-1 ring-telemetry-blue'
                            : 'bg-[#2E0F0F] text-wicket-red ring-1 ring-wicket-red'
                          : 'bg-surface-elevated text-text-slate hover:brightness-125'
                      }`}
                    >
                      {fmt === 'TEST_RED_BALL' ? 'TEST' : fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reset Filter */}
              <button
                onClick={handleResetFilters}
                className="ml-auto font-label-caps text-label-caps text-text-subdued hover:text-text-chalk flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">refresh</span>
                RESET CRITERIA
              </button>
            </div>
          </div>
        </section>

        {/* Master-Detail Split Canvas */}
        <main className="max-w-[1440px] mx-auto w-full px-4 md:px-margin-desktop pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop items-start">
            {/* Left Side: Player Roster Matrix (7 Columns on Desktop) */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              <div className="flex items-center justify-between px-1">
                <span className="font-label-caps text-label-caps text-text-subdued uppercase tracking-wider">
                  SHOWING {pagedPlayers.length} OF {filteredPlayers.length.toLocaleString()} PROFILES // SORTED
                  BY RATING
                </span>
                <span className="font-label-caps text-label-caps text-primary">LIVE RADAR ACTIVE</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pagedPlayers.map((player, idx) => {
                  const isInspecting = activePlayer?.id === player.id;
                  const roleCat = getStitchRoleCategory(player.primaryRole);
                  const ovr = player.ratings[selectedFormat]?.overallRating ?? 75;
                  const batRating = player.ratings[selectedFormat]?.battingRating ?? 50;
                  const bowlRating = player.ratings[selectedFormat]?.bowlingRating ?? 50;
                  const portrait = getPlayerPortrait(player.id, idx + (currentPage - 1) * ITEMS_PER_PAGE);
                  const flag = getCountryFlag(player.primaryNationality);
                  const careerSpan = `${player.careerDebutYear}-${player.careerRetirementYear ? String(player.careerRetirementYear).slice(-2) : 'Pres'}`;

                  return (
                    <div
                      key={player.id}
                      onClick={() => setInspectedPlayerId(player.id)}
                      className={`bg-surface-card rounded-xl p-4 relative group shadow-md transition-all cursor-pointer border ${
                        isInspecting
                          ? 'border-primary ring-2 ring-primary bg-surface-elevated'
                          : 'border-border-hairline hover:bg-surface-elevated'
                      }`}
                    >
                      {isInspecting && (
                        <div className="absolute top-3 right-3 flex items-center gap-1 bg-surface-elevated px-2 py-0.5 rounded-full border border-primary/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                          <span className="font-label-caps text-label-caps text-text-chalk">INSPECTING</span>
                        </div>
                      )}

                      <div className="flex items-start gap-3">
                        <img
                          alt={player.displayName}
                          className="w-16 h-16 rounded-lg object-cover bg-surface-recessed shrink-0"
                          src={portrait}
                          onError={(e) => {
                            e.currentTarget.src = '/assets/stitch/asset-004.png';
                          }}
                        />
                        <div className="flex flex-col min-w-0 pr-12">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span
                              className={`px-2 py-0.5 rounded-full font-label-caps text-[10px] ${
                                roleCat === 'BATTER'
                                  ? 'bg-[#202920] text-secondary'
                                  : roleCat === 'BOWLER'
                                  ? 'bg-[#0F2430] text-telemetry-blue'
                                  : roleCat === 'WK'
                                  ? 'bg-amber-950/40 text-warning-amber'
                                  : 'bg-[#282310] text-tertiary'
                              }`}
                            >
                              {roleCat}
                            </span>
                            <span className="font-label-caps text-label-caps text-text-subdued">
                              {flag} {careerSpan}
                            </span>
                          </div>
                          <h3 className="font-title-md text-title-md text-text-chalk truncate leading-tight uppercase">
                            {player.displayName}
                          </h3>
                          <span className="font-body-sm text-body-sm text-tertiary truncate">
                            {player.fullName !== player.displayName ? player.fullName : player.primaryRole.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>

                      {/* Metrics Matrix Strip */}
                      <div className="grid grid-cols-4 gap-2 mt-4 bg-surface-recessed p-2.5 rounded-lg text-center">
                        <div>
                          <span className="font-label-caps text-[10px] text-text-subdued block uppercase">OVR</span>
                          <span className="font-scoreboard-md text-scoreboard-md text-tertiary">{ovr}</span>
                        </div>
                        <div>
                          <span className="font-label-caps text-[10px] text-text-subdued block uppercase">BAT</span>
                          <span className="font-scoreboard-md text-scoreboard-md text-text-chalk">{batRating}</span>
                        </div>
                        <div>
                          <span className="font-label-caps text-[10px] text-text-subdued block uppercase">BOWL</span>
                          <span className="font-scoreboard-md text-scoreboard-md text-text-slate">{bowlRating}</span>
                        </div>
                        <div>
                          <span className="font-label-caps text-[10px] text-text-subdued block uppercase">COST</span>
                          <span className="font-scoreboard-md text-scoreboard-md text-secondary">
                            ₹{(ovr * 0.1).toFixed(1)}M
                          </span>
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="flex items-center gap-2 mt-3 pt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectedPlayerId(player.id);
                          }}
                          className="flex-1 py-2 rounded bg-surface-elevated hover:bg-surface-bright text-text-chalk font-body-bold text-body-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                          <span>Inspect</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDraftPlayer(player);
                          }}
                          className="flex-1 py-2 rounded bg-primary hover:bg-primary-container text-on-primary font-body-bold text-body-sm flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">person_add</span>
                          <span>Draft XI</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Bar */}
              <div className="flex items-center justify-between bg-surface-card px-4 py-3 rounded-xl mt-2 shadow-sm border border-border-hairline">
                <span className="font-label-caps text-label-caps text-text-subdued uppercase">
                  PAGE {String(currentPage).padStart(2, '0')} OF {String(totalPages).padStart(2, '0')}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="p-2 rounded bg-surface-elevated text-text-slate hover:text-text-chalk disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>
                  <span className="px-3 py-1 rounded bg-primary text-on-primary font-label-caps text-label-caps">
                    {currentPage}
                  </span>
                  {currentPage < totalPages && (
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="px-3 py-1 rounded bg-surface-elevated hover:bg-surface-bright text-text-chalk font-label-caps text-label-caps cursor-pointer"
                    >
                      {currentPage + 1}
                    </button>
                  )}
                  {currentPage + 1 < totalPages && (
                    <>
                      <span className="text-text-subdued px-1">...</span>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        className="px-3 py-1 rounded bg-surface-elevated hover:bg-surface-bright text-text-chalk font-label-caps text-label-caps cursor-pointer"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="p-2 rounded bg-surface-elevated text-text-slate hover:text-text-chalk disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Side: Active Selected Player Detailed Profile (Dossier) */}
            {activePlayer && (
              <div className="lg:col-span-5 sticky top-24">
                <div className="bg-surface-card rounded-2xl p-6 shadow-xl flex flex-col gap-6 relative overflow-hidden border border-border-hairline">
                  {/* Decorative Subtle Accent Glow */}
                  <div className="absolute -top-20 -right-20 w-64 h-64 bg-tertiary/10 rounded-full blur-3xl pointer-events-none" />

                  {/* Profile Header Dock */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full font-label-caps text-label-caps bg-[#282310] text-tertiary shadow-[0_0_12px_rgba(212,175,55,0.25)] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">verified</span>
                        HALL OF FAME
                      </span>
                      <span className="px-2 py-1 rounded-full font-label-caps text-label-caps bg-surface-elevated text-text-slate">
                        ALL-TIME LEGEND
                      </span>
                    </div>
                    <div className="flex items-center gap-1 bg-surface-elevated px-2 py-1 rounded-lg">
                      <span className="font-label-caps text-label-caps text-text-subdued">STATUS:</span>
                      <span className="font-label-caps text-label-caps text-primary uppercase">UNLOCKED</span>
                    </div>
                  </div>

                  {/* Hero Avatar & Core Credentials */}
                  <div className="relative rounded-xl overflow-hidden bg-gradient-to-b from-surface-elevated to-surface-card p-5 border border-border-hairline">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                      <div className="relative shrink-0">
                        <img
                          alt={activePlayer.displayName}
                          className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl object-cover bg-surface-recessed shadow-lg"
                          src={getPlayerPortrait(activePlayer.id, 0)}
                          onError={(e) => {
                            e.currentTarget.src = '/assets/stitch/asset-004.png';
                          }}
                        />
                        <div className="absolute -bottom-2 -right-2 bg-tertiary text-on-tertiary px-2 py-0.5 rounded font-label-caps text-[11px] font-extrabold shadow-md">
                          {getCountryFlag(activePlayer.primaryNationality)}
                        </div>
                      </div>
                      <div className="flex flex-col text-center sm:text-left min-w-0">
                        <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                          <span className="font-label-caps text-label-caps text-text-subdued uppercase">
                            CAREER ERA: {activePlayer.careerDebutYear} –{' '}
                            {activePlayer.careerRetirementYear || 'PRESENT'}
                          </span>
                        </div>
                        <h2 className="font-headline-lg text-headline-lg text-text-chalk tracking-tight leading-none mb-1 uppercase">
                          {activePlayer.displayName}
                        </h2>
                        <p className="font-body-base text-body-base text-tertiary font-medium">
                          {activePlayer.fullName} • {activePlayer.primaryNationality}
                        </p>
                        <div className="flex items-center justify-center sm:justify-start gap-2 mt-3 flex-wrap">
                          <span className="px-2.5 py-1 rounded font-label-caps text-label-caps bg-[#202920] text-secondary">
                            {activePlayer.primaryRole.replace(/_/g, ' ')}
                          </span>
                          <span className="px-2.5 py-1 rounded font-label-caps text-label-caps bg-surface-elevated text-text-slate">
                            {activePlayer.battingHand.replace(/_/g, ' ')}
                          </span>
                          <span className="px-2.5 py-1 rounded font-label-caps text-label-caps bg-surface-elevated text-text-slate">
                            {activePlayer.bowlingStyle.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Huge Rating Badge Overlay */}
                    <div className="mt-4 pt-4 flex items-center justify-between bg-surface-recessed/60 px-4 py-3 rounded-lg border border-border-hairline">
                      <div className="flex flex-col">
                        <span className="font-label-caps text-label-caps text-text-subdued uppercase">
                          OVERALL RATING ({selectedFormat})
                        </span>
                        <span className="font-body-sm text-body-sm text-text-slate">
                          Confidence Tier: {activePlayer.ratings[selectedFormat]?.confidenceTier || 'GOLD'}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="font-scoreboard-xl text-scoreboard-xl text-tertiary leading-none">
                          {activePlayer.ratings[selectedFormat]?.overallRating ?? 85}
                        </span>
                        <span className="font-label-caps text-label-caps text-text-subdued">/100</span>
                      </div>
                    </div>
                  </div>

                  {/* Format Analytics Multi-Tab */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="font-label-caps text-label-caps text-text-subdued uppercase tracking-wider">
                        CAREER FORMAT TELEMETRY
                      </span>
                      <span className="font-label-caps text-label-caps text-secondary">ICN VERIFIED</span>
                    </div>

                    {/* Format Switcher */}
                    <div className="grid grid-cols-3 gap-1 bg-surface-recessed p-1 rounded-lg border border-border-hairline">
                      {(['TEST_RED_BALL', 'ODI', 'T20'] as MatchFormat[]).map((fmt) => (
                        <button
                          key={fmt}
                          onClick={() => setSelectedFormat(fmt)}
                          className={`py-1.5 text-center font-label-caps text-label-caps uppercase rounded transition-all cursor-pointer ${
                            selectedFormat === fmt
                              ? 'bg-surface-elevated text-text-chalk shadow-sm font-bold'
                              : 'text-text-subdued hover:text-text-chalk'
                          }`}
                        >
                          {fmt === 'TEST_RED_BALL' ? 'TEST' : fmt}
                        </button>
                      ))}
                    </div>

                    {/* Tabular Stat Breakdown Grid */}
                    <div className="grid grid-cols-4 gap-2 bg-surface-recessed p-3.5 rounded-xl text-center border border-border-hairline">
                      <div>
                        <span className="font-label-caps text-[10px] text-text-subdued uppercase block">
                          MATCHES
                        </span>
                        <span className="font-scoreboard-md text-scoreboard-md text-text-chalk">
                          {activePlayer.formatStats[selectedFormat]?.matchesPlayed ?? 45}
                        </span>
                        <span className="font-label-caps text-[9px] text-text-subdued block mt-0.5">
                          {activePlayer.formatStats[selectedFormat]?.inningsBatted ?? 38} INN
                        </span>
                      </div>
                      <div>
                        <span className="font-label-caps text-[10px] text-text-subdued uppercase block">RUNS</span>
                        <span className="font-scoreboard-md text-scoreboard-md text-primary">
                          {(activePlayer.formatStats[selectedFormat]?.runsScored ?? 1850).toLocaleString()}
                        </span>
                        <span className="font-label-caps text-[9px] text-text-subdued block mt-0.5">
                          SR: {activePlayer.formatStats[selectedFormat]?.strikeRate?.toFixed(1) ?? '132.5'}
                        </span>
                      </div>
                      <div>
                        <span className="font-label-caps text-[10px] text-text-subdued uppercase block">
                          CENTURIES
                        </span>
                        <span className="font-scoreboard-md text-scoreboard-md text-tertiary">
                          {activePlayer.formatStats[selectedFormat]?.centuries ?? 3}
                        </span>
                        <span className="font-label-caps text-[9px] text-text-subdued block mt-0.5">
                          50s: {activePlayer.formatStats[selectedFormat]?.halfCenturies ?? 12}
                        </span>
                      </div>
                      <div>
                        <span className="font-label-caps text-[10px] text-text-subdued uppercase block">
                          AVERAGE
                        </span>
                        <span className="font-scoreboard-md text-scoreboard-md text-secondary">
                          {(activePlayer.formatStats[selectedFormat]?.battingAverage ?? 42.5).toFixed(2)}
                        </span>
                        <span className="font-label-caps text-[9px] text-text-subdued block mt-0.5">
                          HS: {activePlayer.formatStats[selectedFormat]?.highestScore ?? 118}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Attribute Spectrum & Sliders */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="font-label-caps text-label-caps text-text-subdued uppercase tracking-wider">
                        TACTICAL ATTRIBUTE SPECTRUM
                      </span>
                      <span className="font-label-caps text-label-caps text-tertiary font-bold">
                        PRIME CALIBRATION
                      </span>
                    </div>
                    <div className="space-y-2.5 bg-surface-recessed p-4 rounded-xl border border-border-hairline">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-body-bold text-body-sm text-text-chalk">
                            Technique & Precision
                          </span>
                          <span className="font-scoreboard-md text-[14px] text-primary">
                            {activePlayer.attributes.technique}{' '}
                            <span className="text-text-subdued text-[10px]">/ 100</span>
                          </span>
                        </div>
                        <div className="w-full bg-surface-elevated h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-primary h-full rounded-full transition-all duration-500"
                            style={{ width: `${activePlayer.attributes.technique}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-body-bold text-body-sm text-text-chalk">
                            Match Temperament & Clutch
                          </span>
                          <span className="font-scoreboard-md text-[14px] text-primary">
                            {activePlayer.attributes.pressureHandling}
                          </span>
                        </div>
                        <div className="w-full bg-surface-elevated h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-primary h-full rounded-full transition-all duration-500"
                            style={{ width: `${activePlayer.attributes.pressureHandling}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-body-bold text-body-sm text-text-chalk">
                            Spin Handling & Footwork
                          </span>
                          <span className="font-scoreboard-md text-[14px] text-secondary">
                            {activePlayer.attributes.againstSpin}
                          </span>
                        </div>
                        <div className="w-full bg-surface-elevated h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-secondary h-full rounded-full transition-all duration-500"
                            style={{ width: `${activePlayer.attributes.againstSpin}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-body-bold text-body-sm text-text-chalk">
                            Pace & Bounce Mastery
                          </span>
                          <span className="font-scoreboard-md text-[14px] text-secondary">
                            {activePlayer.attributes.againstPace}
                          </span>
                        </div>
                        <div className="w-full bg-surface-elevated h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-secondary h-full rounded-full transition-all duration-500"
                            style={{ width: `${activePlayer.attributes.againstPace}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-body-bold text-body-sm text-text-chalk">
                            Running Speed & Agility
                          </span>
                          <span className="font-scoreboard-md text-[14px] text-text-slate">
                            {activePlayer.attributes.runningBetweenWickets}
                          </span>
                        </div>
                        <div className="w-full bg-surface-elevated h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-text-slate h-full rounded-full transition-all duration-500"
                            style={{ width: `${activePlayer.attributes.runningBetweenWickets}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Signature Traits Badges */}
                  <div className="flex flex-col gap-2">
                    <span className="font-label-caps text-label-caps text-text-subdued uppercase tracking-wider">
                      SIGNATURE TRAITS & ABILITIES
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="bg-surface-elevated p-2.5 rounded-lg flex flex-col gap-1 border border-border-hairline">
                        <div className="flex items-center gap-1.5 text-warning-amber">
                          <span className="material-symbols-outlined text-[16px]">cyclone</span>
                          <span className="font-label-caps text-[10px] font-bold">BIG MATCH CLUTCH</span>
                        </div>
                        <span className="font-body-sm text-[12px] text-text-slate leading-snug">
                          +{Math.round(activePlayer.attributes.bigMatchTemperament * 0.15)}% strike rate boost in
                          pressure chases.
                        </span>
                      </div>
                      <div className="bg-surface-elevated p-2.5 rounded-lg flex flex-col gap-1 border border-border-hairline">
                        <div className="flex items-center gap-1.5 text-secondary">
                          <span className="material-symbols-outlined text-[16px]">sports_baseball</span>
                          <span className="font-label-caps text-[10px] font-bold">TIMING MASTERY</span>
                        </div>
                        <span className="font-body-sm text-[12px] text-text-slate leading-snug">
                          {activePlayer.attributes.timing}/100 timing converts edge chances into boundary gaps.
                        </span>
                      </div>
                      <div className="bg-surface-elevated p-2.5 rounded-lg flex flex-col gap-1 border border-border-hairline">
                        <div className="flex items-center gap-1.5 text-telemetry-blue">
                          <span className="material-symbols-outlined text-[16px]">shield</span>
                          <span className="font-label-caps text-[10px] font-bold">RECOVERY RESILIENCE</span>
                        </div>
                        <span className="font-body-sm text-[12px] text-text-slate leading-snug">
                          Recovers momentum within 2 balls after consecutive dot balls.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Squad Recruitment Action Dock */}
                  <div className="pt-2 flex flex-col gap-2.5">
                    <button
                      onClick={() => handleDraftPlayer(activePlayer)}
                      className="w-full py-4 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-headline-md text-headline-md tracking-tight uppercase flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(120,220,119,0.3)] hover:scale-[1.01] transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[24px]">group_add</span>
                      <span>
                        ADD TO CURRENT SQUAD (CAP ₹
                        {((activePlayer.ratings[selectedFormat]?.overallRating ?? 85) * 0.1).toFixed(1)} CR)
                      </span>
                    </button>
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-1 text-text-subdued font-label-caps text-label-caps">
                        <span className="material-symbols-outlined text-[14px]">lock_reset</span>
                        INSTANT RE-SELL TAX 0%
                      </div>
                      <div className="flex items-center gap-1 text-secondary font-label-caps text-label-caps">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        SQUAD BALANCE COMPLIANT
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
