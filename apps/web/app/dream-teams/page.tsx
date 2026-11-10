'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getAuthoritativePlayerImage } from '@/lib/player-image-resolver';
import { useRouter } from 'next/navigation';
import {
  SUPPORTED_NATIONAL_TEAMS,
  buildNationalLineup,
  buildWorldXILineup,
} from '@/lib/national-teams';
import type {
  MatchFormat,
  PlayerProfile,
  PrimaryRole,
  SquadValidationResult,
  SquadAnalyticsResult,
  DreamTeamPlayerSlotInput,
  PlayerSquadContext,
} from '@cricket/shared-types';
import {
  ingestPlayerRecord,
  VERIFIED_BENCHMARK_PLAYERS,
} from '@cricket/data-ingestion';
import {
  validateDreamTeamSquad,
  calculateSquadAnalytics,
} from '@cricket/cricket-rules';

interface SelectedSlot {
  playerId: string;
  battingOrder: number;
  isCaptain: boolean;
  isViceCaptain: boolean;
  isDesignatedWicketkeeper: boolean;
  bowlingPriority?: number | null;
}

interface SavedTeam {
  id: string;
  teamName: string;
  format: MatchFormat;
  status: 'DRAFT' | 'MATCH_READY';
  lineup: SelectedSlot[];
  updatedAt: string;
}

const LOCAL_STORAGE_TEAMS_KEY = 'cricket_dream_teams';

// Role classification helper for Stitch pill styling
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

// Map player ID to local asset portrait with consistent fallbacks
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

