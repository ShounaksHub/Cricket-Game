'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  SlidersHorizontal,
  Info,
  Shield,
  Award,
  Zap,
  Target,
  ChevronRight,
  X,
  ExternalLink,
  ArrowUpDown,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import type {
  HistoricalEra,
  MatchFormat,
  PlayerFormatRating,
  PlayerProfile,
  PrimaryRole,
} from '@cricket/shared-types';
import {
  ingestPlayerRecord,
  VERIFIED_BENCHMARK_PLAYERS,
} from '@cricket/data-ingestion';

const FORMAT_TABS: Array<{ id: MatchFormat; label: string; badge: string }> = [
  { id: 'T20', label: 'T20', badge: 'Fast-Paced' },
  { id: 'ODI', label: 'One Day International', badge: '50 Overs' },
  { id: 'TEST_RED_BALL', label: 'Test (Red Ball)', badge: 'Traditional 5-Day' },
  { id: 'TEST_PINK_BALL', label: 'Test (Pink Ball)', badge: 'Day / Night' },
  { id: 'T10', label: 'T10 Blitz', badge: '10 Overs' },
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

const ERA_OPTIONS: Array<{ id: HistoricalEra | 'ALL'; label: string }> = [
  { id: 'ALL', label: 'All Eras' },
  { id: 'CONTEMPORARY_2021_PRESENT', label: 'Contemporary (2021–Present)' },
  { id: 'T20_REVOLUTION_2008_2020', label: 'T20 Revolution (2008–2020)' },
  { id: 'GLOBALIZED_1992_2007', label: 'Globalized Era (1992–2007)' },
  { id: 'PACE_REVOLUTION_1971_1991', label: 'Pace Revolution (1971–1991)' },
  { id: 'POST_WAR_1946_1970', label: 'Post-War (1946–1970)' },
  { id: 'INTERWAR_1919_1939', label: 'Interwar (1919–1939)' },
  { id: 'GOLDEN_AGE_PRE_1914', label: 'Golden Age (Pre-1914)' },
];

export default function PlayersCataloguePage() {
  const [selectedFormat, setSelectedFormat] = useState<MatchFormat>('T20');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<PrimaryRole | 'ALL'>('ALL');
  const [selectedEra, setSelectedEra] = useState<HistoricalEra | 'ALL'>('ALL');
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'rating' | 'name' | 'debut'>('rating');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerProfile | null>(null);

  // Load benchmark dataset
  const allPlayers = useMemo<PlayerProfile[]>(() => {
    return VERIFIED_BENCHMARK_PLAYERS.map((raw) => ingestPlayerRecord(raw));
  }, []);

  // Filtered & sorted players
  const filteredPlayers = useMemo(() => {
    return allPlayers
      .filter((p) => {
        // Search query
        if (searchQuery.trim().length > 0) {
          const q = searchQuery.toLowerCase();
          const matchName =
            p.fullName.toLowerCase().includes(q) ||
            p.displayName.toLowerCase().includes(q) ||
            p.primaryNationality.toLowerCase().includes(q);
          if (!matchName) return false;
        }

        // Role filter
        if (selectedRole !== 'ALL' && p.primaryRole !== selectedRole) {
          return false;
        }

        // Era filter
        if (selectedEra !== 'ALL' && p.historicalEra !== selectedEra) {
          return false;
        }

        // Min rating in selected format
        const rating = p.ratings[selectedFormat]?.overallRating ?? 0;
        if (rating < minRating) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return a.fullName.localeCompare(b.fullName);
        }
        if (sortBy === 'debut') {
          return a.careerDebutYear - b.careerDebutYear;
        }
        const rA = a.ratings[selectedFormat]?.overallRating ?? 50;
        const rB = b.ratings[selectedFormat]?.overallRating ?? 50;
        return rB - rA;
      });
  }, [allPlayers, searchQuery, selectedRole, selectedEra, selectedFormat, minRating, sortBy]);

  return (
    <div className="min-h-screen bg-[#0A0D12] text-[#F8F9FA] flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-[#1F242E] bg-[#10141D]/90 backdrop-blur sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="flex items-center space-x-2 text-xs uppercase tracking-widest text-[#9CA3AF] hover:text-[#D4AF37] transition"
            >
              <span>← Hub</span>
            </Link>
            <span className="text-[#3B4252]">|</span>
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
              <h1 className="font-serif text-lg font-bold tracking-wide text-[#F8F9FA]">
                Global Cricketer Catalogue & Ratings Engine
              </h1>
            </div>
            <span className="text-xs px-2 py-0.5 rounded bg-[#1A202C] text-[#D4AF37] border border-[#D4AF37]/30 font-mono">
              rate-1.0.0
            </span>
          </div>

          <div className="text-xs text-[#9CA3AF] flex items-center space-x-4">
            <span>
              Verified Profiles: <strong className="text-white">{allPlayers.length}</strong>
            </span>
            <span>
              Matching: <strong className="text-[#D4AF37]">{filteredPlayers.length}</strong>
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full px-6 py-8 flex-1 flex flex-col gap-6">
        {/* Format Selector Bar */}
        <div className="bg-[#131722] border border-[#232936] rounded-xl p-2 flex flex-wrap gap-2">
          {FORMAT_TABS.map((tab) => {
            const isSelected = selectedFormat === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedFormat(tab.id)}
                className={`flex-1 min-w-[160px] px-4 py-2.5 rounded-lg text-left transition flex flex-col ${
                  isSelected
                    ? 'bg-[#0D4A38] text-white border border-[#10B981]/50 shadow-lg shadow-[#0D4A38]/30'
                    : 'text-[#9CA3AF] hover:bg-[#1A202C] hover:text-[#F8F9FA]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm tracking-wide">{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider font-mono ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-black/30 text-[#9CA3AF]'
                    }`}
                  >
                    {tab.badge}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-[#131722] border border-[#232936] rounded-xl p-4">
          {/* Search Box */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search player, country, initials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#181D2A] border border-[#2B3242] rounded-lg pl-9 pr-3 py-2 text-sm text-[#F8F9FA] focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          {/* Role Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as PrimaryRole | 'ALL')}
              className="w-full bg-[#181D2A] border border-[#2B3242] rounded-lg px-3 py-2 text-sm text-[#F8F9FA] focus:outline-none focus:border-[#D4AF37]"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Era Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedEra}
              onChange={(e) => setSelectedEra(e.target.value as HistoricalEra | 'ALL')}
              className="w-full bg-[#181D2A] border border-[#2B3242] rounded-lg px-3 py-2 text-sm text-[#F8F9FA] focus:outline-none focus:border-[#D4AF37]"
            >
              {ERA_OPTIONS.map((era) => (
                <option key={era.id} value={era.id}>
                  {era.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Selector */}
          <div className="md:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'rating' | 'name' | 'debut')}
              className="w-full bg-[#181D2A] border border-[#2B3242] rounded-lg px-3 py-2 text-sm text-[#F8F9FA] focus:outline-none focus:border-[#D4AF37]"
            >
              <option value="rating">Sort: Highest Rating</option>
              <option value="name">Sort: Player Name</option>
              <option value="debut">Sort: Debut Year</option>
            </select>
          </div>
        </div>

        {/* Player Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPlayers.map((player) => {
            const formatRating: PlayerFormatRating | undefined = player.ratings[selectedFormat];
            const ratingVal = formatRating?.overallRating ?? 50;
            const confidenceTier = formatRating?.confidenceTier ?? 'ESTIMATED';

            return (
              <div
                key={player.id}
                className="bg-[#131722] border border-[#232936] hover:border-[#D4AF37]/60 rounded-xl p-5 flex flex-col justify-between transition-all group shadow-md"
              >
                <div>
                  {/* Top Bar: Era Badge & Confidence */}
                  <div className="flex items-center justify-between text-xs mb-3">
                    <span className="px-2 py-0.5 rounded bg-[#1C2230] text-[#9CA3AF] border border-[#2B3242] font-mono">
                      {player.historicalEra.replace(/_/g, ' ')}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold ${
                        confidenceTier === 'MEASURED'
                          ? 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30'
                          : confidenceTier === 'ESTIMATED'
                            ? 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30'
                            : 'bg-[#6366F1]/15 text-[#6366F1] border border-[#6366F1]/30'
                      }`}
                    >
                      {confidenceTier}
                    </span>
                  </div>

                  {/* Player Identity */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-base font-bold text-[#F8F9FA] group-hover:text-[#D4AF37] transition">
                        {player.fullName}
                      </h3>
                      <p className="text-xs text-[#9CA3AF] mt-0.5">
                        {player.primaryNationality} • {player.careerDebutYear}
                        {player.careerRetirementYear ? `–${player.careerRetirementYear}` : '–Present'}
                      </p>
                    </div>

                    {/* Overall Rating Circle */}
                    <div
                      className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold font-mono border shadow-md ${
                        ratingVal >= 90
                          ? 'bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/40'
                          : ratingVal >= 80
                            ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/40'
                            : 'bg-[#0EA5E9]/15 text-[#0EA5E9] border-[#0EA5E9]/40'
                      }`}
                    >
                      <span className="text-lg leading-none">{ratingVal}</span>
                      <span className="text-[9px] uppercase tracking-wider text-[#9CA3AF]">OVR</span>
                    </div>
                  </div>

                  {/* Attributes Sub-Pills */}
                  <div className="grid grid-cols-3 gap-2 py-2.5 px-3 bg-[#181D2A] rounded-lg border border-[#252C3B] text-center text-xs mb-3">
                    <div>
                      <div className="text-[10px] text-[#9CA3AF] uppercase">Bat</div>
                      <div className="font-bold text-[#F8F9FA] font-mono">
                        {formatRating?.battingRating ?? player.attributes.technique}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#9CA3AF] uppercase">Bowl</div>
                      <div className="font-bold text-[#F8F9FA] font-mono">
                        {formatRating?.bowlingRating ?? player.attributes.lineAndLength}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#9CA3AF] uppercase">Field</div>
                      <div className="font-bold text-[#F8F9FA] font-mono">
                        {formatRating?.fieldingRating ?? player.attributes.catching}
                      </div>
                    </div>
                  </div>

                  {/* Role & Style Details */}
                  <div className="text-xs text-[#9CA3AF] space-y-1">
                    <div>
                      Role: <strong className="text-white">{player.primaryRole.replace(/_/g, ' ')}</strong>
                    </div>
                    <div>
                      Style:{' '}
                      <span className="text-slate-300">
                        {player.battingHand === 'RIGHT_HAND' ? 'RHB' : 'LHB'} •{' '}
                        {player.bowlingStyle.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Button */}
                <button
                  onClick={() => setSelectedPlayer(player)}
                  className="mt-4 w-full py-2 px-3 rounded-lg bg-[#1F2636] hover:bg-[#D4AF37] hover:text-[#0A0D12] text-xs font-semibold tracking-wide text-[#F8F9FA] flex items-center justify-center space-x-1 transition border border-[#2C3446]"
                >
                  <Info className="w-3.5 h-3.5 mr-1" />
                  <span>Explain Rating Breakdown</span>
                </button>
              </div>
            );
          })}
        </div>

        {filteredPlayers.length === 0 && (
          <div className="text-center py-16 bg-[#131722] border border-[#232936] rounded-xl">
            <p className="text-[#9CA3AF] text-sm">No cricketers found matching your filter criteria.</p>
          </div>
        )}
      </main>

      {/* Transparent 4-Layer Rating Inspector Modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#10141D] border border-[#D4AF37]/50 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#232936] pb-4 mb-5">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs px-2 py-0.5 rounded bg-[#D4AF37]/15 text-[#D4AF37] font-mono font-bold">
                    4-LAYER AUDIT INSPECTOR
                  </span>
                  <span className="text-xs text-[#9CA3AF] font-mono">
                    Format: {selectedFormat}
                  </span>
                </div>
                <h2 className="text-xl font-bold font-serif text-[#F8F9FA] mt-1">
                  {selectedPlayer.fullName}
                </h2>
                <p className="text-xs text-[#9CA3AF]">
                  {selectedPlayer.primaryNationality} • Era: {selectedPlayer.historicalEra.replace(/_/g, ' ')}
                </p>
              </div>

              <button
                onClick={() => setSelectedPlayer(null)}
                className="p-1 rounded-lg hover:bg-[#1E2433] text-[#9CA3AF] hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal 4-Layer Body */}
            <div className="space-y-4 text-xs">
              {/* Layer 1: Raw Authentic Career Statistics */}
              <div className="bg-[#151A26] border border-[#242C3D] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-[#D4AF37] flex items-center gap-1.5">
                    <Award className="w-4 h-4" /> Layer 1: Authentic Career Statistics
                  </span>
                  <span className="text-[10px] text-[#9CA3AF] uppercase font-mono">Unadjusted</span>
                </div>
                <p className="text-[#9CA3AF] mb-3 text-[11px]">
                  Direct historical scorecard records. Missing historical metrics remain strictly null with zero hallucination.
                </p>
                {selectedPlayer.formatStats[selectedFormat] ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
                    <div className="bg-[#1A202E] p-2 rounded">
                      <div className="text-[10px] text-[#9CA3AF]">Matches / Inn</div>
                      <div className="font-bold text-white">
                        {selectedPlayer.formatStats[selectedFormat]?.matchesPlayed} / {selectedPlayer.formatStats[selectedFormat]?.inningsBatted}
                      </div>
                    </div>
                    <div className="bg-[#1A202E] p-2 rounded">
                      <div className="text-[10px] text-[#9CA3AF]">Batting Avg</div>
                      <div className="font-bold text-[#10B981]">
                        {selectedPlayer.formatStats[selectedFormat]?.battingAverage?.toFixed(2) ?? 'N/A'}
                      </div>
                    </div>
                    <div className="bg-[#1A202E] p-2 rounded">
                      <div className="text-[10px] text-[#9CA3AF]">Strike Rate</div>
                      <div className="font-bold text-white">
                        {selectedPlayer.formatStats[selectedFormat]?.strikeRate?.toFixed(1) ?? 'N/A'}
                      </div>
                    </div>
                    <div className="bg-[#1A202E] p-2 rounded">
                      <div className="text-[10px] text-[#9CA3AF]">Wkts / Bowl Avg</div>
                      <div className="font-bold text-[#0EA5E9]">
                        {selectedPlayer.formatStats[selectedFormat]?.wicketsTaken ?? 0} (
                        {selectedPlayer.formatStats[selectedFormat]?.bowlingAverage?.toFixed(1) ?? '-'})
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-[#1A202E] rounded text-slate-400 italic">
                    No historical match appearances in this format (interpolated via cohort baseline).
                  </div>
                )}
              </div>

              {/* Layer 2: Era-Adjusted Metrics & Peer Z-Scores */}
              <div className="bg-[#151A26] border border-[#242C3D] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-[#10B981] flex items-center gap-1.5">
                    <Target className="w-4 h-4" /> Layer 2: Era-Adjusted Metrics & Z-Scores
                  </span>
                  <span className="text-[10px] text-[#9CA3AF] uppercase font-mono">Normalized</span>
                </div>
                <p className="text-[#9CA3AF] mb-3 text-[11px]">
                  Evaluates the player against 10-year rolling peer windows (uncovered pitches, equipment changes, ball regulations).
                </p>
                {selectedPlayer.eraMetrics[selectedFormat] ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-center">
                    <div className="bg-[#1A202E] p-2 rounded">
                      <div className="text-[10px] text-[#9CA3AF]">Batting Z-Score</div>
                      <div className="font-bold text-white">
                        {selectedPlayer.eraMetrics[selectedFormat]?.battingAvgZScore >= 0 ? '+' : ''}
                        {selectedPlayer.eraMetrics[selectedFormat]?.battingAvgZScore.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-[#1A202E] p-2 rounded">
                      <div className="text-[10px] text-[#9CA3AF]">Era Perf. Ratio (EPR)</div>
                      <div className="font-bold text-[#D4AF37]">
                        {selectedPlayer.eraMetrics[selectedFormat]?.eraPerformanceRatio.toFixed(2)}x
                      </div>
                    </div>
                    <div className="bg-[#1A202E] p-2 rounded">
                      <div className="text-[10px] text-[#9CA3AF]">Era Peer Mean Bat</div>
                      <div className="font-bold text-white">
                        {selectedPlayer.eraMetrics[selectedFormat]?.peerCohortMeanBattingAvg.toFixed(1)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-[#1A202E] rounded text-slate-400 italic">
                    Era peer normalizer applied standard contemporary benchmark parameters.
                  </div>
                )}
              </div>

              {/* Layer 3: Empirical Bayes Shrinkage */}
              <div className="bg-[#151A26] border border-[#242C3D] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-[#6366F1] flex items-center gap-1.5">
                    <Shield className="w-4 h-4" /> Layer 3: Empirical Bayes Shrinkage
                  </span>
                  <span className="text-[10px] text-[#9CA3AF] uppercase font-mono">Regularization</span>
                </div>
                <p className="text-[#9CA3AF] mb-3 text-[11px]">
                  Prevents small sample size distortions ($C = N / (N + K)$). Regresses low-sample metrics towards cohort priors.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-center">
                  <div className="bg-[#1A202E] p-2 rounded">
                    <div className="text-[10px] text-[#9CA3AF]">Confidence Tier</div>
                    <div className="font-bold text-[#6366F1]">
                      {selectedPlayer.ratings[selectedFormat]?.confidenceTier}
                    </div>
                  </div>
                  <div className="bg-[#1A202E] p-2 rounded">
                    <div className="text-[10px] text-[#9CA3AF]">Confidence (C)</div>
                    <div className="font-bold text-white">
                      {((selectedPlayer.ratings[selectedFormat]?.confidenceScore ?? 0) * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div className="bg-[#1A202E] p-2 rounded">
                    <div className="text-[10px] text-[#9CA3AF]">Prior Shrinkage Weight</div>
                    <div className="font-bold text-white">
                      {((selectedPlayer.ratings[selectedFormat]?.explainability.shrinkageApplied ?? 0) * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Layer 4: Granular 0-100 Attributes */}
              <div className="bg-[#151A26] border border-[#242C3D] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-[#0EA5E9] flex items-center gap-1.5">
                    <Zap className="w-4 h-4" /> Layer 4: Granular Attributes (0–100)
                  </span>
                  <span className="text-[10px] text-[#9CA3AF] uppercase font-mono">Simulation Ready</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
                  <div className="bg-[#1A202E] p-2 rounded">
                    <div className="text-[10px] text-[#9CA3AF]">Technique</div>
                    <div className="font-bold text-white">{selectedPlayer.attributes.technique}</div>
                  </div>
                  <div className="bg-[#1A202E] p-2 rounded">
                    <div className="text-[10px] text-[#9CA3AF]">Timing / Power</div>
                    <div className="font-bold text-white">
                      {selectedPlayer.attributes.timing} / {selectedPlayer.attributes.power}
                    </div>
                  </div>
                  <div className="bg-[#1A202E] p-2 rounded">
                    <div className="text-[10px] text-[#9CA3AF]">Line & Length</div>
                    <div className="font-bold text-white">{selectedPlayer.attributes.lineAndLength}</div>
                  </div>
                  <div className="bg-[#1A202E] p-2 rounded">
                    <div className="text-[10px] text-[#9CA3AF]">Pressure Handling</div>
                    <div className="font-bold text-[#D4AF37]">{selectedPlayer.attributes.pressureHandling}</div>
                  </div>
                </div>
              </div>

              {/* Strict Data Provenance Audit */}
              <div className="bg-[#131722] border border-[#2B3242] rounded-xl p-3 flex items-center justify-between text-[11px]">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                  <span>
                    Source: <strong className="text-white">{selectedPlayer.provenance.sourceName}</strong> ({selectedPlayer.provenance.licenseType})
                  </span>
                </div>
                <span className="text-[#9CA3AF] font-mono">
                  {selectedPlayer.provenance.verificationStatus}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
