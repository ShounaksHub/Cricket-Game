'use client';

import React, { useMemo, useState } from 'react';
import { getAuthoritativePlayerImage } from '@/lib/player-image-resolver';
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

function getPlayerPortrait(playerOrId: any, index: number = 0): string {
  if (typeof playerOrId === 'object' && playerOrId !== null) {
    return getAuthoritativePlayerImage(
      playerOrId.id,
      playerOrId.fullName || playerOrId.displayName,
      playerOrId.primaryRole,
      playerOrId.primaryNationality
    );
  }
  const idStr = String(playerOrId || '');
  const found = VERIFIED_BENCHMARK_PLAYERS.find((p) => p.id === idStr);
  return getAuthoritativePlayerImage(
    idStr,
    found?.fullName || found?.displayName,
    found?.primaryRole,
    found?.primaryNationality
  );
}

const ITEMS_PER_PAGE = 8;

export default function PlayerCataloguePage() {
  const [selectedFormat, setSelectedFormat] = useState<MatchFormat>('T20');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'BATTER' | 'WK' | 'ALL-ROUNDER' | 'BOWLER'>('ALL');
  const [nationFilter, setNationFilter] = useState<string>('ALL');
  const [eraFilter, setEraFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'RUNS_DESC' | 'WICKETS_DESC' | 'NAME_ASC' | 'BAT_AVG' | 'BOWL_ECON'>('RUNS_DESC');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [inspectedPlayerId, setInspectedPlayerId] = useState<string | null>(null);

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
      if (sortBy === 'RUNS_DESC') {
        return (b.formatStats[selectedFormat]?.runsScored ?? 0) - (a.formatStats[selectedFormat]?.runsScored ?? 0);
      }
      if (sortBy === 'WICKETS_DESC') {
        return (b.formatStats[selectedFormat]?.wicketsTaken ?? 0) - (a.formatStats[selectedFormat]?.wicketsTaken ?? 0);
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
  const activeStats = activePlayer?.formatStats[selectedFormat];

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

  function handleResetFilters() {
    setSearchQuery('');
    setRoleFilter('ALL');
    setNationFilter('ALL');
    setEraFilter('ALL');
    setSortBy('RUNS_DESC');
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
                  Player archive · {allPlayers.length.toLocaleString()} players
                </span>
              </div>
              <h1 className="font-display-lg text-display-lg text-text-chalk tracking-tight">
                Cricket player archive
              </h1>
              <p className="font-body-base text-body-base text-text-slate max-w-2xl mt-1">
                Browse recorded career data across nations, generations, and formats. Unverified fields stay blank rather than becoming guesses.
              </p>
            </div>
          </div>

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
                placeholder="Search players by name or country..."
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
                ) : null}
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
                    <option value="RUNS_DESC">Career Runs (High to Low)</option>
                    <option value="WICKETS_DESC">Career Wickets (High to Low)</option>
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

              {/* Career record format */}
              <div className="flex items-center gap-2 bg-surface-recessed px-3 py-1.5 rounded-lg border border-border-hairline">
                <span className="material-symbols-outlined text-[16px] text-text-subdued">
                  sports_cricket
                </span>
                <span className="font-label-caps text-label-caps text-text-subdued uppercase">RECORD FORMAT:</span>
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
                  SHOWING {pagedPlayers.length} OF {filteredPlayers.length.toLocaleString()} PROFILES
                </span>
                <span className="font-label-caps text-label-caps text-primary">SELECT A PROFILE TO VIEW RECORD</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pagedPlayers.map((player, idx) => {
                  const isInspecting = activePlayer?.id === player.id;
                  const roleCat = getStitchRoleCategory(player.primaryRole);
                  const stats = player.formatStats[selectedFormat];
                  const portrait = getPlayerPortrait(player, idx + (currentPage - 1) * ITEMS_PER_PAGE);
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

                      {/* Recorded career statistics for the selected format. */}
                      <div className="grid grid-cols-4 gap-2 mt-4 bg-surface-recessed p-2.5 rounded-lg text-center">
                        <div>
                          <span className="font-label-caps text-[10px] text-text-subdued block uppercase">MATCHES</span>
                          <span className="font-scoreboard-md text-scoreboard-md text-text-chalk">{stats?.matchesPlayed ?? '—'}</span>
                        </div>
                        <div>
                          <span className="font-label-caps text-[10px] text-text-subdued block uppercase">RUNS</span>
                          <span className="font-scoreboard-md text-scoreboard-md text-primary">{stats ? stats.runsScored.toLocaleString() : '—'}</span>
                        </div>
                        <div>
                          <span className="font-label-caps text-[10px] text-text-subdued block uppercase">AVG</span>
                          <span className="font-scoreboard-md text-scoreboard-md text-secondary">{stats?.battingAverage?.toFixed(2) ?? '—'}</span>
                        </div>
                        <div>
                          <span className="font-label-caps text-[10px] text-text-subdued block uppercase">WKTS</span>
                          <span className="font-scoreboard-md text-scoreboard-md text-telemetry-blue">{stats?.wicketsTaken ?? '—'}</span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectedPlayerId(player.id);
                          }}
                          className="w-full py-2 rounded bg-surface-elevated hover:bg-surface-bright text-text-chalk font-body-bold text-body-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                          <span>View career record</span>
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
                      <span className="px-2.5 py-1 rounded-full font-label-caps text-label-caps bg-[#202920] text-secondary flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">verified</span>
                        ARCHIVE PROFILE
                      </span>
                    </div>
                    <div className="flex items-center gap-1 bg-surface-elevated px-2 py-1 rounded-lg">
                      <span className="font-label-caps text-label-caps text-text-subdued">STATUS:</span>
                      <span className="font-label-caps text-label-caps text-primary uppercase">{activePlayer.isActive ? 'ACTIVE' : 'RETIRED'}</span>
                    </div>
                  </div>

                  {/* Hero Avatar & Core Credentials */}
                  <div className="relative rounded-xl overflow-hidden bg-gradient-to-b from-surface-elevated to-surface-card p-5 border border-border-hairline">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                      <div className="relative shrink-0">
                        <img
                          alt={activePlayer.displayName}
                          className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl object-cover bg-surface-recessed shadow-lg"
                          src={getPlayerPortrait(activePlayer, 0)}
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

                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="font-label-caps text-label-caps text-text-subdued uppercase tracking-wider">
                        RECORDED CAREER STATISTICS
                      </span>
                      <span className="font-label-caps text-label-caps text-secondary">ARCHIVE RECORD</span>
                    </div>

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

                    {activeStats ? (
                      <>
                        <div className="rounded-xl border border-border-hairline bg-surface-recessed p-3">
                          <p className="mb-2 font-label-caps text-[10px] uppercase text-text-subdued">Batting</p>
                          <div className="grid grid-cols-4 gap-2 text-center">
                            {[
                              ['Matches', activeStats.matchesPlayed], ['Innings', activeStats.inningsBatted],
                              ['Runs', activeStats.runsScored.toLocaleString()], ['High score', activeStats.highestScore],
                              ['Average', activeStats.battingAverage?.toFixed(2) ?? '—'], ['Strike rate', activeStats.strikeRate?.toFixed(1) ?? '—'],
                              ['100s / 50s', `${activeStats.centuries} / ${activeStats.halfCenturies}`], ['4s / 6s', activeStats.fours === null && activeStats.sixes === null ? '—' : `${activeStats.fours ?? '—'} / ${activeStats.sixes ?? '—'}`],
                            ].map(([label, value]) => (
                              <div key={String(label)}>
                                <span className="block font-label-caps text-[9px] uppercase text-text-subdued">{label}</span>
                                <span className="font-scoreboard-md text-[15px] text-text-chalk">{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-xl border border-border-hairline bg-surface-recessed p-3">
                          <p className="mb-2 font-label-caps text-[10px] uppercase text-text-subdued">Bowling & fielding</p>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            {[
                              ['Balls bowled', activeStats.ballsBowled], ['Wickets', activeStats.wicketsTaken], ['Bowling average', activeStats.bowlingAverage?.toFixed(2) ?? '—'],
                              ['Economy', activeStats.economyRate?.toFixed(2) ?? '—'], ['Five-wicket hauls', activeStats.fiveWicketHauls], ['Catches / stumpings', `${activeStats.catchesTaken} / ${activeStats.stumpingsMade}`],
                            ].map(([label, value]) => (
                              <div key={String(label)}>
                                <span className="block font-label-caps text-[9px] uppercase text-text-subdued">{label}</span>
                                <span className="font-scoreboard-md text-[15px] text-telemetry-blue">{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <p className="text-[10px] text-text-subdued">Data source: {activeStats.dataSourceId}</p>
                      </>
                    ) : (
                      <div className="rounded-xl border border-border-hairline bg-surface-recessed p-4 text-sm text-text-slate">
                        No verified {selectedFormat === 'TEST_RED_BALL' ? 'Test' : selectedFormat} career record is available for this player.
                      </div>
                    )}
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