export default function DreamXIBuilderPage() {
  const router = useRouter();
  const [selectedFormat, setSelectedFormat] = useState<MatchFormat>('T20');
  const [teamName, setTeamName] = useState<string>('My Dream XI');
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlot[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'BATTER' | 'WK' | 'ALL-ROUNDER' | 'BOWLER'>('ALL');
  const [nationFilter, setNationFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'OVR_DESC' | 'BAT_AVG' | 'BOWL_SR' | 'NAME_ASC'>('OVR_DESC');
  const [onePerNationEnabled, setOnePerNationEnabled] = useState<boolean>(true);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Ingest all 1,144 players
  const allPlayerProfiles = useMemo<PlayerProfile[]>(() => {
    return VERIFIED_BENCHMARK_PLAYERS.map(ingestPlayerRecord);
  }, []);

  const playerProfileMap = useMemo<Map<string, PlayerProfile>>(() => {
    const map = new Map<string, PlayerProfile>();
    for (const p of allPlayerProfiles) {
      map.set(p.id, p);
    }
    return map;
  }, [allPlayerProfiles]);

  const playerContextMap = useMemo<Map<string, PlayerSquadContext>>(() => {
    const map = new Map<string, PlayerSquadContext>();
    for (const p of allPlayerProfiles) {
      map.set(p.id, {
        id: p.id,
        fullName: p.fullName,
        displayName: p.displayName,
        primaryNationality: p.primaryNationality,
        primaryRole: p.primaryRole,
        battingHand: p.battingHand,
        bowlingStyle: p.bowlingStyle,
        isWicketkeeper: p.isWicketkeeper,
        formatRating: p.ratings[selectedFormat],
        ratings: p.ratings,
        attributes: p.attributes,
      });
    }
    return map;
  }, [allPlayerProfiles, selectedFormat]);

  // Load saved dream team or populate default benchmark
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_TEAMS_KEY);
      if (stored) {
        const teams: SavedTeam[] = JSON.parse(stored);
        if (teams.length > 0) {
          const t = teams[0];
          setTeamName(t.teamName || 'My Dream XI');
          setSelectedFormat(t.format || 'T20');
          setSelectedSlots(t.lineup || []);
          return;
        }
      }
    } catch {
      // Ignore
    }

    // Default: Initial 11 squad (One per nation)
    if (allPlayerProfiles.length > 0) {
      const worldRes = buildWorldXILineup(allPlayerProfiles, 'T20');
      const slots: SelectedSlot[] = worldRes.lineup.map((slot) => ({
        playerId: slot.playerId,
        battingOrder: slot.battingOrder,
        isCaptain: slot.isCaptain,
        isViceCaptain: slot.isViceCaptain,
        isDesignatedWicketkeeper: slot.isDesignatedWicketkeeper,
        bowlingPriority: slot.bowlingPriority,
      }));
      setSelectedSlots(slots);
    }
  }, [allPlayerProfiles]);

  // Filtered & Sorted talent pool
  const displayedPlayers = useMemo(() => {
    let list = allPlayerProfiles.filter((p) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (p.displayName || p.fullName).toLowerCase().includes(q);
        const matchesCountry = (p.primaryNationality || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCountry) return false;
      }

      // Role filter
      if (roleFilter !== 'ALL') {
        const cat = getStitchRoleCategory(p.primaryRole);
        if (cat !== roleFilter) return false;
      }

      // Nation filter
      if (nationFilter !== 'ALL') {
        const pNat = (p.primaryNationality || '').toLowerCase();
        if (!pNat.includes(nationFilter.toLowerCase())) return false;
      }

      return true;
    });

    // Sorting
    list = [...list].sort((a, b) => {
      const aOvr = a.ratings[selectedFormat]?.overallRating ?? 75;
      const bOvr = b.ratings[selectedFormat]?.overallRating ?? 75;
      if (sortBy === 'OVR_DESC') return bOvr - aOvr;

      const aBat = a.formatStats[selectedFormat]?.battingAverage ?? 0;
      const bBat = b.formatStats[selectedFormat]?.battingAverage ?? 0;
      if (sortBy === 'BAT_AVG') return bBat - aBat;

      if (sortBy === 'BOWL_SR') {
        const aBowl = a.formatStats[selectedFormat]?.bowlingAverage || 999;
        const bBowl = b.formatStats[selectedFormat]?.bowlingAverage || 999;
        return aBowl - bBowl;
      }
      if (sortBy === 'NAME_ASC') return (a.displayName || a.fullName).localeCompare(b.displayName || b.fullName);
      return 0;
    });

    return list;
  }, [allPlayerProfiles, searchQuery, roleFilter, nationFilter, sortBy, selectedFormat]);

  // Selected player lookup set
  const selectedPlayerIdSet = useMemo(() => {
    return new Set(selectedSlots.map((s) => s.playerId));
  }, [selectedSlots]);

  // Validation & Analytics results using authoritative engine
  const validationResult = useMemo<SquadValidationResult>(() => {
    return validateDreamTeamSquad(selectedFormat, selectedSlots, playerContextMap, {
      requireMatchReady: selectedSlots.length === 11,
      uniqueNationRule: onePerNationEnabled,
    });
  }, [selectedFormat, selectedSlots, playerContextMap, onePerNationEnabled]);

  const analyticsResult = useMemo<SquadAnalyticsResult>(() => {
    return calculateSquadAnalytics(selectedFormat, selectedSlots, playerContextMap);
  }, [selectedFormat, selectedSlots, playerContextMap]);

  // Role Breakdown Counters
  const roleBreakdown = useMemo(() => {
    let bat = 0;
    let wk = 0;
    let ar = 0;
    let bowl = 0;
    for (const s of selectedSlots) {
      const p = playerProfileMap.get(s.playerId);
      if (!p) continue;
      const cat = getStitchRoleCategory(p.primaryRole);
      if (cat === 'BATTER') bat++;
      else if (cat === 'WK') wk++;
      else if (cat === 'ALL-ROUNDER') ar++;
      else if (cat === 'BOWLER') bowl++;
    }
    return { bat, wk, ar, bowl };
  }, [selectedSlots, playerProfileMap]);

  // Nation distribution check (One player per nation rule)
  const nationConflicts = useMemo(() => {
    if (!onePerNationEnabled) return [];
    const counts: Record<string, number> = {};
    for (const s of selectedSlots) {
      const p = playerProfileMap.get(s.playerId);
      if (p) {
        counts[p.primaryNationality] = (counts[p.primaryNationality] || 0) + 1;
      }
    }
    return Object.entries(counts).filter(([_, count]) => count > 1);
  }, [selectedSlots, playerProfileMap, onePerNationEnabled]);

  // Add player to XI
  function handleAddPlayer(playerId: string) {
    if (selectedSlots.length >= 11) return;
    if (selectedPlayerIdSet.has(playerId)) return;

    const profile = playerProfileMap.get(playerId);
    if (!profile) return;

    // Check one per nation rule
    if (onePerNationEnabled) {
      const existingSlot = selectedSlots.find((s) => {
        const ep = playerProfileMap.get(s.playerId);
        return ep?.primaryNationality.toLowerCase() === profile.primaryNationality.toLowerCase();
      });
      if (existingSlot) {
        const existingPlayer = playerProfileMap.get(existingSlot.playerId);
        alert(
          `One Team Per Nation Rule Active: Your squad already contains a player from ${profile.primaryNationality} (${existingPlayer?.displayName}). Remove them first or disable the rule!`,
        );
        return;
      }
    }

    const nextOrder = selectedSlots.length + 1;
    const isWk = profile.primaryRole === 'WICKETKEEPER_BATTER' || profile.isWicketkeeper;
    const hasCaptain = selectedSlots.some((s) => s.isCaptain);
    const hasViceCaptain = selectedSlots.some((s) => s.isViceCaptain);

    setSelectedSlots((prev) => [
      ...prev,
      {
        playerId,
        battingOrder: nextOrder,
        isCaptain: !hasCaptain,
        isViceCaptain: hasCaptain && !hasViceCaptain,
        isDesignatedWicketkeeper: isWk,
      },
    ]);
  }

  // Remove player from XI
  function handleRemoveSlot(index: number) {
    setSelectedSlots((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.map((slot, i) => ({ ...slot, battingOrder: i + 1 }));
    });
  }

  // Set Captain
  function handleSetCaptain(index: number) {
    setSelectedSlots((prev) =>
      prev.map((slot, i) => ({
        ...slot,
        isCaptain: i === index,
        isViceCaptain: i === index ? false : slot.isViceCaptain,
      })),
    );
  }

  // Set Vice Captain
  function handleSetViceCaptain(index: number) {
    setSelectedSlots((prev) =>
      prev.map((slot, i) => ({
        ...slot,
        isViceCaptain: i === index,
        isCaptain: i === index ? false : slot.isCaptain,
      })),
    );
  }

  // Set Wicketkeeper
  function handleSetWicketkeeper(index: number) {
    setSelectedSlots((prev) =>
      prev.map((slot, i) => ({
        ...slot,
        isDesignatedWicketkeeper: i === index,
      })),
    );
  }

  // Auto-Fill Best XI (World XI)
  function handleAutoFillBestXI() {
    const worldXI = buildWorldXILineup(allPlayerProfiles, selectedFormat);
    const slots: SelectedSlot[] = worldXI.lineup.map((slot) => ({
      playerId: slot.playerId,
      battingOrder: slot.battingOrder,
      isCaptain: slot.isCaptain,
      isViceCaptain: slot.isViceCaptain,
      isDesignatedWicketkeeper: slot.isDesignatedWicketkeeper,
      bowlingPriority: slot.bowlingPriority,
    }));
    setSelectedSlots(slots);
  }

  // Clear Squad
  function handleClearSquad() {
    if (confirm('Clear all 11 players from your current squad?')) {
      setSelectedSlots([]);
    }
  }

  // Save Squad to LocalStorage
  function handleSaveSquad() {
    const isReady = validationResult.isValid && selectedSlots.length === 11 && nationConflicts.length === 0;
    const newTeam: SavedTeam = {
      id: `team-${Date.now()}`,
      teamName: teamName.trim() || 'My Dream XI',
      format: selectedFormat,
      status: isReady ? 'MATCH_READY' : 'DRAFT',
      lineup: selectedSlots,
      updatedAt: new Date().toISOString(),
    };
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_TEAMS_KEY);
      let list: SavedTeam[] = stored ? JSON.parse(stored) : [];
      list = [newTeam, ...list.filter((t) => t.teamName !== newTeam.teamName)];
      localStorage.setItem(LOCAL_STORAGE_TEAMS_KEY, JSON.stringify(list));
      localStorage.setItem('cricket_active_user_team', JSON.stringify(newTeam));
      setSaveSuccessMsg('Squad locked & saved to Local Storage!');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch {
      // Ignore
    }
  }

  // Proceed to Match Setup / Toss
  function handleProceedToMatch() {
    handleSaveSquad();
    router.push(`/match?format=${selectedFormat}`);
  }

  const isSquadReady = validationResult.isValid && selectedSlots.length === 11 && nationConflicts.length === 0;

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 md:px-margin-desktop py-space-md flex-1 flex flex-col gap-space-md select-none">
      {/* Top Breadcrumb & Status Overline */}
      <div className="flex flex-wrap items-center justify-between gap-space-sm pb-space-xs border-b border-border-hairline">
        <div className="flex items-center gap-space-sm">
          <Link href="/" className="font-label-caps text-label-caps text-text-subdued hover:text-text-chalk transition-colors">
            PAVILION
          </Link>
          <span className="text-text-subdued">/</span>
          <span className="font-label-caps text-label-caps text-primary uppercase tracking-widest font-bold">
            DREAM XI BUILDER • PLAYING XI
          </span>
        </div>

        {/* 1 Team per Nation Toggle */}
        <div className="flex items-center gap-space-md">
          <label className="flex items-center gap-2 cursor-pointer bg-surface-card px-3 py-1 rounded-full border border-border-hairline hover:border-border-focus transition-colors">
            <input
              type="checkbox"
              checked={onePerNationEnabled}
              onChange={(e) => setOnePerNationEnabled(e.target.checked)}
              className="rounded bg-surface-elevated border-border-hairline text-primary focus:ring-0 cursor-pointer"
            />
            <span className="font-label-caps text-[10px] text-secondary font-bold uppercase tracking-wider">
              1 PLAYER PER NATION RULE
            </span>
          </label>

          <button
            onClick={handleAutoFillBestXI}
            className="font-label-caps text-[10px] bg-surface-elevated hover:bg-surface-bright text-text-chalk px-3 py-1 rounded-full border border-border-hairline uppercase transition-all"
            type="button"
          >
            AUTO-FILL WORLD XI
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="bg-primary-container text-on-primary-container px-4 py-2 rounded-lg font-label-caps text-label-caps flex items-center justify-between shadow-md">
          <span>{saveSuccessMsg}</span>
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
        </div>
      )}

      {/* Main Split Architecture: Left Talent Pool (55%) & Right Squad Roster (45%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* LEFT COLUMN: PLAYER DISCOVERY POOL (7 cols on desktop) */}
        <div className="lg:col-span-7 flex flex-col gap-space-md">
          {/* Search, Role Filters & Sort Bar */}
          <div className="bg-surface-card rounded-xl p-space-md shadow-lg border border-border-hairline flex flex-col gap-space-sm">
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-subdued text-[20px]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by player name or nation (e.g. Kohli, Bumrah, AUS)..."
                className="w-full bg-surface-recessed text-text-chalk placeholder-text-subdued pl-10 pr-4 py-2.5 rounded-lg border border-border-hairline focus:outline-none focus:border-tertiary transition-colors text-body-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-subdued hover:text-text-chalk"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              )}
            </div>

            {/* Filter Pills Row */}
            <div className="flex flex-wrap items-center justify-between gap-space-sm pt-space-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'ALL', label: 'ALL' },
                  { id: 'BATTER', label: 'BATTER' },
                  { id: 'WK', label: 'WICKETKEEPER' },
                  { id: 'ALL-ROUNDER', label: 'ALL-ROUNDER' },
                  { id: 'BOWLER', label: 'BOWLER' },
                ].map((rf) => (
                  <button
                    key={rf.id}
                    onClick={() => setRoleFilter(rf.id as any)}
                    className={`px-3 py-1 rounded-full font-label-caps text-label-caps uppercase font-bold transition-all ${
                      roleFilter === rf.id
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'bg-surface-elevated text-text-slate hover:text-text-chalk hover:bg-surface-container'
                    }`}
                    type="button"
                  >
                    {rf.label}
                  </button>
                ))}
              </div>

              {/* Sort & Country Dropdown */}
              <div className="flex items-center gap-2">
                <select
                  value={nationFilter}
                  onChange={(e) => setNationFilter(e.target.value)}
                  className="bg-surface-recessed text-text-slate text-body-sm px-2.5 py-1 rounded border border-border-hairline focus:outline-none focus:border-tertiary cursor-pointer"
                >
                  <option value="ALL">All Nations</option>
                  <option value="India">🇮🇳 India</option>
                  <option value="Australia">🇦🇺 Australia</option>
                  <option value="England">🏴󠁧󠁢󠁥󠁮󠁧󠁿 England</option>
                  <option value="South Africa">🇿🇦 South Africa</option>
                  <option value="New Zealand">🇳🇿 New Zealand</option>
                  <option value="Pakistan">🇵🇰 Pakistan</option>
                  <option value="West Indies">🏝️ West Indies</option>
                  <option value="Sri Lanka">🇱🇰 Sri Lanka</option>
                  <option value="Afghanistan">🇦🇫 Afghanistan</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-surface-recessed text-text-slate text-body-sm px-2.5 py-1 rounded border border-border-hairline focus:outline-none focus:border-tertiary cursor-pointer"
                >
                  <option value="OVR_DESC">OVR (Highest)</option>
                  <option value="BAT_AVG">Batting Avg</option>
                  <option value="BOWL_SR">Bowling Avg</option>
                  <option value="NAME_ASC">Name (A-Z)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Player Count Telemetry & Quick Instruction */}
          <div className="flex items-center justify-between px-space-xs">
            <div className="flex items-center gap-space-sm">
              <span className="font-headline-md text-title-md text-text-chalk tracking-tight">TALENT POOL</span>
              <span className="bg-surface-elevated text-text-slate text-body-sm px-2 py-0.5 rounded-full font-label-caps">
                {displayedPlayers.length} PLAYERS AVAILABLE
              </span>
            </div>
            <div className="flex items-center gap-space-xs font-label-caps text-label-caps text-text-subdued">
              <span className="material-symbols-outlined text-[16px] text-primary">touch_app</span>
              <span>CLICK CARD OR TAP BUTTON TO ADD</span>
            </div>
          </div>

          {/* Player Cards Grid (Bento Matrix) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md max-h-[720px] overflow-y-auto pr-1">
            {displayedPlayers.slice(0, 40).map((player, idx) => {
              const isSelected = selectedPlayerIdSet.has(player.id);
              const roleCat = getStitchRoleCategory(player.primaryRole);
              const flag = getCountryFlag(player.primaryNationality);
              const portrait = getPlayerPortrait(player, idx);
              const ovr = player.ratings[selectedFormat]?.overallRating ?? 75;
              const batAvg = player.formatStats[selectedFormat]?.battingAverage ?? 0;
              const batSr = player.formatStats[selectedFormat]?.strikeRate ?? 120;
              const bowlAvg = player.formatStats[selectedFormat]?.bowlingAverage ?? 0;

              return (
                <div
                  key={player.id}
                  className={`player-card group relative bg-surface-card rounded-xl p-space-md shadow-lg transition-all border ${
                    isSelected
                      ? 'border-primary ring-1 ring-primary/40 bg-surface-elevated'
                      : 'border-border-hairline hover:bg-surface-elevated hover:scale-[1.01]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-space-sm mb-space-sm">
                    <div className="flex items-center gap-space-sm">
                      <div className="relative w-12 h-12 rounded-lg bg-surface-container overflow-hidden shrink-0">
                        <img
                          alt={player.displayName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          src={portrait}
                          onError={(e) => {
                            e.currentTarget.src = '/assets/stitch/asset-004.png';
                          }}
                        />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-body-sm">{flag}</span>
                          <span className="font-title-md text-title-md text-text-chalk group-hover:text-primary transition-colors truncate">
                            {player.displayName}
                          </span>
                        </div>
                        <span className="font-label-caps text-label-caps text-text-slate truncate">
                          {player.primaryRole.replace(/_/g, ' ')} • {player.primaryNationality}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span className="font-scoreboard-md text-scoreboard-md text-tertiary font-bold tracking-tight">
                        {ovr}
                      </span>
                      <span className="font-label-caps text-[9px] text-text-subdued uppercase">OVR</span>
                    </div>
                  </div>

                  {/* Role & Attribute Chips */}
                  <div className="flex items-center gap-space-xs mb-space-sm flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded-full font-label-caps text-label-caps ${
                        roleCat === 'BATTER'
                          ? 'bg-wicket-red-container text-warning-amber'
                          : roleCat === 'WK'
                          ? 'bg-amber-950/40 text-warning-amber'
                          : roleCat === 'ALL-ROUNDER'
                          ? 'bg-[#282310] text-tertiary'
                          : 'bg-[#0F2430] text-telemetry-blue'
                      }`}
                    >
                      {roleCat}
                    </span>
                    <span className="px-2 py-0.5 rounded-full font-label-caps text-label-caps bg-surface-recessed text-text-slate">
                      BAT: {batAvg.toFixed(1)}
                    </span>
                    <span className="px-2 py-0.5 rounded-full font-label-caps text-label-caps bg-surface-recessed text-text-slate">
                      SR: {batSr.toFixed(1)}
                    </span>
                    {bowlAvg > 0 && (
                      <span className="px-2 py-0.5 rounded-full font-label-caps text-label-caps bg-surface-recessed text-secondary">
                        BOWL: {bowlAvg.toFixed(1)}
                      </span>
                    )}
                  </div>

                  {/* Card Action Deck */}
                  <div className="flex items-center justify-between pt-space-xs border-t border-border-hairline">
                    <span className="font-label-caps text-label-caps text-text-subdued tracking-wider">
                      CAP: ₹{(ovr * 0.1).toFixed(1)} CR
                    </span>
                    {isSelected ? (
                      <span className="px-space-md py-1.5 rounded-lg bg-surface-container text-primary font-headline-md text-body-sm font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">check</span>
                        <span>IN SQUAD</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAddPlayer(player.id)}
                        disabled={selectedSlots.length >= 11}
                        className="px-space-md py-1.5 rounded-lg bg-surface-elevated hover:bg-primary hover:text-on-primary text-text-chalk font-headline-md text-body-sm font-bold transition-all flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        <span>SELECT</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: TACTICAL ROSTER & TELEMETRY DECK (5 cols on desktop) */}
        <div className="lg:col-span-5 flex flex-col gap-space-md sticky top-24">
          {/* Squad Header & Format Switcher */}
          <div className="bg-surface-card rounded-xl p-space-md shadow-xl border border-border-hairline flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">shield</span>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="font-headline-md text-title-md bg-transparent border-b border-transparent hover:border-border-hairline focus:border-tertiary text-text-chalk focus:outline-none transition-colors"
                />
              </div>

              <div className="flex items-center gap-1 bg-surface-recessed p-1 rounded-lg">
                {(['T20', 'ODI', 'TEST_RED_BALL'] as MatchFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setSelectedFormat(fmt)}
                    className={`px-2 py-0.5 rounded font-label-caps text-[10px] uppercase font-bold transition-all ${
                      selectedFormat === fmt
                        ? 'bg-tertiary text-on-tertiary shadow-sm'
                        : 'text-text-subdued hover:text-text-chalk'
                    }`}
                    type="button"
                  >
                    {fmt === 'TEST_RED_BALL' ? 'TEST' : fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* Squad Counters Bento */}
            <div className="grid grid-cols-4 gap-space-xs text-center pt-space-xs border-t border-border-hairline">
              <div className="bg-surface-elevated p-2 rounded-lg">
                <span className="font-scoreboard-md text-headline-sm text-text-chalk block">
                  {selectedSlots.length}/11
                </span>
                <span className="font-label-caps text-[10px] text-text-subdued uppercase">TOTAL</span>
              </div>
              <div className="bg-surface-elevated p-2 rounded-lg">
                <span className="font-scoreboard-md text-headline-sm text-warning-amber block">
                  {roleBreakdown.bat}
                </span>
                <span className="font-label-caps text-[10px] text-text-subdued uppercase">BAT</span>
              </div>
              <div className="bg-surface-elevated p-2 rounded-lg">
                <span className="font-scoreboard-md text-headline-sm text-tertiary block">
                  {roleBreakdown.ar}
                </span>
                <span className="font-label-caps text-[10px] text-text-subdued uppercase">ALL-RD</span>
              </div>
              <div className="bg-surface-elevated p-2 rounded-lg">
                <span className="font-scoreboard-md text-headline-sm text-telemetry-blue block">
                  {roleBreakdown.bowl}
                </span>
                <span className="font-label-caps text-[10px] text-text-subdued uppercase">BOWL</span>
              </div>
            </div>
          </div>

          {/* Tactical Radar & Telemetry Deck */}
          <div className="bg-surface-card rounded-xl p-space-md shadow-lg border border-border-hairline flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-label-caps text-text-subdued uppercase tracking-wider">
                TEAM DYNAMICS METRICS
              </span>
              <span className="font-label-caps text-label-caps text-secondary font-bold">
                {analyticsResult.overallBalance > 75 ? 'TACTICAL OPTIMAL' : 'BALANCED FORMATION'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-space-sm">
              <div className="flex flex-col gap-1 bg-surface-recessed p-2.5 rounded-lg">
                <div className="flex justify-between items-center font-label-caps text-label-caps">
                  <span className="text-text-slate">BATTING DEPTH</span>
                  <span className="text-primary font-bold">
                    {Math.round(analyticsResult.dimensions.battingStrength.score)} / 100
                  </span>
                </div>
                <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${Math.round(analyticsResult.dimensions.battingStrength.score)}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1 bg-surface-recessed p-2.5 rounded-lg">
                <div className="flex justify-between items-center font-label-caps text-label-caps">
                  <span className="text-text-slate">BOWLING VARIETY</span>
                  <span className="text-telemetry-blue font-bold">
                    {Math.round(analyticsResult.dimensions.bowlingDepth.score)} / 100
                  </span>
                </div>
                <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden">
                  <div
                    className="h-full bg-telemetry-blue rounded-full"
                    style={{ width: `${Math.round(analyticsResult.dimensions.bowlingDepth.score)}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1 bg-surface-recessed p-2.5 rounded-lg">
                <div className="flex justify-between items-center font-label-caps text-label-caps">
                  <span className="text-text-slate">OVERALL BALANCE</span>
                  <span className="text-secondary font-bold">
                    {Math.round(analyticsResult.overallBalance)} OVR
                  </span>
                </div>
                <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden">
                  <div
                    className="h-full bg-secondary rounded-full"
                    style={{ width: `${Math.round(analyticsResult.overallBalance)}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1 bg-surface-recessed p-2.5 rounded-lg">
                <div className="flex justify-between items-center font-label-caps text-label-caps">
                  <span className="text-text-slate">FIELDING AGILITY</span>
                  <span className="text-tertiary font-bold">
                    {Math.round(analyticsResult.dimensions.fieldingStrength.score)} / 100
                  </span>
                </div>
                <div className="w-full h-1 bg-surface-container rounded-full overflow-hidden">
                  <div
                    className="h-full bg-tertiary rounded-full"
                    style={{ width: `${Math.round(analyticsResult.dimensions.fieldingStrength.score)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Batting Order Slots 01-11 Interactive List */}
          <div className="bg-surface-card rounded-xl p-space-sm shadow-xl border border-border-hairline flex flex-col gap-1.5 max-h-[460px] overflow-y-auto pr-1">
            <div className="px-space-sm py-1 flex items-center justify-between text-text-subdued font-label-caps text-[10px] uppercase">
              <span>POS / PLAYER IDENTITY</span>
              <span>ROLE • MULTIPLIERS • DROP</span>
            </div>

            {selectedSlots.length === 0 ? (
              <div className="p-8 text-center text-text-subdued flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-[36px] text-text-subdued">group_add</span>
                <span className="font-label-caps text-label-caps uppercase">NO PLAYERS SELECTED YET</span>
                <p className="text-body-sm text-text-slate">Add players from the Talent Pool to form your Playing XI.</p>
              </div>
            ) : (
              selectedSlots.map((slot, idx) => {
                const profile = playerProfileMap.get(slot.playerId);
                if (!profile) return null;
                const flag = getCountryFlag(profile.primaryNationality);
                const ovr = profile.ratings[selectedFormat]?.overallRating ?? 75;

                return (
                  <div
                    key={slot.playerId}
                    className="squad-slot flex items-center justify-between p-2 rounded-lg bg-surface-elevated transition-all hover:bg-surface-container-high group border border-border-hairline"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-scoreboard-md text-body-sm text-text-subdued w-5">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[12px]">{flag}</span>
                          <span className="font-body-bold text-body-sm text-text-chalk truncate">
                            {profile.displayName}
                          </span>
                          {slot.isCaptain && (
                            <span className="text-tertiary font-extrabold text-[11px] bg-surface-recessed px-1 rounded shadow-sm">
                              C
                            </span>
                          )}
                          {slot.isViceCaptain && (
                            <span className="text-secondary font-extrabold text-[11px] bg-surface-recessed px-1 rounded shadow-sm">
                              VC
                            </span>
                          )}
                          {slot.isDesignatedWicketkeeper && (
                            <span className="text-warning-amber font-extrabold text-[10px] bg-surface-recessed px-1 rounded">
                              🧤 WK
                            </span>
                          )}
                        </div>
                        <span className="font-label-caps text-[9px] text-text-subdued truncate">
                          {profile.primaryRole.replace(/_/g, ' ')} • {profile.primaryNationality} • {ovr} OVR
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleSetCaptain(idx)}
                        className={`px-2 py-0.5 rounded text-[10px] font-label-caps transition-all ${
                          slot.isCaptain
                            ? 'bg-tertiary text-on-tertiary font-black shadow-sm'
                            : 'bg-surface-recessed text-text-slate hover:text-text-chalk'
                        }`}
                        title="Set Captain"
                        type="button"
                      >
                        C
                      </button>
                      <button
                        onClick={() => handleSetViceCaptain(idx)}
                        className={`px-2 py-0.5 rounded text-[10px] font-label-caps transition-all ${
                          slot.isViceCaptain
                            ? 'bg-secondary text-on-secondary font-black shadow-sm'
                            : 'bg-surface-recessed text-text-slate hover:text-text-chalk'
                        }`}
                        title="Set Vice-Captain"
                        type="button"
                      >
                        VC
                      </button>
                      <button
                        onClick={() => handleSetWicketkeeper(idx)}
                        className={`px-2 py-0.5 rounded text-[10px] font-label-caps transition-all ${
                          slot.isDesignatedWicketkeeper
                            ? 'bg-warning-amber text-on-primary font-black shadow-sm'
                            : 'bg-surface-recessed text-text-slate hover:text-text-chalk'
                        }`}
                        title="Designate Wicketkeeper"
                        type="button"
                      >
                        WK
                      </button>
                      <button
                        onClick={() => handleRemoveSlot(idx)}
                        className="text-text-subdued hover:text-error transition-colors p-1"
                        title="Drop Player"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Tactical Compliance & Rules Checklist */}
          <div className="bg-surface-card rounded-xl p-space-md shadow-lg border border-border-hairline flex flex-col gap-space-sm">
            <div
              className={`flex items-center justify-between p-space-sm rounded-lg ${
                isSquadReady
                  ? 'bg-primary-container text-on-primary-container'
                  : 'bg-wicket-red-container text-warning-amber'
              }`}
            >
              <div className="flex items-center gap-2 font-headline-md text-body-sm font-bold">
                <span className="material-symbols-outlined text-[18px]">
                  {isSquadReady ? 'verified' : 'warning'}
                </span>
                <span>
                  {isSquadReady
                    ? 'SQUAD VERIFIED • 11/11 READY'
                    : `SQUAD INCOMPLETE (${selectedSlots.length}/11 SELECTED)`}
                </span>
              </div>
              <span className="font-label-caps text-label-caps font-bold">
                {isSquadReady ? 'MATCH READY' : 'RULES RESTRICTION'}
              </span>
            </div>

            {/* Validation Checklist / Errors */}
            {!isSquadReady && (
              <div className="text-body-sm text-text-slate space-y-1 pt-1">
                {selectedSlots.length !== 11 && (
                  <div>• Exactly 11 players required (Current: {selectedSlots.length})</div>
                )}
                {validationResult.errors.map((err, i) => (
                  <div key={i} className="text-error font-medium">
                    • {err.message}
                  </div>
                ))}
                {nationConflicts.length > 0 && (
                  <div className="text-error font-bold">
                    • 1 Player Per Nation Conflict: Duplicate selections for {nationConflicts.map(([c]) => c).join(', ')}
                  </div>
                )}
              </div>
            )}

            {isSquadReady && (
              <p className="text-body-sm text-text-slate">
                1 Captain • 1 Vice-Captain • 1 Wicketkeeper • All-Rounder Balance Verified. Ready for Toss!
              </p>
            )}

            {/* Lock in Squad & Proceed Button */}
            <button
              onClick={handleProceedToMatch}
              disabled={!isSquadReady}
              className="w-full mt-2 py-3 bg-primary text-on-primary font-headline-md text-title-md uppercase tracking-wider rounded-lg font-extrabold shadow-[0_4px_24px_rgba(120,220,119,0.35)] hover:shadow-[0_8px_32px_rgba(120,220,119,0.5)] transition-all flex items-center justify-center gap-space-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">sports_cricket</span>
              <span>LOCK IN SQUAD & PROCEED TO TOSS</span>
            </button>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={handleSaveSquad}
                className="text-text-slate hover:text-text-chalk text-body-sm font-label-caps transition-colors"
                type="button"
              >
                SAVE AS DRAFT
              </button>
              <button
                onClick={handleClearSquad}
                className="text-error/80 hover:text-error text-body-sm font-label-caps transition-colors"
                type="button"
              >
                RESET SQUAD
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
