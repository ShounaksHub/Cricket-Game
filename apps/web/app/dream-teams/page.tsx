'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Shield,
  Trophy,
  Users,
  Search,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Copy,
  Save,
  BarChart3,
  RotateCcw,
  Sparkles,
  Award,
  Flame,
  Activity,
  Layers,
} from 'lucide-react';
import type {
  HistoricalEra,
  MatchFormat,
  PlayerFormatRating,
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

const FORMAT_OPTIONS: Array<{ id: MatchFormat; label: string; badge: string }> = [
  { id: 'T20', label: 'T20', badge: 'Fast-Paced' },
  { id: 'ODI', label: 'ODI', badge: '50 Overs' },
  { id: 'TEST_RED_BALL', label: 'Test (Red)', badge: 'Traditional 5-Day' },
  { id: 'TEST_PINK_BALL', label: 'Test (Pink)', badge: 'Day / Night' },
  { id: 'T10', label: 'T10', badge: '10 Overs' },
];

const ROLE_OPTIONS: Array<{ id: PrimaryRole | 'ALL'; label: string }> = [
  { id: 'ALL', label: 'All Roles' },
  { id: 'TOP_ORDER_BATTER', label: 'Top Order' },
  { id: 'MIDDLE_ORDER_BATTER', label: 'Middle Order' },
  { id: 'WICKETKEEPER_BATTER', label: 'Wicketkeeper' },
  { id: 'BATTING_ALL_ROUNDER', label: 'Batting All-Rounder' },
  { id: 'BOWLING_ALL_ROUNDER', label: 'Bowling All-Rounder' },
  { id: 'PACE_BOWLER', label: 'Pace Bowler' },
  { id: 'SPIN_BOWLER', label: 'Spin Bowler' },
];

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

export default function DreamTeamBuilderPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  // 1. Master Player Catalogue
  const allPlayers: PlayerProfile[] = useMemo(() => {
    return VERIFIED_BENCHMARK_PLAYERS.map((raw) => ingestPlayerRecord(raw));
  }, []);

  const playerLookup = useMemo(() => {
    const map = new Map<string, PlayerProfile>();
    for (const p of allPlayers) {
      map.set(p.id, p);
    }
    return map;
  }, [allPlayers]);

  // 2. Team State
  const [currentTeamId, setCurrentTeamId] = useState<string>('default-team-1');
  const [teamName, setTeamName] = useState<string>('Thunderbolts XI');
  const [format, setFormat] = useState<MatchFormat>('T20');
  const [lineup, setLineup] = useState<SelectedSlot[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'lineup' | 'analytics'>('lineup');

  // 3. Catalogue Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<PrimaryRole | 'ALL'>('ALL');
  const [savedTeams, setSavedTeams] = useState<SavedTeam[]>([]);

  // Initialize with initial lineup if empty
  useEffect(() => {
    // Populate sample 11-player squad for immediate visual richness
    if (lineup.length === 0 && allPlayers.length >= 11) {
      const initial: SelectedSlot[] = allPlayers.slice(0, 11).map((p, idx) => ({
        playerId: p.id,
        battingOrder: idx + 1,
        isCaptain: idx === 0,
        isViceCaptain: idx === 1,
        isDesignatedWicketkeeper: p.isWicketkeeper || idx === 2,
        bowlingPriority: null,
      }));
      setLineup(initial);
    }
  }, [allPlayers]);

  // Context map for rules & analytics
  const squadContextMap = useMemo(() => {
    const map = new Map<string, PlayerSquadContext>();
    for (const slot of lineup) {
      const p = playerLookup.get(slot.playerId);
      if (p) {
        map.set(slot.playerId, {
          id: p.id,
          fullName: p.fullName,
          displayName: p.displayName,
          primaryRole: p.primaryRole,
          battingHand: p.battingHand,
          bowlingStyle: p.bowlingStyle,
          isWicketkeeper: p.isWicketkeeper,
          formatRating: p.ratings[format],
          ratings: p.ratings,
        });
      }
    }
    return map;
  }, [lineup, playerLookup, format]);

  // 4. Live Squad Validation
  const validation: SquadValidationResult = useMemo(() => {
    return validateDreamTeamSquad(format, lineup, squadContextMap, {
      requireMatchReady: lineup.length === 11,
    });
  }, [format, lineup, squadContextMap]);

  // 5. Live Squad Analytics (8 Dimensions)
  const analytics: SquadAnalyticsResult = useMemo(() => {
    return calculateSquadAnalytics(format, lineup, squadContextMap);
  }, [format, lineup, squadContextMap]);

  // 6. Filtered Player Catalogue
  const filteredPlayers = useMemo(() => {
    return allPlayers.filter((p) => {
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const matchName = p.fullName.toLowerCase().includes(q) || p.displayName.toLowerCase().includes(q);
        const matchNat = p.primaryNationality.toLowerCase().includes(q);
        if (!matchName && !matchNat) return false;
      }
      if (selectedRole !== 'ALL' && p.primaryRole !== selectedRole) {
        return false;
      }
      return true;
    });
  }, [allPlayers, searchQuery, selectedRole]);

  // Helpers
  const isPlayerInSquad = (playerId: string) => lineup.some((s) => s.playerId === playerId);

  const getPlayerSquadSlot = (playerId: string) => lineup.find((s) => s.playerId === playerId);

  const addPlayerToSquad = (playerId: string) => {
    if (isPlayerInSquad(playerId)) return;
    if (lineup.length >= 11) {
      setStatusMessage({ type: 'error', text: 'Squad is full (11/11). Remove a player first.' });
      return;
    }

    // Find first vacant batting order 1..11
    const occupiedOrders = new Set(lineup.map((s) => s.battingOrder));
    let nextOrder = 1;
    while (occupiedOrders.has(nextOrder) && nextOrder <= 11) {
      nextOrder++;
    }

    const p = playerLookup.get(playerId);
    const hasKeeper = lineup.some((s) => s.isDesignatedWicketkeeper);
    const hasCaptain = lineup.some((s) => s.isCaptain);

    const newSlot: SelectedSlot = {
      playerId,
      battingOrder: nextOrder,
      isCaptain: !hasCaptain,
      isViceCaptain: false,
      isDesignatedWicketkeeper: !hasKeeper && (p?.isWicketkeeper ?? false),
    };

    setLineup((prev) => [...prev, newSlot].sort((a, b) => a.battingOrder - b.battingOrder));
    setStatusMessage({ type: 'success', text: `Added ${p?.displayName ?? 'Player'} to slot #${nextOrder}` });
  };

  const removePlayerFromSquad = (playerId: string) => {
    const p = playerLookup.get(playerId);
    setLineup((prev) => prev.filter((s) => s.playerId !== playerId));
    setStatusMessage({ type: 'success', text: `Removed ${p?.displayName ?? 'Player'} from squad` });
  };

  const moveOrder = (slotIndex: number, direction: 'UP' | 'DOWN') => {
    const targetIndex = direction === 'UP' ? slotIndex - 1 : slotIndex + 1;
    if (targetIndex < 0 || targetIndex >= lineup.length) return;

    const updated = [...lineup];
    const currentOrder = updated[slotIndex].battingOrder;
    const targetOrder = updated[targetIndex].battingOrder;

    updated[slotIndex] = { ...updated[slotIndex], battingOrder: targetOrder };
    updated[targetIndex] = { ...updated[targetIndex], battingOrder: currentOrder };

    updated.sort((a, b) => a.battingOrder - b.battingOrder);
    setLineup(updated);
  };

  const toggleCaptain = (playerId: string) => {
    setLineup((prev) =>
      prev.map((s) => ({
        ...s,
        isCaptain: s.playerId === playerId ? !s.isCaptain : false,
      }))
    );
  };

  const toggleWicketkeeper = (playerId: string) => {
    setLineup((prev) =>
      prev.map((s) => ({
        ...s,
        isDesignatedWicketkeeper: s.playerId === playerId ? !s.isDesignatedWicketkeeper : false,
      }))
    );
  };

  const handleSaveDraft = async () => {
    const teamRecord: SavedTeam = {
      id: currentTeamId,
      teamName,
      format,
      status: 'DRAFT',
      lineup,
      updatedAt: new Date().toISOString(),
    };
    try {
      await fetch(`${apiUrl}/dream-teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamName,
          format,
          status: 'DRAFT',
          lineup,
        }),
      });
    } catch {
      // In offline mode, save locally
    }
    setSavedTeams((prev) => [teamRecord, ...prev.filter((t) => t.id !== currentTeamId)]);
    setStatusMessage({ type: 'success', text: `Draft saved successfully (${lineup.length} players)` });
  };

  const handleDuplicate = () => {
    const newId = `team-${Date.now()}`;
    const copyName = `${teamName} (Copy)`.slice(0, 64);
    setCurrentTeamId(newId);
    setTeamName(copyName);
    setStatusMessage({ type: 'success', text: `Duplicated as "${copyName}"` });
  };

  const handleClearLineup = () => {
    setLineup([]);
    setStatusMessage({ type: 'success', text: 'Lineup cleared' });
  };

  return (
    <main className="min-h-screen bg-[#0E1013] text-[#F8F9FA] px-4 py-6 md:px-8 md:py-8 font-sans">
      {/* Top Header & Navigation */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-[#2E3440] gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="w-10 h-10 rounded-lg bg-[#0D4A38] border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] hover:scale-105 transition-transform"
          >
            <Trophy className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="bg-transparent text-xl md:text-2xl font-bold tracking-tight text-[#F8F9FA] border-b border-transparent hover:border-[#D4AF37]/50 focus:border-[#D4AF37] focus:outline-none transition-colors"
                title="Click to edit team name"
              />
              <span
                className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                  validation.isMatchReady
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50'
                    : 'bg-amber-950 text-amber-300 border border-amber-700/50'
                }`}
              >
                {validation.isMatchReady ? 'MATCH READY' : `DRAFT (${lineup.length}/11)`}
              </span>
            </div>
            <p className="text-xs text-[#9CA3AF]">
              Architectural Playing XI Builder &middot; 8-Dimension Analytical Balance Engine
            </p>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={handleSaveDraft}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181B20] border border-[#2E3440] hover:border-[#D4AF37] text-xs font-semibold text-[#D4AF37] transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Draft</span>
          </button>
          <button
            onClick={handleDuplicate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181B20] border border-[#2E3440] hover:border-[#F8F9FA]/40 text-xs text-[#9CA3AF] transition-all"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Duplicate</span>
          </button>
          <button
            onClick={handleClearLineup}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181B20] border border-[#2E3440] hover:border-rose-500/50 text-xs text-rose-400 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <Link
            href="/players"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181B20] border border-[#2E3440] hover:border-[#D4AF37] text-xs text-[#9CA3AF] hover:text-[#F8F9FA] transition-all"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Player Registry</span>
          </Link>
        </div>
      </header>

      {/* Format Selection Strip */}
      <section className="max-w-7xl mx-auto py-4 flex flex-wrap items-center justify-between gap-4 border-b border-[#2E3440]/60">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-[#9CA3AF] font-medium mr-1">Format:</span>
          {FORMAT_OPTIONS.map((fmt) => (
            <button
              key={fmt.id}
              onClick={() => setFormat(fmt.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                format === fmt.id
                  ? 'bg-[#0D4A38] text-[#D4AF37] border border-[#D4AF37]/60 shadow-lg'
                  : 'bg-[#181B20] text-[#9CA3AF] border border-[#2E3440] hover:border-[#9CA3AF]'
              }`}
            >
              {fmt.label}
            </button>
          ))}
        </div>

        {/* Status Toast Banner */}
        {statusMessage && (
          <div
            className={`text-xs px-3 py-1 rounded-md flex items-center gap-1.5 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                : 'bg-rose-950/80 text-rose-300 border border-rose-800'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}
      </section>

      {/* Main Dual-Pane Workspace */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* LEFT PANE: Cricketer Selection Catalogue (5 cols) */}
        <section className="lg:col-span-5 flex flex-col gap-4 bg-[#14171C] rounded-xl border border-[#2E3440] p-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#2E3440]">
            <div>
              <h2 className="text-sm font-bold tracking-tight text-[#F8F9FA] uppercase flex items-center gap-2">
                <Users className="w-4 h-4 text-[#D4AF37]" />
                <span>Player Registry</span>
              </h2>
              <p className="text-[11px] text-[#9CA3AF]">
                Select historical & contemporary cricketers for {format}
              </p>
            </div>
            <span className="text-xs font-mono text-[#D4AF37] bg-[#181B20] px-2 py-0.5 rounded border border-[#2E3440]">
              {filteredPlayers.length} Available
            </span>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#9CA3AF]" />
            <input
              type="text"
              placeholder="Search by cricketer name or nation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#181B20] border border-[#2E3440] rounded-lg pl-9 pr-3 py-2 text-xs text-[#F8F9FA] focus:outline-none focus:border-[#D4AF37] transition-colors"
            />
          </div>

          {/* Role Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {ROLE_OPTIONS.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRole(r.id)}
                className={`px-2.5 py-1 rounded text-[11px] whitespace-nowrap transition-colors ${
                  selectedRole === r.id
                    ? 'bg-[#D4AF37] text-[#0E1013] font-bold'
                    : 'bg-[#181B20] text-[#9CA3AF] hover:text-[#F8F9FA] border border-[#2E3440]'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Scrollable Player List */}
          <div className="flex flex-col gap-2 max-h-[620px] overflow-y-auto pr-1">
            {filteredPlayers.map((player) => {
              const inSquad = isPlayerInSquad(player.id);
              const slot = getPlayerSquadSlot(player.id);
              const fmtRating = player.ratings[format];
              const overall = fmtRating?.overallRating ?? 50;

              return (
                <div
                  key={player.id}
                  className={`p-3 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                    inSquad
                      ? 'bg-[#0D4A38]/30 border-[#D4AF37]/50'
                      : 'bg-[#181B20] border-[#2E3440] hover:border-[#D4AF37]/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Overall Rating Pill */}
                    <div
                      className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center font-bold text-xs border ${
                        overall >= 85
                          ? 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]'
                          : overall >= 75
                          ? 'bg-emerald-950/40 text-emerald-400 border-emerald-600'
                          : 'bg-slate-800 text-slate-300 border-slate-600'
                      }`}
                    >
                      <span>{overall}</span>
                      <span className="text-[8px] uppercase tracking-tighter opacity-80">RATING</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#F8F9FA]">{player.fullName}</span>
                        {player.isWicketkeeper && (
                          <span className="text-[9px] bg-amber-950 text-amber-300 px-1 rounded border border-amber-800">
                            WK
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#9CA3AF]">
                        <span>{player.primaryNationality}</span>
                        <span>&middot;</span>
                        <span className="capitalize">{player.primaryRole.replace(/_/g, ' ').toLowerCase()}</span>
                      </div>
                      {/* Sub-ratings */}
                      <div className="flex items-center gap-2 text-[10px] text-[#9CA3AF] mt-0.5">
                        <span>BAT: {fmtRating?.battingRating ?? 50}</span>
                        <span>&middot;</span>
                        <span>BOWL: {fmtRating?.bowlingRating ?? 50}</span>
                        <span>&middot;</span>
                        <span>FLD: {fmtRating?.fieldingRating ?? 50}</span>
                      </div>
                    </div>
                  </div>

                  {/* Add / In Squad Action */}
                  {inSquad ? (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#D4AF37] bg-[#0D4A38]/60 px-2.5 py-1 rounded border border-[#D4AF37]/40">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>#{slot?.battingOrder}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => addPlayerToSquad(player.id)}
                      disabled={lineup.length >= 11}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#0D4A38] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#0E1013] text-xs font-semibold border border-[#D4AF37]/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      title={lineup.length >= 11 ? 'Squad is full' : 'Add to Playing XI'}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* RIGHT PANE: Playing XI Board & Tactical Analytics (7 cols) */}
        <section className="lg:col-span-7 flex flex-col gap-4">
          {/* Live Validation Alert Banner */}
          <div
            className={`p-3 rounded-xl border flex flex-col gap-2 ${
              validation.isMatchReady
                ? 'bg-emerald-950/20 border-emerald-700/60'
                : 'bg-amber-950/20 border-amber-700/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {validation.isMatchReady ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                )}
                <div>
                  <h3 className="text-xs font-bold text-[#F8F9FA]">
                    {validation.isMatchReady
                      ? 'Squad Approved & Ready For Match Simulation'
                      : `Squad Configuration Incomplete (${lineup.length}/11 Players)`}
                  </h3>
                  <div className="flex items-center gap-3 text-[11px] text-[#9CA3AF] mt-0.5">
                    <span>
                      Players: <strong className="text-[#F8F9FA]">{validation.summary.playerCount}/11</strong>
                    </span>
                    <span>&middot;</span>
                    <span>
                      Keepers: <strong className="text-[#F8F9FA]">{validation.summary.keeperCount}</strong>
                    </span>
                    <span>&middot;</span>
                    <span>
                      Bowlers: <strong className="text-[#F8F9FA]">{validation.summary.bowlerCount}</strong> (min 5)
                    </span>
                    <span>&middot;</span>
                    <span>
                      Captains: <strong className="text-[#F8F9FA]">{validation.summary.captainCount}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* View Switcher Tabs */}
              <div className="flex items-center gap-1 bg-[#181B20] p-1 rounded-lg border border-[#2E3440]">
                <button
                  onClick={() => setActiveTab('lineup')}
                  className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    activeTab === 'lineup'
                      ? 'bg-[#0D4A38] text-[#D4AF37]'
                      : 'text-[#9CA3AF] hover:text-[#F8F9FA]'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Lineup XI</span>
                </button>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    activeTab === 'analytics'
                      ? 'bg-[#0D4A38] text-[#D4AF37]'
                      : 'text-[#9CA3AF] hover:text-[#F8F9FA]'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Analytics (8D)</span>
                </button>
              </div>
            </div>

            {/* Validation Issues Breakdown */}
            {(validation.errors.length > 0 || validation.warnings.length > 0) && (
              <div className="pt-2 border-t border-[#2E3440]/60 flex flex-col gap-1 text-[11px]">
                {validation.errors.map((err, i) => (
                  <div key={`err-${i}`} className="flex items-center gap-1.5 text-rose-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    <span>{err.message}</span>
                    {err.suggestedCorrection && (
                      <span className="text-rose-300/80 italic">({err.suggestedCorrection})</span>
                    )}
                  </div>
                ))}
                {validation.warnings.map((warn, i) => (
                  <div key={`warn-${i}`} className="flex items-center gap-1.5 text-amber-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>{warn.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* TAB 1: Playing XI Lineup Board */}
          {activeTab === 'lineup' && (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 11 }).map((_, idx) => {
                const battingOrder = idx + 1;
                const slot = lineup.find((s) => s.battingOrder === battingOrder);
                const player = slot ? playerLookup.get(slot.playerId) : null;
                const fmtRating = player?.ratings[format];

                if (!slot || !player) {
                  return (
                    <div
                      key={`empty-${battingOrder}`}
                      className="p-3 rounded-lg border border-dashed border-[#2E3440] bg-[#14171C]/50 flex items-center justify-between text-[#9CA3AF] text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#181B20] border border-[#2E3440] flex items-center justify-center font-mono font-bold text-xs text-[#9CA3AF]">
                          {battingOrder}
                        </span>
                        <span>Vacant Slot &mdash; Select a player from registry</span>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider text-[#9CA3AF]/60">Unassigned</span>
                    </div>
                  );
                }

                return (
                  <div
                    key={slot.playerId}
                    className="p-3 rounded-lg border border-[#2E3440] bg-[#14171C] hover:border-[#D4AF37]/50 transition-all flex items-center justify-between gap-3"
                  >
                    {/* Left: Position & Player Info */}
                    <div className="flex items-center gap-3">
                      {/* Batting Order Pill */}
                      <span className="w-7 h-7 rounded-lg bg-[#0D4A38] border border-[#D4AF37]/50 text-[#D4AF37] font-mono font-bold text-xs flex items-center justify-center">
                        {battingOrder}
                      </span>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#F8F9FA]">{player.fullName}</span>
                          {/* Captain Badge */}
                          {slot.isCaptain && (
                            <span className="text-[9px] font-bold bg-[#D4AF37] text-[#0E1013] px-1.5 rounded">
                              CAPTAIN
                            </span>
                          )}
                          {/* Designated Keeper Badge */}
                          {slot.isDesignatedWicketkeeper && (
                            <span className="text-[9px] font-bold bg-amber-900 text-amber-200 px-1.5 rounded">
                              KEEPER
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-[#9CA3AF]">
                          <span>{player.primaryNationality}</span>
                          <span>&middot;</span>
                          <span className="capitalize">{player.primaryRole.replace(/_/g, ' ').toLowerCase()}</span>
                          <span>&middot;</span>
                          <span className="text-[#D4AF37] font-semibold">OVR {fmtRating?.overallRating ?? 50}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Controls (Move Up/Down, Roles, Remove) */}
                    <div className="flex items-center gap-1.5">
                      {/* Move Order Up */}
                      <button
                        onClick={() => moveOrder(idx, 'UP')}
                        disabled={idx === 0}
                        className="p-1.5 rounded bg-[#181B20] border border-[#2E3440] hover:border-[#D4AF37] disabled:opacity-30 disabled:cursor-not-allowed text-[#9CA3AF] hover:text-[#F8F9FA]"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      {/* Move Order Down */}
                      <button
                        onClick={() => moveOrder(idx, 'DOWN')}
                        disabled={idx === lineup.length - 1}
                        className="p-1.5 rounded bg-[#181B20] border border-[#2E3440] hover:border-[#D4AF37] disabled:opacity-30 disabled:cursor-not-allowed text-[#9CA3AF] hover:text-[#F8F9FA]"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Toggle Captain */}
                      <button
                        onClick={() => toggleCaptain(slot.playerId)}
                        className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                          slot.isCaptain
                            ? 'bg-[#D4AF37] text-[#0E1013]'
                            : 'bg-[#181B20] border border-[#2E3440] text-[#9CA3AF] hover:text-[#F8F9FA]'
                        }`}
                        title="Designate Team Captain"
                      >
                        (C)
                      </button>

                      {/* Toggle Wicketkeeper */}
                      <button
                        onClick={() => toggleWicketkeeper(slot.playerId)}
                        className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                          slot.isDesignatedWicketkeeper
                            ? 'bg-amber-900 text-amber-200 border border-amber-700'
                            : 'bg-[#181B20] border border-[#2E3440] text-[#9CA3AF] hover:text-[#F8F9FA]'
                        }`}
                        title="Designate Wicketkeeper"
                      >
                        (WK)
                      </button>

                      {/* Remove */}
                      <button
                        onClick={() => removePlayerFromSquad(slot.playerId)}
                        className="p-1.5 rounded bg-[#181B20] border border-[#2E3440] hover:border-rose-500 hover:text-rose-400 text-[#9CA3AF] transition-colors"
                        title="Remove Player"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: Tactical Analytics (8 Dimensions) */}
          {activeTab === 'analytics' && (
            <div className="bg-[#14171C] rounded-xl border border-[#2E3440] p-5 flex flex-col gap-5">
              {/* Overall Balance Summary Card */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-[#0D4A38]/50 to-[#181B20] border border-[#D4AF37]/40 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-bold">
                    TACTICAL EQUILIBRIUM INDEX
                  </span>
                  <h3 className="text-xl font-bold text-[#F8F9FA] mt-0.5">
                    {analytics.dimensions.overallSquadBalance.score} / 100
                  </h3>
                  <p className="text-xs text-[#9CA3AF] mt-1">{analytics.summary}</p>
                </div>
                <div
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs border ${
                    analytics.overallBalance >= 80
                      ? 'bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]'
                      : analytics.overallBalance >= 65
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                      : 'bg-amber-950 text-amber-300 border-amber-700'
                  }`}
                >
                  {analytics.dimensions.overallSquadBalance.grade}
                </div>
              </div>

              {/* 8 Dimension Metric Bars */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.values(analytics.dimensions).map((dim) => (
                  <div
                    key={dim.code}
                    className="p-3 rounded-lg bg-[#181B20] border border-[#2E3440] flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#F8F9FA]">{dim.name}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-bold text-[#D4AF37]">{dim.score}</span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            dim.grade === 'ELITE'
                              ? 'bg-[#D4AF37]/20 text-[#D4AF37]'
                              : dim.grade === 'STRONG'
                              ? 'bg-emerald-950 text-emerald-300'
                              : dim.grade === 'BALANCED'
                              ? 'bg-blue-950 text-blue-300'
                              : 'bg-rose-950 text-rose-300'
                          }`}
                        >
                          {dim.grade}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 rounded-full bg-[#0E1013] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          dim.score >= 80
                            ? 'bg-[#D4AF37]'
                            : dim.score >= 65
                            ? 'bg-emerald-400'
                            : dim.score >= 50
                            ? 'bg-blue-400'
                            : 'bg-rose-400'
                        }`}
                        style={{ width: `${dim.score}%` }}
                      />
                    </div>

                    <p className="text-[10px] text-[#9CA3AF] mt-0.5">{dim.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
