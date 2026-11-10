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
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink,
  ArrowUpDown,
  Flame,
  CheckCircle2,
  Globe,
  Building2,
  Trophy,
} from 'lucide-react';
import type {
  CareerCategory,
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

const CATEGORY_OPTIONS: Array<{ id: CareerCategory | 'ALL'; label: string }> = [
  { id: 'ALL', label: 'All Categories' },
  { id: 'INTERNATIONAL', label: 'International Stars' },
  { id: 'DOMESTIC_ONLY', label: 'Domestic Specialists' },
  { id: 'HISTORICAL_LEGEND', label: 'Historical Legends' },
];

const COMPETITION_OPTIONS: Array<{ id: string; label: string }> = [
  { id: 'ALL', label: 'All Competitions' },
  { id: 'IPL', label: 'IPL (India)' },
  { id: 'Ranji Trophy', label: 'Ranji Trophy (India)' },
  { id: 'BBL', label: 'BBL (Australia)' },
  { id: 'Sheffield Shield', label: 'Sheffield Shield (Australia)' },
  { id: 'County Championship', label: 'County Championship (England)' },
  { id: 'T20 Blast', label: 'T20 Blast (England)' },
  { id: 'The Hundred', label: 'The Hundred (UK)' },
  { id: 'SA20', label: 'SA20 (South Africa)' },
  { id: 'PSL', label: 'PSL (Pakistan)' },
  { id: 'CPL', label: 'CPL (West Indies)' },
  { id: 'Super Smash', label: 'Super Smash (New Zealand)' },
  { id: 'DPL', label: 'DPL / BPL (Bangladesh)' },
  { id: 'LPL', label: 'LPL (Sri Lanka)' },
  { id: 'Major League Cricket', label: 'MLC (USA)' },
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

const HAND_OPTIONS: Array<{ id: 'ALL' | 'RIGHT_HAND' | 'LEFT_HAND'; label: string }> = [
  { id: 'ALL', label: 'All Batting Hands' },
  { id: 'RIGHT_HAND', label: 'Right Hand (RHB)' },
  { id: 'LEFT_HAND', label: 'Left Hand (LHB)' },
];

const BOWLING_OPTIONS: Array<{ id: 'ALL' | 'FAST' | 'SPIN' | 'MEDIUM'; label: string }> = [
  { id: 'ALL', label: 'All Bowling Styles' },
  { id: 'FAST', label: 'Pace / Fast' },
  { id: 'SPIN', label: 'Spin (Off/Leg/SLA)' },
  { id: 'MEDIUM', label: 'Medium Pace' },
];

const STATUS_OPTIONS: Array<{ id: 'ALL' | 'ACTIVE' | 'RETIRED'; label: string }> = [
  { id: 'ALL', label: 'All Careers' },
  { id: 'ACTIVE', label: 'Active Today' },
  { id: 'RETIRED', label: 'Historical Legends (Retired)' },
];

function getPlayerInitials(name: string): string {
  const parts = name.replace(/^(Sir|Dr|Lord)\s+/i, '').split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getCountryBadgeStyle(country: string): string {
  switch (country.toLowerCase()) {
    case 'india':
      return 'from-blue-900 to-indigo-950 border-blue-500/40 text-blue-200';
    case 'australia':
      return 'from-emerald-900 to-green-950 border-emerald-500/40 text-emerald-200';
    case 'england':
      return 'from-sky-900 to-blue-950 border-sky-500/40 text-sky-200';
    case 'west indies':
      return 'from-rose-950 to-red-950 border-rose-500/40 text-rose-200';
    case 'south africa':
      return 'from-teal-900 to-emerald-950 border-teal-500/40 text-teal-200';
    case 'pakistan':
      return 'from-green-950 to-emerald-950 border-green-500/40 text-green-200';
    case 'new zealand':
      return 'from-neutral-800 to-neutral-950 border-neutral-400/40 text-neutral-200';
    case 'sri lanka':
      return 'from-amber-950 to-yellow-950 border-amber-500/40 text-amber-200';
    case 'bangladesh':
      return 'from-emerald-950 to-teal-950 border-emerald-500/40 text-emerald-300';
    case 'afghanistan':
      return 'from-blue-950 to-cyan-950 border-cyan-500/40 text-cyan-200';
    case 'usa':
      return 'from-red-900 to-blue-950 border-blue-400/40 text-slate-100';
    default:
      return 'from-[#0D4A38] to-[#082218] border-[#D4AF37]/40 text-[#D4AF37]';
  }
}

export default function PlayersCataloguePage() {
  const [selectedFormat, setSelectedFormat] = useState<MatchFormat>('T20');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<PrimaryRole | 'ALL'>('ALL');
  const [selectedEra, setSelectedEra] = useState<HistoricalEra | 'ALL'>('ALL');
  const [selectedCountry, setSelectedCountry] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<CareerCategory | 'ALL'>('ALL');
  const [selectedCompetition, setSelectedCompetition] = useState<string>('ALL');
  const [selectedHand, setSelectedHand] = useState<'ALL' | 'RIGHT_HAND' | 'LEFT_HAND'>('ALL');
  const [selectedBowling, setSelectedBowling] = useState<'ALL' | 'FAST' | 'SPIN' | 'MEDIUM'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'ACTIVE' | 'RETIRED'>('ALL');
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'rating' | 'name' | 'debut'>('rating');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerProfile | null>(null);

  const PAGE_SIZE = 24;

  // Load global player database
  const allPlayers = useMemo<PlayerProfile[]>(() => {
    return VERIFIED_BENCHMARK_PLAYERS.map((raw) => ingestPlayerRecord(raw));
  }, []);

  // Available countries sorted by representation
  const availableCountries = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of allPlayers) {
      counts.set(p.primaryNationality, (counts.get(p.primaryNationality) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([country, count]) => ({ country, count }));
  }, [allPlayers]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    selectedRole,
    selectedEra,
    selectedCountry,
    selectedCategory,
    selectedCompetition,
    selectedHand,
    selectedBowling,
    selectedStatus,
    minRating,
    sortBy,
    selectedFormat,
  ]);

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
            p.primaryNationality.toLowerCase().includes(q) ||
            (p.competitions && p.competitions.some((c) => c.toLowerCase().includes(q)));
          if (!matchName) return false;
        }

        // Country filter
        if (selectedCountry !== 'ALL' && p.primaryNationality !== selectedCountry) {
          return false;
        }

        // Career Category filter
        if (selectedCategory !== 'ALL' && p.careerCategory !== selectedCategory) {
          return false;
        }

        // Competition filter
        if (
          selectedCompetition !== 'ALL' &&
          (!p.competitions || !p.competitions.some((c) => c.toLowerCase().includes(selectedCompetition.toLowerCase())))
        ) {
          return false;
        }

        // Role filter
        if (selectedRole !== 'ALL' && p.primaryRole !== selectedRole) {
          return false;
        }

        // Batting Hand filter
        if (selectedHand !== 'ALL' && p.battingHand !== selectedHand) {
          return false;
        }

        // Bowling Style filter
        if (selectedBowling !== 'ALL') {
          const style = p.bowlingStyle;
          if (selectedBowling === 'FAST' && !style.includes('FAST')) return false;
          if (selectedBowling === 'SPIN' && !style.includes('BREAK') && !style.includes('ORTHODOX')) return false;
          if (selectedBowling === 'MEDIUM' && !style.includes('MEDIUM')) return false;
        }

        // Career Status filter
        if (selectedStatus !== 'ALL') {
          if (selectedStatus === 'ACTIVE' && !p.isActive) return false;
          if (selectedStatus === 'RETIRED' && p.isActive) return false;
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
  }, [
    allPlayers,
    searchQuery,
    selectedCountry,
    selectedCategory,
    selectedCompetition,
    selectedRole,
    selectedHand,
    selectedBowling,
    selectedStatus,
    selectedEra,
    selectedFormat,
    minRating,
    sortBy,
  ]);

  // Paginated slice
  const totalPages = Math.max(1, Math.ceil(filteredPlayers.length / PAGE_SIZE));
  const paginatedPlayers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredPlayers.slice(start, start + PAGE_SIZE);
  }, [filteredPlayers, currentPage, PAGE_SIZE]);

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
                Global Cricketer Database & Ratings Engine
              </h1>
            </div>
            <span className="text-xs px-2 py-0.5 rounded bg-[#1A202C] text-[#D4AF37] border border-[#D4AF37]/30 font-mono">
              1,000+ Verified Players
            </span>
          </div>

          <div className="text-xs text-[#9CA3AF] flex items-center space-x-4">
            <span>
              Total Verified: <strong className="text-white">{allPlayers.length}</strong>
            </span>
            <span>
              Matching Filters: <strong className="text-[#D4AF37]">{filteredPlayers.length}</strong>
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

        {/* Filter Controls Grid */}
        <div className="bg-[#131722] border border-[#232936] rounded-xl p-4 space-y-3">
          {/* Row 1: Search, Country, Category, Competition, Sort */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search Box */}
            <div className="md:col-span-4 relative">
              <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search 1,000+ players, countries, teams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#181D2A] border border-[#2B3242] rounded-lg pl-9 pr-3 py-2 text-sm text-[#F8F9FA] focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            {/* Country Filter */}
            <div className="md:col-span-2">
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="w-full bg-[#181D2A] border border-[#2B3242] rounded-lg px-3 py-2 text-sm text-[#F8F9FA] focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="ALL">All Nations ({allPlayers.length})</option>
                {availableCountries.map((c) => (
                  <option key={c.country} value={c.country}>
                    {c.country} ({c.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Career Category Filter */}
            <div className="md:col-span-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as CareerCategory | 'ALL')}
                className="w-full bg-[#181D2A] border border-[#2B3242] rounded-lg px-3 py-2 text-sm text-[#F8F9FA] focus:outline-none focus:border-[#D4AF37]"
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Competition Filter */}
            <div className="md:col-span-2">
              <select
                value={selectedCompetition}
                onChange={(e) => setSelectedCompetition(e.target.value)}
                className="w-full bg-[#181D2A] border border-[#2B3242] rounded-lg px-3 py-2 text-sm text-[#F8F9FA] focus:outline-none focus:border-[#D4AF37]"
              >
                {COMPETITION_OPTIONS.map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.label}
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

          {/* Row 2: Role, Era, Batting Hand, Bowling Style, Status, Min Rating */}
          <div className="grid grid-cols-2 md:grid-cols-12 gap-3 pt-2 border-t border-[#1E2433]">
            {/* Role Filter */}
            <div className="col-span-1 md:col-span-2">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as PrimaryRole | 'ALL')}
                className="w-full bg-[#181D2A] border border-[#2B3242] rounded-lg px-2.5 py-1.5 text-xs text-[#F8F9FA] focus:outline-none focus:border-[#D4AF37]"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Era Filter */}
            <div className="col-span-1 md:col-span-2">
              <select
                value={selectedEra}
                onChange={(e) => setSelectedEra(e.target.value as HistoricalEra | 'ALL')}
                className="w-full bg-[#181D2A] border border-[#2B3242] rounded-lg px-2.5 py-1.5 text-xs text-[#F8F9FA] focus:outline-none focus:border-[#D4AF37]"
              >
                {ERA_OPTIONS.map((era) => (
                  <option key={era.id} value={era.id}>
                    {era.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Batting Hand */}
            <div className="col-span-1 md:col-span-2">
              <select
                value={selectedHand}
                onChange={(e) => setSelectedHand(e.target.value as 'ALL' | 'RIGHT_HAND' | 'LEFT_HAND')}
                className="w-full bg-[#181D2A] border border-[#2B3242] rounded-lg px-2.5 py-1.5 text-xs text-[#F8F9FA] focus:outline-none focus:border-[#D4AF37]"
              >
                {HAND_OPTIONS.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Bowling Style */}
            <div className="col-span-1 md:col-span-2">
              <select
                value={selectedBowling}
                onChange={(e) => setSelectedBowling(e.target.value as 'ALL' | 'FAST' | 'SPIN' | 'MEDIUM')}
                className="w-full bg-[#181D2A] border border-[#2B3242] rounded-lg px-2.5 py-1.5 text-xs text-[#F8F9FA] focus:outline-none focus:border-[#D4AF37]"
              >
                {BOWLING_OPTIONS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Career Status */}
            <div className="col-span-1 md:col-span-2">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as 'ALL' | 'ACTIVE' | 'RETIRED')}
                className="w-full bg-[#181D2A] border border-[#2B3242] rounded-lg px-2.5 py-1.5 text-xs text-[#F8F9FA] focus:outline-none focus:border-[#D4AF37]"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Min Rating Slider */}
            <div className="col-span-1 md:col-span-2 flex items-center space-x-2 bg-[#181D2A] border border-[#2B3242] rounded-lg px-2.5 py-1">
              <span className="text-[10px] text-[#9CA3AF] whitespace-nowrap">Min: {minRating}</span>
              <input
                type="range"
                min="0"
                max="95"
                step="5"
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
                className="w-full accent-[#D4AF37] cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Discovery Summary & Active Filters */}
        <div className="flex items-center justify-between text-xs text-[#9CA3AF] px-1">
          <div>
            Showing <strong className="text-white">{filteredPlayers.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}</strong> –{' '}
            <strong className="text-white">{Math.min(currentPage * PAGE_SIZE, filteredPlayers.length)}</strong> of{' '}
            <strong className="text-[#D4AF37]">{filteredPlayers.length}</strong> players
            {selectedCategory !== 'ALL' && <span className="ml-2 px-2 py-0.5 rounded bg-[#1C2230] text-[#0EA5E9] border border-[#0EA5E9]/30">Category: {selectedCategory}</span>}
            {selectedCountry !== 'ALL' && <span className="ml-2 px-2 py-0.5 rounded bg-[#1C2230] text-[#10B981] border border-[#10B981]/30">Country: {selectedCountry}</span>}
            {selectedCompetition !== 'ALL' && <span className="ml-2 px-2 py-0.5 rounded bg-[#1C2230] text-[#D4AF37] border border-[#D4AF37]/30">Comp: {selectedCompetition}</span>}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center space-x-1.5 font-mono">
              <span>Page {currentPage} of {totalPages}</span>
            </div>
          )}
        </div>

        {/* Player Grid (Paginated for smooth 60fps responsiveness) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {paginatedPlayers.map((player) => {
            const formatRating: PlayerFormatRating | undefined = player.ratings[selectedFormat];
            const ratingVal = formatRating?.overallRating ?? 50;
            const confidenceTier = formatRating?.confidenceTier ?? 'ESTIMATED';

            return (
              <div
                key={player.id}
                className="bg-[#131722] border border-[#232936] hover:border-[#D4AF37]/60 rounded-xl p-5 flex flex-col justify-between transition-all group shadow-md"
              >
                <div>
                  {/* Top Bar: Era Badge & Category Pill */}
                  <div className="flex items-center justify-between text-xs mb-3">
                    <span className="px-2 py-0.5 rounded bg-[#1C2230] text-[#9CA3AF] border border-[#2B3242] font-mono text-[10px]">
                      {player.historicalEra.replace(/_/g, ' ')}
                    </span>
                    <div className="flex items-center space-x-1.5">
                      {player.careerCategory === 'DOMESTIC_ONLY' ? (
                        <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          DOMESTIC
                        </span>
                      ) : player.careerCategory === 'HISTORICAL_LEGEND' ? (
                        <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                          LEGEND
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                          INTL
                        </span>
                      )}

                      <span
                        className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
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
                  </div>

                  {/* Player Identity with Procedural Avatar */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-11 h-11 rounded-xl bg-gradient-to-br ${getCountryBadgeStyle(
                          player.primaryNationality,
                        )} border flex items-center justify-center font-mono font-bold text-sm tracking-wider shadow-inner shrink-0 relative`}
                      >
                        <span>{getPlayerInitials(player.fullName)}</span>
                        <span
                          className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-[#131722] ${
                            player.isActive ? 'bg-emerald-400' : 'bg-slate-500'
                          }`}
                          title={player.isActive ? 'Active player' : 'Retired historical legend'}
                        />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-[#F8F9FA] group-hover:text-[#D4AF37] transition leading-snug">
                          {player.fullName}
                        </h3>
                        <p className="text-xs text-[#9CA3AF] mt-0.5">
                          {player.primaryNationality} • {player.careerDebutYear}
                          {player.careerRetirementYear ? `–${player.careerRetirementYear}` : '–Present'}
                        </p>
                      </div>
                    </div>

                    {/* Overall Rating Circle */}
                    <div
                      className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold font-mono border shadow-md shrink-0 ${
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

                  {/* Competitions Badges */}
                  {player.competitions && player.competitions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2.5">
                      {player.competitions.slice(0, 3).map((comp) => (
                        <span
                          key={comp}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-[#181D2A] text-[#CBD5E1] border border-[#283244] font-medium"
                        >
                          {comp}
                        </span>
                      ))}
                      {player.competitions.length > 3 && (
                        <span className="text-[9px] px-1 py-0.5 text-[#9CA3AF]">
                          +{player.competitions.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Attributes Sub-Pills */}
                  <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-[#181D2A] rounded-lg border border-[#252C3B] text-center text-xs mb-3">
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

        {/* Empty State */}
        {filteredPlayers.length === 0 && (
          <div className="text-center py-16 bg-[#131722] border border-[#232936] rounded-xl">
            <p className="text-[#9CA3AF] text-sm">No cricketers found matching your filter criteria.</p>
          </div>
        )}

        {/* Pagination Navigation Bar */}
        {totalPages > 1 && (
          <div className="bg-[#131722] border border-[#232936] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-[#9CA3AF]">
              Page <strong className="text-white">{currentPage}</strong> of <strong className="text-white">{totalPages}</strong> ({filteredPlayers.length} total players)
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center space-x-1 transition ${
                  currentPage === 1
                    ? 'border-[#232936] text-[#4B5563] cursor-not-allowed'
                    : 'border-[#2B3242] text-[#F8F9FA] hover:bg-[#1E2433] hover:border-[#D4AF37]'
                }`}
              >
                <ChevronLeft className="w-4 h-4 mr-0.5" />
                <span>Prev</span>
              </button>

              {/* Number buttons: 1, dynamic window, totalPages */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                const isActive = pageNum === currentPage;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-mono font-medium transition ${
                      isActive
                        ? 'bg-[#D4AF37] text-[#0A0D12] font-bold shadow'
                        : 'text-[#9CA3AF] hover:bg-[#1E2433] hover:text-white'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center space-x-1 transition ${
                  currentPage === totalPages
                    ? 'border-[#232936] text-[#4B5563] cursor-not-allowed'
                    : 'border-[#2B3242] text-[#F8F9FA] hover:bg-[#1E2433] hover:border-[#D4AF37]'
                }`}
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4 ml-0.5" />
              </button>
            </div>
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
                  {selectedPlayer.careerCategory && (
                    <span className="text-xs px-2 py-0.5 rounded bg-[#1C2230] text-sky-400 font-mono font-medium border border-sky-500/30">
                      {selectedPlayer.careerCategory}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold font-serif text-[#F8F9FA] mt-1">
                  {selectedPlayer.fullName}
                </h2>
                <p className="text-xs text-[#9CA3AF]">
                  {selectedPlayer.primaryNationality} • Era: {selectedPlayer.historicalEra.replace(/_/g, ' ')}
                  {selectedPlayer.competitions && selectedPlayer.competitions.length > 0 && (
                    <span> • Teams: {selectedPlayer.competitions.join(', ')}</span>
                  )}
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
              {/* 5 Core Rating Categories */}
              <div className="bg-[#151A26] border border-[#D4AF37]/30 rounded-xl p-4">
                <span className="font-bold text-sm text-[#D4AF37] flex items-center gap-1.5 mb-2">
                  <Award className="w-4 h-4" /> 5 Core Simulation Ratings
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center font-mono">
                  <div className="bg-[#1A202E] p-2 rounded border border-[#242C3D]">
                    <div className="text-[10px] text-[#9CA3AF]">Batting</div>
                    <div className="font-bold text-lg text-[#F8F9FA]">
                      {selectedPlayer.ratings[selectedFormat]?.battingRating ?? selectedPlayer.attributes.technique}
                    </div>
                  </div>
                  <div className="bg-[#1A202E] p-2 rounded border border-[#242C3D]">
                    <div className="text-[10px] text-[#9CA3AF]">Bowling</div>
                    <div className="font-bold text-lg text-[#F8F9FA]">
                      {selectedPlayer.ratings[selectedFormat]?.bowlingRating ?? selectedPlayer.attributes.lineAndLength}
                    </div>
                  </div>
                  <div className="bg-[#1A202E] p-2 rounded border border-[#242C3D]">
                    <div className="text-[10px] text-[#9CA3AF]">Fielding</div>
                    <div className="font-bold text-lg text-[#F8F9FA]">
                      {selectedPlayer.ratings[selectedFormat]?.fieldingRating ?? selectedPlayer.attributes.catching}
                    </div>
                  </div>
                  <div className="bg-[#1A202E] p-2 rounded border border-[#242C3D]">
                    <div className="text-[10px] text-[#9CA3AF]">Temperament</div>
                    <div className="font-bold text-lg text-[#10B981]">
                      {Math.round(
                        (selectedPlayer.attributes.pressureHandling +
                          selectedPlayer.attributes.consistency +
                          selectedPlayer.attributes.matchAwareness) /
                          3
                      )}
                    </div>
                  </div>
                  <div className="bg-[#1A202E] p-2 rounded border border-[#242C3D]">
                    <div className="text-[10px] text-[#9CA3AF]">Adaptability</div>
                    <div className="font-bold text-lg text-[#0EA5E9]">
                      {Math.round(
                        (selectedPlayer.attributes.pitchAdaptability +
                          selectedPlayer.attributes.weatherAdaptability) /
                          2
                      )}
                    </div>
                  </div>
                </div>

                {/* Simulation Impact Notes */}
                <div className="mt-3 p-2.5 rounded bg-[#10141D] border border-[#1E2433] text-[11px] text-[#9CA3AF] space-y-1">
                  <div className="text-white font-semibold">Engine Performance Impact:</div>
                  <p>• <strong>Batting/Bowling:</strong> Drives base head-to-head match-up logits on every delivery.</p>
                  <p>• <strong>Temperament:</strong> Shields player against collapse cascades and high required-run-rate penalties in death overs.</p>
                  <p>• <strong>Adaptability:</strong> Buffers player execution against extreme pitch wear, spin turn, and atmospheric dew.</p>
                </div>
              </div>

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
