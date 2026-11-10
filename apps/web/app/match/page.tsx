'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Play,
  Pause,
  FastForward,
  RotateCcw,
  Shield,
  Zap,
  Swords,
  Award,
  Wind,
  CheckCircle2,
  Activity,
  Sparkles,
  ChevronRight,
  Info,
  MapPin,
  Sliders,
  Flame,
} from 'lucide-react';
import type {
  MatchFormat,
  DreamTeamPlayerSlotInput,
  PlayerSquadContext,
} from '@cricket/shared-types';
import {
  VERIFIED_STADIUMS,
  simulateFullMatch,
  verifyMatchReplay,
  reconcileMatchScorecard,
  calculatePlayerOfTheMatch,
  stepDelivery,
  resolveAITacticalAction,
  DeterministicPRNG,
  type StadiumSpec,
  type MatchSimulationConfig,
  type MatchSimulationResult,
  type MatchState,
  type DeliveryEvent,
  type ReconciledMatchScorecard,
  type PlayerOfTheMatch,
  type BatterIntent,
  type BowlingLength,
  type BowlingLine,
  type BowlingVariation,
  type FieldPreset,
  type TacticalDeliveryAction,
  generateAIOpponentTeam,
  type AIDifficulty,
  type AIOpponentTeamResult,
} from '@cricket/simulation-engine';
import {
  VERIFIED_BENCHMARK_PLAYERS,
  ingestPlayerRecord,
} from '@cricket/data-ingestion';
import dynamic from 'next/dynamic';

const CricketVisualizerCanvas = dynamic(
  () =>
    import('./visualizer/CricketVisualizerCanvas').then(
      (mod) => mod.CricketVisualizerCanvas,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[580px] bg-[#030d07] rounded-xl flex items-center justify-center border border-emerald-950/60 shadow-2xl">
        <div className="flex items-center space-x-2 text-emerald-400 font-mono text-xs uppercase tracking-widest">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
          <span>INITIALIZING PIXIJS V8 2D BROADCAST VISUALIZER...</span>
        </div>
      </div>
    ),
  },
);

type MatchPhase = 'SETUP' | 'TOSS' | 'LIVE' | 'COMPLETED';

export default function MatchSimulationPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  // --- Setup State ---
  const [phase, setPhase] = useState<MatchPhase>('SETUP');
  const [format, setFormat] = useState<MatchFormat>('T20');
  const [selectedStadiumId, setSelectedStadiumId] = useState<string>('stadium-mcg');
  const [selectedPitch, setSelectedPitch] = useState<'HARD' | 'FLAT' | 'TURNING' | 'GREEN' | 'DUSTY'>('HARD');
  const [dewFactor, setDewFactor] = useState<number>(0.2);
  const [temperature, setTemperature] = useState<number>(27);
  const [humidity, setHumidity] = useState<number>(55);
  const [cloudCover, setCloudCover] = useState<number>(20);
  const [seedInput, setSeedInput] = useState<string>('7777777');

  // --- Toss State ---
  const [coinSide, setCoinSide] = useState<'HEADS' | 'TAILS'>('HEADS');
  const [tossResult, setTossResult] = useState<{
    winner: 'USER' | 'AI';
    decision: 'BAT' | 'BOWL';
    coinLanded: 'HEADS' | 'TAILS';
  } | null>(null);

  // --- Live Simulation State ---
  const [simulationResult, setSimulationResult] = useState<MatchSimulationResult | null>(null);
  const [liveState, setLiveState] = useState<MatchState | null>(null);
  const [visibleEvents, setVisibleEvents] = useState<DeliveryEvent[]>([]);
  const [currentEventIndex, setCurrentEventIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeed, setPlaySpeed] = useState<number>(300); // ms per ball
  const [selectedInningsTab, setSelectedInningsTab] = useState<number>(0);

  // --- Tactical Controls for Next Ball ---
  const [userIntent, setUserIntent] = useState<BatterIntent>('BALANCED');
  const [userLength, setUserLength] = useState<BowlingLength>('GOOD_LENGTH');
  const [userLine, setUserLine] = useState<BowlingLine>('OUTSIDE_OFF');
  const [userVariation, setUserVariation] = useState<BowlingVariation>('STOCK');
  const [userField, setUserField] = useState<FieldPreset>('BALANCED_RING');
  const [isAIOptimized, setIsAIOptimized] = useState<boolean>(true);
  const [userTeamName, setUserTeamName] = useState<string>('User Dream XI');
  const [aiTeamName, setAiTeamName] = useState<string>('AI World XI');
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('MEDIUM');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('cricket_active_user_team');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.teamName) {
          setUserTeamName(parsed.teamName);
        }
      }
    } catch {
      // Ignore
    }
  }, []);

  const commentaryContainerRef = useRef<HTMLDivElement>(null);

  // Auto-randomize seed on mount
  useEffect(() => {
    randomizeSeed();
  }, []);

  function randomizeSeed() {
    const randomBig = BigInt(Date.now()) * 10000n + BigInt(Math.floor(Math.random() * 10000));
    setSeedInput(randomBig.toString());
  }

  // Auto-scroll commentary feed
  useEffect(() => {
    if (commentaryContainerRef.current) {
      commentaryContainerRef.current.scrollTop = commentaryContainerRef.current.scrollHeight;
    }
  }, [visibleEvents.length]);

  // Playback timer for delivery simulation
  useEffect(() => {
    if (!isPlaying || !simulationResult) return;

    if (currentEventIndex >= simulationResult.allEvents.length) {
      setIsPlaying(false);
      setPhase('COMPLETED');
      return;
    }

    const timer = setTimeout(() => {
      stepToNextDelivery();
    }, playSpeed);

    return () => clearTimeout(timer);
  }, [isPlaying, currentEventIndex, simulationResult, playSpeed]);

  function getStadium(): StadiumSpec {
    return VERIFIED_STADIUMS.find((s) => s.id === selectedStadiumId) || VERIFIED_STADIUMS[0];
  }

  // Construct players map and lineups from verified benchmark players
  function prepareSimulationSquads(): {
    team1: { id: string; name: string; lineup: DreamTeamPlayerSlotInput[] };
    team2: { id: string; name: string; lineup: DreamTeamPlayerSlotInput[] };
    profiles: Map<string, PlayerSquadContext>;
  } {
    const all = VERIFIED_BENCHMARK_PLAYERS.map(ingestPlayerRecord);
    const profiles = new Map<string, PlayerSquadContext>();

    for (const p of all) {
      profiles.set(p.id, {
        id: p.id,
        fullName: p.fullName,
        displayName: p.displayName,
        primaryRole: p.primaryRole,
        battingHand: p.battingHand,
        bowlingStyle: p.bowlingStyle,
        isWicketkeeper: p.isWicketkeeper,
        formatRating: p.ratings[format] || p.ratings.T20,
        ratings: p.ratings,
      });
    }

    let lineup1: DreamTeamPlayerSlotInput[] = [];
    let customName = userTeamName;

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('cricket_active_user_team');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed?.lineup) && parsed.lineup.length === 11) {
            lineup1 = parsed.lineup;
            if (parsed.teamName) customName = parsed.teamName;
          }
        }
      } catch {
        // Fallback
      }
    }

    if (lineup1.length !== 11) {
      // Default Team 1: Balanced XI (Rohit, Gilchrist, Kohli, Lara, De Villiers, Sobers, Stokes, Jadeja, Akram, Warne, Bumrah)
      const t1Names = ['Rohit', 'Gilchrist', 'Kohli', 'Lara', 'Villiers', 'Sobers', 'Stokes', 'Jadeja', 'Akram', 'Warne', 'Bumrah'];
      const defaultIds = t1Names.map((n) => all.find((p) => p.fullName.includes(n))?.id || all[0].id);
      lineup1 = defaultIds.map((pid, idx) => ({
        playerId: pid,
        battingOrder: idx + 1,
        isCaptain: idx === 2,
        isDesignatedWicketkeeper: idx === 1,
        bowlingPriority: idx === 8 ? 1 : idx === 10 ? 1 : idx === 9 ? 2 : idx === 7 ? 3 : idx === 5 ? 4 : idx === 6 ? 5 : null,
      }));
    }

    // Team 2: Dynamically generated AI Opponent tailored to pitch & difficulty (0 overlap)
    const seed = BigInt(seedInput || '987654321');
    const aiResult = generateAIOpponentTeam(profiles, {
      userLineup: lineup1,
      difficulty: aiDifficulty,
      pitchType: selectedPitch,
      format,
      seed,
    });

    return {
      team1: { id: 'user-team', name: customName, lineup: lineup1 },
      team2: { id: 'ai-team', name: aiResult.name, lineup: aiResult.lineup },
      profiles,
    };
  }

  function handleConductToss() {
    // Deterministic toss using SplitMix64 from the configured seed
    const seed = BigInt(seedInput || '12345');
    const prng = new DeterministicPRNG(seed);
    const coin = prng.nextFloat() < 0.5 ? 'HEADS' : 'TAILS';
    const userWon = coin === coinSide;

    const winner = userWon ? 'USER' : 'AI';
    // AI elects to bowl if dew factor > 0.35, else bat
    const decision = winner === 'USER' ? 'BAT' : dewFactor > 0.35 ? 'BOWL' : 'BAT';

    setTossResult({
      winner,
      decision,
      coinLanded: coin,
    });
  }

  function handleStartMatch() {
    const { team1, team2, profiles } = prepareSimulationSquads();
    const seed = BigInt(seedInput || '12345');

    // Adjust batting order based on toss winner & decision
    let battingFirst = team1;
    let bowlingFirst = team2;

    if (tossResult) {
      if (
        (tossResult.winner === 'USER' && tossResult.decision === 'BOWL') ||
        (tossResult.winner === 'AI' && tossResult.decision === 'BAT')
      ) {
        battingFirst = team2;
        bowlingFirst = team1;
      }
    }

    const config: MatchSimulationConfig = {
      matchId: `match-${Date.now()}`,
      format,
      seed,
      versions: {
        simulationVersion: 'sim-1.0.0',
        rulesetVersion: 'rules-t20-icc-2026.1',
        ratingVersion: 'rate-1.0.0',
      },
      stadiumId: selectedStadiumId,
      pitchType: selectedPitch,
      conditions: {
        ambientTemperatureC: temperature,
        humidityPercentage: humidity,
        cloudCoverPercentage: cloudCover,
        dewFactor,
      },
      team1: battingFirst,
      team2: bowlingFirst,
      playerProfiles: profiles,
    };

    // Run full simulation to determine all events & bit-exact deterministic trajectory
    const result = simulateFullMatch(config);
    setSimulationResult(result);
    setLiveState(result.finalState);
    setVisibleEvents([]);
    setCurrentEventIndex(0);
    setPhase('LIVE');
    setIsPlaying(true);
  }

  function stepToNextDelivery() {
    if (!simulationResult) return;
    if (currentEventIndex >= simulationResult.allEvents.length) {
      setIsPlaying(false);
      setPhase('COMPLETED');
      return;
    }

    const nextEvent = simulationResult.allEvents[currentEventIndex];
    setVisibleEvents((prev) => [...prev, nextEvent]);
    setCurrentEventIndex((prev) => prev + 1);

    if (currentEventIndex + 1 >= simulationResult.allEvents.length) {
      setIsPlaying(false);
      setPhase('COMPLETED');
    }
  }

  function handleInstantResult() {
    if (!simulationResult) return;
    setVisibleEvents([...simulationResult.allEvents]);
    setCurrentEventIndex(simulationResult.allEvents.length);
    setIsPlaying(false);
    setPhase('COMPLETED');
  }

  function handleSimulateOver() {
    if (!simulationResult) return;
    let idx = currentEventIndex;
    const currentEvent = simulationResult.allEvents[idx];
    if (!currentEvent) return;

    const targetOver = currentEvent.overNumber;
    const currentInnings = currentEvent.inningsNumber;

    const added: DeliveryEvent[] = [];
    while (
      idx < simulationResult.allEvents.length &&
      simulationResult.allEvents[idx].overNumber === targetOver &&
      simulationResult.allEvents[idx].inningsNumber === currentInnings
    ) {
      added.push(simulationResult.allEvents[idx]);
      idx++;
    }

    setVisibleEvents((prev) => [...prev, ...added]);
    setCurrentEventIndex(idx);

    if (idx >= simulationResult.allEvents.length) {
      setIsPlaying(false);
      setPhase('COMPLETED');
    }
  }

  // Get current active event for score & visualizer
  const currentEvent: DeliveryEvent | undefined =
    visibleEvents.length > 0 ? visibleEvents[visibleEvents.length - 1] : undefined;

  const currentInningsEvents = currentEvent
    ? visibleEvents.filter((e) => e.inningsNumber === currentEvent.inningsNumber)
    : [];

  const currentRuns = currentInningsEvents.reduce((sum, e) => sum + e.scorecardDelta.totalRuns, 0);
  const currentWickets = currentInningsEvents.filter((e) => e.dismissal !== null && e.dismissal !== undefined).length;
  const legalBalls = currentInningsEvents.filter((e) => e.extras.wides === 0 && e.extras.noBalls === 0).length;
  const oversFormatted = `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
  const runRate = legalBalls > 0 ? ((currentRuns / legalBalls) * 6).toFixed(2) : '0.00';

  // Target in 2nd innings
  const innings1Events = visibleEvents.filter((e) => e.inningsNumber === 1);
  const inn1Runs = innings1Events.reduce((sum, e) => sum + e.scorecardDelta.totalRuns, 0);
  const targetRuns = inn1Runs + 1;
  const runsRemaining = targetRuns - currentRuns;
  const ballsRemaining = Math.max(0, 120 - legalBalls);
  const reqRunRate =
    ballsRemaining > 0 && currentEvent?.inningsNumber === 2
      ? ((runsRemaining / ballsRemaining) * 6).toFixed(2)
      : '0.00';

  const stadium = getStadium();

  function getPlayerDisplayName(playerId: string): string {
    const profile = simulationResult?.finalState.config.playerProfiles instanceof Map
      ? simulationResult.finalState.config.playerProfiles.get(playerId)
      : (simulationResult?.finalState.config.playerProfiles as any)?.[playerId];
    return profile?.displayName || profile?.fullName || playerId;
  }

  function formatDismissal(b: any): string {
    if (!b.isOut) return 'not out';
    if (!b.dismissal) return 'out';
    const bowlerName = getPlayerDisplayName(b.dismissal.bowlerPlayerId);
    const fielderName = b.dismissal.fielderPlayerId ? getPlayerDisplayName(b.dismissal.fielderPlayerId) : undefined;
    if (b.dismissal.mode === 'BOWLED') return `b ${bowlerName}`;
    if (b.dismissal.mode === 'LBW') return `lbw b ${bowlerName}`;
    if (b.dismissal.mode === 'CAUGHT') return fielderName ? `c ${fielderName} b ${bowlerName}` : `c & b ${bowlerName}`;
    if (b.dismissal.mode === 'CAUGHT_BEHIND') return `c †${fielderName || 'Keeper'} b ${bowlerName}`;
    if (b.dismissal.mode === 'STUMPED') return `st †${fielderName || 'Keeper'} b ${bowlerName}`;
    if (b.dismissal.mode === 'RUN_OUT') return `run out (${fielderName || bowlerName})`;
    return b.dismissal.mode.replace(/_/g, ' ').toLowerCase();
  }

  return (
    <main className="min-h-screen bg-[#0A0C0F] text-[#F8F9FA] pb-24">
      {/* Top Header */}
      <header className="border-b border-[#1E232B] bg-[#0E1116]/80 backdrop-blur sticky top-0 z-50 px-4 py-3 md:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-9 h-9 rounded-lg bg-[#0D4A38] border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] hover:scale-105 transition"
            >
              <Trophy className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm md:text-base font-bold tracking-tight text-[#F8F9FA]">
                  T20 MATCH SIMULATION ENGINE
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#18202A] text-[#D4AF37] border border-[#D4AF37]/30">
                  SplitMix64 • Phase 4
                </span>
              </div>
              <p className="text-[11px] text-[#8A94A6]">Deterministic Multi-Format Match Simulator</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dream-teams"
              className="text-xs px-3 py-1.5 rounded bg-[#161B22] hover:bg-[#202732] border border-[#262E3B] text-[#8A94A6] hover:text-[#F8F9FA] transition flex items-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Squad Builder</span>
            </Link>
            <div className="hidden md:flex items-center gap-2 text-xs text-[#8A94A6] bg-[#161B22] px-3 py-1.5 rounded border border-[#262E3B]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>v1.0.0 Autonomic Engine</span>
            </div>
          </div>
        </div>
      </header>

      {/* PHASE 1: SETUP */}
      {phase === 'SETUP' && (
        <section className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0D4A38]/30 border border-[#0D4A38] text-xs text-[#D4AF37] mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>MATCH CONFIGURATION</span>
            </div>
            <h2 className="text-3xl font-serif font-bold text-[#F8F9FA] tracking-tight mb-2">
              Configure Dream Team Match
            </h2>
            <p className="text-sm text-[#8A94A6] max-w-lg mx-auto">
              Select venue boundary dimensions, pitch behavior, weather factors, and random seed.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Left Column: Teams & Format */}
            <div className="space-y-5 bg-[#12161E] border border-[#1E2530] p-5 rounded-xl">
              <div>
                <label className="text-xs font-semibold text-[#8A94A6] uppercase tracking-wider block mb-2">
                  Match Format
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['T10', 'T20', 'ODI'] as MatchFormat[]).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setFormat(fmt)}
                      className={`py-2 px-3 rounded-lg text-xs font-medium border transition ${
                        format === fmt
                          ? 'bg-[#0D4A38] border-[#D4AF37] text-[#F8F9FA] font-bold'
                          : 'bg-[#181F2A] border-[#252E3E] text-[#8A94A6] hover:bg-[#202938]'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#8A94A6] uppercase tracking-wider block mb-2">
                  Competing Teams
                </label>
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-[#18202A] border border-[#283344] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded bg-[#EC1C24]/20 border border-[#EC1C24]/40 flex items-center justify-center text-[#EC1C24]">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[#F8F9FA]">{userTeamName}</div>
                        <div className="text-[11px] text-[#8A94A6]">11 Verified Benchmark Legends</div>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#0D4A38] text-[#D4AF37] border border-[#D4AF37]/40">
                      USER
                    </span>
                  </div>

                  <div className="flex items-center justify-center my-1 text-xs text-[#8A94A6] font-mono">
                    <Swords className="w-3.5 h-3.5 text-[#D4AF37] mr-1" /> VS
                  </div>

                  <div className="p-3 rounded-lg bg-[#18202A] border border-[#283344] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded bg-[#3B82F6]/20 border border-[#3B82F6]/40 flex items-center justify-center text-[#3B82F6]">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[#F8F9FA]">{aiTeamName}</div>
                        <div className="text-[11px] text-[#8A94A6]">Autonomous Tactical Captaincy &middot; {aiDifficulty}</div>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#1E2633] text-[#3B82F6] border border-[#3B82F6]/30">
                      AI OPPONENT
                    </span>
                  </div>
                </div>
              </div>

              {/* AI Difficulty Selector */}
              <div>
                <label className="text-xs font-semibold text-[#8A94A6] uppercase tracking-wider block mb-2">
                  AI Tactical Difficulty &amp; Strategy
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'EASY', label: 'EASY', team: 'Classic All-Stars XI', badge: 'Relaxed Tactics' },
                    { id: 'MEDIUM', label: 'MEDIUM', team: 'AI World XI', badge: 'Balanced Equilibrium' },
                    { id: 'HARD', label: 'HARD', team: 'Apex Legends XI', badge: 'Counter-Selection' },
                  ].map((d) => (
                    <button
                      key={d.id}
                      onClick={() => {
                        setAiDifficulty(d.id as AIDifficulty);
                        setAiTeamName(d.team);
                      }}
                      className={`p-2.5 rounded-lg text-left border transition flex flex-col justify-between ${
                        aiDifficulty === d.id
                          ? 'bg-[#0D4A38] border-[#D4AF37] text-[#F8F9FA] shadow-md'
                          : 'bg-[#181F2A] border-[#252E3E] text-[#8A94A6] hover:bg-[#202938]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-bold text-xs">{d.label}</span>
                        {aiDifficulty === d.id && <Sparkles className="w-3 h-3 text-[#D4AF37]" />}
                      </div>
                      <span className="text-[10px] text-[#D4AF37] mt-1 font-semibold">{d.team}</span>
                      <span className="text-[9px] text-[#8A94A6] opacity-80">{d.badge}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pitch Condition */}
              <div>
                <label className="text-xs font-semibold text-[#8A94A6] uppercase tracking-wider block mb-2">
                  Pitch Characteristics
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'HARD', label: 'Hard Bouncy', desc: 'True bounce & carry' },
                    { id: 'FLAT', label: 'Flat Belter', desc: 'Batting highway' },
                    { id: 'TURNING', label: 'Turning Deck', desc: 'Sharp spin & bite' },
                    { id: 'GREEN', label: 'Green Seam', desc: 'Pace & lateral movement' },
                    { id: 'DUSTY', label: 'Dusty Slow', desc: 'Low wear & grip' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPitch(p.id as any)}
                      className={`p-2 rounded-lg text-left border transition ${
                        selectedPitch === p.id
                          ? 'bg-[#0D4A38]/70 border-[#D4AF37] text-[#F8F9FA]'
                          : 'bg-[#181F2A] border-[#252E3E] text-[#8A94A6] hover:bg-[#202938]'
                      }`}
                    >
                      <div className="text-xs font-bold">{p.label}</div>
                      <div className="text-[10px] opacity-75">{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Stadium & Environment */}
            <div className="space-y-5 bg-[#12161E] border border-[#1E2530] p-5 rounded-xl">
              <div>
                <label className="text-xs font-semibold text-[#8A94A6] uppercase tracking-wider block mb-2">
                  Real-World Stadium
                </label>
                <select
                  value={selectedStadiumId}
                  onChange={(e) => setSelectedStadiumId(e.target.value)}
                  className="w-full bg-[#18202A] border border-[#283344] text-[#F8F9FA] text-sm rounded-lg p-2.5 focus:border-[#D4AF37] outline-none"
                >
                  {VERIFIED_STADIUMS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.city}, {s.country}) - {s.averageBoundaryRadiusMeters}m radius
                    </option>
                  ))}
                </select>

                <div className="mt-2 p-2.5 rounded bg-[#181E26] border border-[#222A36] text-[11px] text-[#8A94A6] grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[#F8F9FA] font-bold block">{stadium.averageBoundaryRadiusMeters}m</span>
                    <span>Avg Boundary</span>
                  </div>
                  <div>
                    <span className="text-[#F8F9FA] font-bold block">{stadium.altitudeMeters}m</span>
                    <span>Altitude</span>
                  </div>
                  <div>
                    <span className="text-[#F8F9FA] font-bold block">
                      {stadium.averageBoundaryRadiusMeters <= 65 ? 'High Sixes' : stadium.averageBoundaryRadiusMeters >= 78 ? 'Running 2s' : 'Balanced'}
                    </span>
                    <span>Modifer</span>
                  </div>
                </div>
              </div>

              {/* Weather & Dew */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8A94A6] flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-amber-400" /> Dew Factor (Slippery ball / Batting boost):
                  </span>
                  <span className="font-mono text-[#D4AF37] font-bold">{Math.round(dewFactor * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={dewFactor}
                  onChange={(e) => setDewFactor(parseFloat(e.target.value))}
                  className="w-full accent-[#D4AF37]"
                />

                <div className="grid grid-cols-3 gap-2 text-xs pt-2">
                  <div>
                    <label className="text-[10px] text-[#8A94A6] block mb-1">Temperature</label>
                    <input
                      type="number"
                      value={temperature}
                      onChange={(e) => setTemperature(parseInt(e.target.value) || 25)}
                      className="w-full bg-[#18202A] border border-[#283344] p-1.5 rounded text-center font-mono text-[#F8F9FA]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#8A94A6] block mb-1">Humidity %</label>
                    <input
                      type="number"
                      value={humidity}
                      onChange={(e) => setHumidity(parseInt(e.target.value) || 50)}
                      className="w-full bg-[#18202A] border border-[#283344] p-1.5 rounded text-center font-mono text-[#F8F9FA]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#8A94A6] block mb-1">Cloud Cover %</label>
                    <input
                      type="number"
                      value={cloudCover}
                      onChange={(e) => setCloudCover(parseInt(e.target.value) || 20)}
                      className="w-full bg-[#18202A] border border-[#283344] p-1.5 rounded text-center font-mono text-[#F8F9FA]"
                    />
                  </div>
                </div>
              </div>

              {/* Deterministic Seed */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <label className="text-[#8A94A6] font-semibold uppercase tracking-wider">
                    64-Bit Simulation Seed
                  </label>
                  <button
                    onClick={randomizeSeed}
                    className="text-[10px] text-[#D4AF37] hover:underline flex items-center gap-1 font-mono"
                  >
                    <RotateCcw className="w-2.5 h-2.5" /> Randomize
                  </button>
                </div>
                <input
                  type="text"
                  value={seedInput}
                  onChange={(e) => setSeedInput(e.target.value)}
                  className="w-full bg-[#18202A] border border-[#283344] text-[#D4AF37] font-mono text-sm rounded-lg p-2.5 focus:border-[#D4AF37] outline-none"
                />
                <p className="text-[10px] text-[#8A94A6] mt-1">
                  SplitMix64 determinism guarantees bit-exact event reproducibility.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={() => setPhase('TOSS')}
              className="px-8 py-3.5 rounded-lg bg-[#0D4A38] hover:bg-[#0D4A38]/90 border border-[#D4AF37] text-[#F8F9FA] font-bold text-base shadow-lg shadow-[#0D4A38]/40 transition inline-flex items-center gap-2"
            >
              <span>Proceed to Coin Toss</span>
              <ChevronRight className="w-4 h-4 text-[#D4AF37]" />
            </button>
          </div>
        </section>
      )}

      {/* PHASE 2: TOSS */}
      {phase === 'TOSS' && (
        <section className="max-w-xl mx-auto px-4 py-16 text-center">
          <div className="p-8 rounded-2xl bg-[#12161E] border border-[#222A36] shadow-2xl">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#D4AF37]/20 border-2 border-[#D4AF37] flex items-center justify-center text-[#D4AF37] text-2xl font-serif font-black mb-6 shadow-lg shadow-[#D4AF37]/10">
              🪙
            </div>

            <h2 className="text-2xl font-serif font-bold text-[#F8F9FA] mb-2">The Match Toss</h2>
            <p className="text-sm text-[#8A94A6] mb-6">
              Call the coin flip to determine batting or bowling priority.
            </p>

            {!tossResult ? (
              <div className="space-y-6">
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => setCoinSide('HEADS')}
                    className={`px-6 py-3 rounded-xl border text-sm font-bold transition ${
                      coinSide === 'HEADS'
                        ? 'bg-[#0D4A38] border-[#D4AF37] text-[#F8F9FA]'
                        : 'bg-[#181F2A] border-[#252E3E] text-[#8A94A6]'
                    }`}
                  >
                    HEADS
                  </button>
                  <button
                    onClick={() => setCoinSide('TAILS')}
                    className={`px-6 py-3 rounded-xl border text-sm font-bold transition ${
                      coinSide === 'TAILS'
                        ? 'bg-[#0D4A38] border-[#D4AF37] text-[#F8F9FA]'
                        : 'bg-[#181F2A] border-[#252E3E] text-[#8A94A6]'
                    }`}
                  >
                    TAILS
                  </button>
                </div>

                <button
                  onClick={handleConductToss}
                  className="w-full py-3.5 rounded-lg bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-[#0E1013] font-black text-sm uppercase tracking-wider transition"
                >
                  Spin the Coin
                </button>
              </div>
            ) : (
              <div className="space-y-6 animate-fade-in">
                <div className="p-4 rounded-xl bg-[#18202A] border border-[#263140]">
                  <div className="text-xs text-[#8A94A6] mb-1">Coin landed on:</div>
                  <div className="text-lg font-bold text-[#D4AF37] mb-2">{tossResult.coinLanded}</div>
                  <div className="text-base font-bold text-[#F8F9FA]">
                    {tossResult.winner === 'USER' ? `${userTeamName} won the toss!` : `${aiTeamName} won the toss!`}
                  </div>
                  <div className="text-xs text-[#8A94A6] mt-1">
                    {tossResult.winner === 'USER'
                      ? 'You have elected to BAT first.'
                      : `AI has elected to ${tossResult.decision} first.`}
                  </div>
                </div>

                <button
                  onClick={handleStartMatch}
                  className="w-full py-3.5 rounded-lg bg-[#0D4A38] hover:bg-[#0D4A38]/90 border border-[#D4AF37] text-[#F8F9FA] font-bold text-sm tracking-wider uppercase transition flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 text-[#D4AF37]" />
                  <span>Commence Match Simulation</span>
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* PHASE 3 & 4: LIVE SIMULATION & COMPLETED SCORECARD */}
      {(phase === 'LIVE' || phase === 'COMPLETED') && (
        <section className="max-w-7xl mx-auto px-4 py-6 space-y-6">
          {/* Main Scoreboard Header */}
          <div className="rounded-2xl bg-gradient-to-r from-[#12161E] via-[#161B24] to-[#12161E] border border-[#222A36] p-5 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#222A36] pb-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#0D4A38] border border-[#D4AF37]/40 flex items-center justify-center text-xl font-bold text-[#D4AF37]">
                  🏏
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg md:text-xl font-bold text-[#F8F9FA]">
                      {currentEvent?.inningsNumber === 1
                        ? simulationResult?.finalState.innings[0].battingTeamId === 'user-team'
                          ? userTeamName
                          : aiTeamName
                        : simulationResult?.finalState.innings[1]?.battingTeamId === 'user-team'
                          ? userTeamName
                          : aiTeamName}
                    </h2>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#1C2430] text-[#D4AF37] border border-[#D4AF37]/30">
                      Innings {currentEvent?.inningsNumber ?? 1}
                    </span>
                  </div>
                  <p className="text-xs text-[#8A94A6]">
                    vs{' '}
                    {currentEvent?.inningsNumber === 1
                      ? simulationResult?.finalState.innings[0].bowlingTeamId === 'ai-team'
                        ? aiTeamName
                        : userTeamName
                      : simulationResult?.finalState.innings[1]?.bowlingTeamId === 'ai-team'
                        ? aiTeamName
                        : userTeamName}
                  </p>
                </div>
              </div>

              {/* Score Display */}
              <div className="flex items-baseline gap-4">
                <div>
                  <span className="text-3xl md:text-5xl font-black font-mono text-[#F8F9FA] tracking-tight">
                    {currentRuns}/{currentWickets}
                  </span>
                  <span className="text-sm md:text-lg font-mono text-[#8A94A6] ml-2">
                    ({oversFormatted} / 20 ov)
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-xs text-[#8A94A6]">Current RR</div>
                  <div className="text-base font-mono font-bold text-emerald-400">{runRate}</div>
                </div>
                {currentEvent?.inningsNumber === 2 && (
                  <div className="text-right pl-3 border-l border-[#222A36]">
                    <div className="text-xs text-[#8A94A6]">Req RR</div>
                    <div className="text-base font-mono font-bold text-amber-400">{reqRunRate}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Target & Match Situation Bar */}
            <div className="flex flex-wrap items-center justify-between text-xs text-[#8A94A6] gap-2">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-[#D4AF37]">
                  <MapPin className="w-3.5 h-3.5" /> {stadium.name}
                </span>
                <span>•</span>
                <span>Pitch: {selectedPitch}</span>
                <span>•</span>
                <span>Dew: {Math.round(dewFactor * 100)}%</span>
              </div>

              <div>
                {currentEvent?.inningsNumber === 2 ? (
                  <span className="font-semibold text-amber-300">
                    Need {runsRemaining} runs from {ballsRemaining} balls to win
                  </span>
                ) : (
                  <span>First Innings in progress • Projected: {Math.round(parseFloat(runRate) * 20)}</span>
                )}
              </div>
            </div>
          </div>

          {/* PixiJS v8 2D Match Visualizer & Television Broadcast Theater */}
          {liveState && (
            <div className="mb-6">
              <CricketVisualizerCanvas
                matchState={liveState}
                activeEvent={currentEvent}
                isPlaying={isPlaying}
                playSpeed={playSpeed}
                onPlayPauseToggle={() => setIsPlaying(!isPlaying)}
                onStepNextBall={stepToNextDelivery}
                onSkipOver={handleSimulateOver}
                onSpeedChange={(speed) => setPlaySpeed(speed)}
              />
            </div>
          )}

          {/* 3-Column Interactive Dashboard */}
          <div className="grid lg:grid-cols-12 gap-6">
            {/* Column 1: Live Ball-by-Ball Pitch Wagon Wheel & Trajectory (5 cols) */}
            <div className="lg:col-span-5 bg-[#12161E] border border-[#1E2530] rounded-xl p-4 flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#8A94A6] uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-[#D4AF37]" /> Ball Trajectory & Field Radar
                </span>
                {currentEvent && (
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded font-mono font-bold ${
                      currentEvent.outcome === 'SIX'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : currentEvent.outcome === 'FOUR'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                          : currentEvent.outcome === 'WICKET'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                            : 'bg-[#1A222D] text-[#8A94A6]'
                    }`}
                  >
                    {currentEvent.outcome}
                  </span>
                )}
              </div>

              {/* 2D Circular Cricket Ground Canvas/SVG */}
              <div className="relative w-full aspect-square max-w-[340px] my-auto flex items-center justify-center">
                <svg viewBox="-100 -100 200 200" className="w-full h-full">
                  {/* Outfield Grass */}
                  <circle cx="0" cy="0" r="95" fill="#0D2418" stroke="#1D4A33" strokeWidth="2" />
                  {/* Boundary Rope */}
                  <circle cx="0" cy="0" r="90" fill="none" stroke="#D4AF37" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
                  {/* 30-Yard Circle */}
                  <circle cx="0" cy="0" r="50" fill="none" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.25" strokeDasharray="2 2" />

                  {/* Central Pitch Strip */}
                  <rect x="-6" y="-18" width="12" height="36" fill="#785A3A" rx="1.5" opacity="0.85" />
                  {/* Bowling Crease & Stumps */}
                  <line x1="-5" y1="-14" x2="5" y2="-14" stroke="#FFF" strokeWidth="0.8" />
                  <line x1="-5" y1="14" x2="5" y2="14" stroke="#FFF" strokeWidth="0.8" />

                  {/* Dynamic Trajectory Line from Crease to Landing Coordinate */}
                  {currentEvent?.trajectory && (() => {
                    const rad = ((currentEvent.trajectory.angleDegrees - 90) * Math.PI) / 180;
                    const normDist = Math.min(88, (currentEvent.trajectory.distanceMeters / (stadium.averageBoundaryRadiusMeters || 70)) * 88);
                    const lx = normDist * Math.cos(rad);
                    const ly = normDist * Math.sin(rad);
                    const strokeColor =
                      currentEvent.outcome === 'SIX'
                        ? '#F59E0B'
                        : currentEvent.outcome === 'FOUR'
                          ? '#3B82F6'
                          : currentEvent.outcome === 'WICKET'
                            ? '#EF4444'
                            : '#10B981';

                    return (
                      <g>
                        <line
                          x1="0"
                          y1="12"
                          x2={lx}
                          y2={ly}
                          stroke={strokeColor}
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          className="animate-pulse"
                        />
                        <circle cx={lx} cy={ly} r="3.5" fill={strokeColor} />
                      </g>
                    );
                  })()}
                </svg>

                {/* Shot Details Badge Overlay */}
                {currentEvent?.trajectory && (
                  <div className="absolute bottom-2 left-2 right-2 bg-[#0E1218]/90 border border-[#222A36] p-2 rounded text-[11px] flex justify-between items-center backdrop-blur">
                    <div>
                      <span className="text-[#8A94A6] block">Trajectory Angle & Dist</span>
                      <span className="font-bold text-[#F8F9FA]">
                        {Math.round(currentEvent.trajectory.angleDegrees)}° • {Math.round(currentEvent.trajectory.distanceMeters)}m
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[#8A94A6] block">Elevation & Flight</span>
                      <span className="font-mono text-[#D4AF37] font-bold">
                        {Math.round(currentEvent.trajectory.elevationDegrees)}° ({currentEvent.trajectory.isAirborne ? 'Aerial' : 'Ground'})
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Column 2: Live Tactical Controls & Playback Stepper (4 cols) */}
            <div className="lg:col-span-4 bg-[#12161E] border border-[#1E2530] rounded-xl p-4 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#1E2530]">
                  <span className="text-xs font-bold text-[#8A94A6] uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#D4AF37]" /> Tactical Controls
                  </span>
                  <label className="flex items-center gap-1.5 text-[11px] text-[#8A94A6] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAIOptimized}
                      onChange={(e) => setIsAIOptimized(e.target.checked)}
                      className="accent-[#D4AF37]"
                    />
                    <span>AI Autonomous</span>
                  </label>
                </div>

                {/* Tactical Selections */}
                <div className="space-y-2.5 text-xs">
                  <div>
                    <label className="text-[10px] text-[#8A94A6] block mb-1">Batter Tactical Intent</label>
                    <select
                      disabled={isAIOptimized}
                      value={userIntent}
                      onChange={(e) => setUserIntent(e.target.value as any)}
                      className="w-full bg-[#18202A] border border-[#252E3E] text-[#F8F9FA] p-1.5 rounded text-xs disabled:opacity-50"
                    >
                      <option value="DEFEND">Defend (Block & Anchor)</option>
                      <option value="ROTATE_STRIKE">Rotate Strike (Singles & 2s)</option>
                      <option value="BALANCED">Balanced (Neutral)</option>
                      <option value="AGGRESSIVE">Aggressive (Attack gaps)</option>
                      <option value="MAXIMUM_POWER">Maximum Power (Clearing boundaries)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#8A94A6] block mb-1">Bowler Length & Line</label>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        disabled={isAIOptimized}
                        value={userLength}
                        onChange={(e) => setUserLength(e.target.value as any)}
                        className="bg-[#18202A] border border-[#252E3E] text-[#F8F9FA] p-1.5 rounded text-xs disabled:opacity-50"
                      >
                        <option value="YORKER">Yorker</option>
                        <option value="FULL">Full</option>
                        <option value="GOOD_LENGTH">Good Length</option>
                        <option value="BACK_OF_LENGTH">Back of Length</option>
                        <option value="SHORT">Short / Bouncer</option>
                      </select>
                      <select
                        disabled={isAIOptimized}
                        value={userLine}
                        onChange={(e) => setUserLine(e.target.value as any)}
                        className="bg-[#18202A] border border-[#252E3E] text-[#F8F9FA] p-1.5 rounded text-xs disabled:opacity-50"
                      >
                        <option value="OUTSIDE_OFF">Outside Off</option>
                        <option value="STUMPS">Stumps</option>
                        <option value="DOWN_LEG">Down Leg</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#8A94A6] block mb-1">Field Preset</label>
                    <select
                      disabled={isAIOptimized}
                      value={userField}
                      onChange={(e) => setUserField(e.target.value as any)}
                      className="w-full bg-[#18202A] border border-[#252E3E] text-[#F8F9FA] p-1.5 rounded text-xs disabled:opacity-50"
                    >
                      <option value="BALANCED_RING">Balanced Ring (Standard)</option>
                      <option value="ATTACKING_CLOSE_CATCHERS">Attacking (Slip & Sliders)</option>
                      <option value="DEATH_BOUNDARY_DEFENSE">Death Boundary Defense</option>
                      <option value="SPIN_CHOKE">Spin Choke (Padded ring)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Simulation Stepper Buttons */}
              <div className="space-y-2 pt-2 border-t border-[#1E2530]">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="py-2.5 px-3 rounded-lg bg-[#0D4A38] hover:bg-[#0D4A38]/90 border border-[#D4AF37]/50 text-[#F8F9FA] text-xs font-bold flex items-center justify-center gap-1.5 transition"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5 text-[#D4AF37]" /> : <Play className="w-3.5 h-3.5 text-[#D4AF37]" />}
                    <span>{isPlaying ? 'Pause' : 'Auto Play'}</span>
                  </button>
                  <button
                    onClick={stepToNextDelivery}
                    className="py-2.5 px-3 rounded-lg bg-[#1C232E] hover:bg-[#252E3D] border border-[#2C3748] text-[#F8F9FA] text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    <Play className="w-3 h-3 text-emerald-400" />
                    <span>Next Ball</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleSimulateOver}
                    className="py-2 px-3 rounded-lg bg-[#18202A] hover:bg-[#202938] border border-[#263140] text-[#8A94A6] hover:text-[#F8F9FA] text-xs font-medium transition"
                  >
                    Simulate Over
                  </button>
                  <button
                    onClick={handleInstantResult}
                    className="py-2 px-3 rounded-lg bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-bold transition flex items-center justify-center gap-1"
                  >
                    <FastForward className="w-3 h-3" />
                    <span>Instant Result</span>
                  </button>
                </div>

                {/* Speed Slider */}
                <div className="flex items-center justify-between text-[11px] text-[#8A94A6] pt-1">
                  <span>Speed:</span>
                  <div className="flex gap-1">
                    {[
                      { label: '0.5x', ms: 500 },
                      { label: '1x', ms: 300 },
                      { label: '2x', ms: 120 },
                      { label: '5x', ms: 40 },
                    ].map((s) => (
                      <button
                        key={s.label}
                        onClick={() => setPlaySpeed(s.ms)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                          playSpeed === s.ms
                            ? 'bg-[#0D4A38] text-[#D4AF37] border-[#D4AF37]/40'
                            : 'bg-[#181F2A] border-[#252E3E] text-[#8A94A6]'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Column 3: Live Broadcast Commentary Feed (3 cols) */}
            <div className="lg:col-span-3 bg-[#12161E] border border-[#1E2530] rounded-xl p-4 flex flex-col h-[400px]">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1E2530]">
                <span className="text-xs font-bold text-[#8A94A6] uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" /> Ball Commentary
                </span>
                <span className="text-[10px] text-[#8A94A6] font-mono">{visibleEvents.length} balls</span>
              </div>

              <div ref={commentaryContainerRef} className="flex-1 overflow-y-auto space-y-2 pr-1 font-sans">
                {visibleEvents.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-[#8A94A6] text-center">
                    Simulate the first delivery to begin live broadcast commentary.
                  </div>
                ) : (
                  visibleEvents.map((e, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded bg-[#161C24] border border-[#202733] text-xs space-y-1 animate-fade-in"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[#D4AF37] font-bold text-[11px]">
                          {e.overNumber}.{e.ballInOver}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                            e.outcome === 'SIX'
                              ? 'bg-amber-500/20 text-amber-300'
                              : e.outcome === 'FOUR'
                                ? 'bg-blue-500/20 text-blue-300'
                                : e.outcome === 'WICKET'
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : 'text-[#8A94A6]'
                          }`}
                        >
                          {e.outcome}
                        </span>
                      </div>
                      <p className="text-[#C5CEE0] text-[11px] leading-relaxed">{e.commentary}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Full Reconciled Scorecards & Post-Match Presentation */}
          {phase === 'COMPLETED' && simulationResult && (
            <div className="rounded-2xl bg-[#12161E] border border-[#222A36] p-6 shadow-2xl space-y-6 animate-fade-in">
              {/* Match Result Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-[#0D4A38]/50 via-[#12161E] to-[#0D4A38]/50 border border-[#D4AF37]/50 text-center">
                <div className="text-xs text-[#D4AF37] tracking-widest uppercase font-mono mb-1">
                  OFFICIAL ICC T20 MATCH RESULT
                </div>
                <div className="text-2xl font-serif font-black text-[#F8F9FA] mb-2">
                  {simulationResult.scorecard.result?.summary ?? 'Match Finished'}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-[#8A94A6]">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 100% Deterministic Replay Verified
                  </span>
                  <span>•</span>
                  <span>Initial Hash: {simulationResult.initialStateHash.slice(0, 16)}...</span>
                  <span>•</span>
                  <span>Seed: #{simulationResult.finalState.config.seed.toString()}</span>
                </div>
              </div>

              {/* Player of the Match Showcase */}
              {simulationResult.scorecard.playerOfTheMatch && (
                <div className="p-4 rounded-xl bg-[#18202A] border border-[#D4AF37]/30 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center text-[#D4AF37]">
                      <Award className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs text-[#D4AF37] font-bold uppercase tracking-wider">
                        PLAYER OF THE MATCH
                      </div>
                      <div className="text-lg font-bold text-[#F8F9FA]">
                        {simulationResult.scorecard.playerOfTheMatch.playerName}
                      </div>
                      <div className="text-xs text-[#8A94A6]">
                        {simulationResult.scorecard.playerOfTheMatch.teamName}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono text-[#D4AF37] font-bold">
                      {simulationResult.scorecard.playerOfTheMatch.impactPoints} pts
                    </div>
                    <div className="text-xs text-[#8A94A6] max-w-xs">
                      {simulationResult.scorecard.playerOfTheMatch.performanceSummary}
                    </div>
                  </div>
                </div>
              )}

              {/* Scorecard Innings Tabs */}
              <div>
                <div className="flex items-center gap-2 border-b border-[#222A36] pb-2 mb-4">
                  {simulationResult.scorecard.innings.map((inn, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedInningsTab(idx)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                        selectedInningsTab === idx
                          ? 'bg-[#0D4A38] text-[#D4AF37] border border-[#D4AF37]/40'
                          : 'bg-[#18202A] text-[#8A94A6] hover:text-[#F8F9FA]'
                      }`}
                    >
                      Innings {inn.inningsNumber}: {inn.battingTeamName} ({inn.totalRuns}/{inn.totalWickets})
                    </button>
                  ))}
                </div>

                {/* Selected Innings Scorecard Table */}
                {simulationResult.scorecard.innings[selectedInningsTab] && (
                  <div className="space-y-6">
                    {/* Batting Card */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#222A36] text-[#8A94A6]">
                            <th className="py-2.5 px-3">Batter</th>
                            <th className="py-2.5 px-3">Dismissal</th>
                            <th className="py-2.5 px-3 text-right">R</th>
                            <th className="py-2.5 px-3 text-right">B</th>
                            <th className="py-2.5 px-3 text-right">4s</th>
                            <th className="py-2.5 px-3 text-right">6s</th>
                            <th className="py-2.5 px-3 text-right">SR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {simulationResult.scorecard.innings[selectedInningsTab].batters.map((b) => (
                            <tr key={b.playerId} className="border-b border-[#181F2A] hover:bg-[#161D27]">
                              <td className="py-2 px-3 font-semibold text-[#F8F9FA]">{getPlayerDisplayName(b.playerId)}</td>
                              <td className="py-2 px-3 text-[#8A94A6] text-[11px]">{formatDismissal(b)}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-[#F8F9FA]">{b.runs}</td>
                              <td className="py-2 px-3 text-right font-mono text-[#8A94A6]">{b.ballsFaced}</td>
                              <td className="py-2 px-3 text-right font-mono text-[#8A94A6]">{b.fours}</td>
                              <td className="py-2 px-3 text-right font-mono text-[#8A94A6]">{b.sixes}</td>
                              <td className="py-2 px-3 text-right font-mono text-emerald-400">{b.strikeRate.toFixed(1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Bowling Card */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#222A36] text-[#8A94A6]">
                            <th className="py-2.5 px-3">Bowler</th>
                            <th className="py-2.5 px-3 text-right">O</th>
                            <th className="py-2.5 px-3 text-right">M</th>
                            <th className="py-2.5 px-3 text-right">R</th>
                            <th className="py-2.5 px-3 text-right">W</th>
                            <th className="py-2.5 px-3 text-right">Econ</th>
                            <th className="py-2.5 px-3 text-right">Dots</th>
                          </tr>
                        </thead>
                        <tbody>
                          {simulationResult.scorecard.innings[selectedInningsTab].bowlers.map((bw) => (
                            <tr key={bw.playerId} className="border-b border-[#181F2A] hover:bg-[#161D27]">
                              <td className="py-2 px-3 font-semibold text-[#F8F9FA]">{getPlayerDisplayName(bw.playerId)}</td>
                              <td className="py-2 px-3 text-right font-mono text-[#8A94A6]">{bw.oversBowledFormatted}</td>
                              <td className="py-2 px-3 text-right font-mono text-[#8A94A6]">{bw.maidens}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-[#F8F9FA]">{bw.runsConceded}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-amber-400">{bw.wickets}</td>
                              <td className="py-2 px-3 text-right font-mono text-emerald-400">{bw.economyRate.toFixed(2)}</td>
                              <td className="py-2 px-3 text-right font-mono text-[#8A94A6]">{bw.dots}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Partnerships Table */}
                    {simulationResult.scorecard.innings[selectedInningsTab].partnerships &&
                      simulationResult.scorecard.innings[selectedInningsTab].partnerships.length > 0 && (
                        <div className="overflow-x-auto pt-2">
                          <div className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" /> Reconciled Partnerships Breakdown
                          </div>
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-[#222A36] text-[#8A94A6]">
                                <th className="py-2 px-3">Wicket</th>
                                <th className="py-2 px-3">Batter 1</th>
                                <th className="py-2 px-3">Batter 2</th>
                                <th className="py-2 px-3 text-right">Runs (Balls)</th>
                                <th className="py-2 px-3 text-right">Partnership Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {simulationResult.scorecard.innings[selectedInningsTab].partnerships.map((p, pIdx) => (
                                <tr key={pIdx} className="border-b border-[#181F2A] hover:bg-[#161D27]">
                                  <td className="py-2 px-3 font-mono font-bold text-amber-400">#{p.wicketNumber}</td>
                                  <td className="py-2 px-3 font-semibold text-[#F8F9FA]">
                                    {getPlayerDisplayName(p.batter1Id)}{' '}
                                    <span className="text-[#8A94A6] font-mono text-[11px]">({p.batter1Runs})</span>
                                  </td>
                                  <td className="py-2 px-3 font-semibold text-[#F8F9FA]">
                                    {getPlayerDisplayName(p.batter2Id)}{' '}
                                    <span className="text-[#8A94A6] font-mono text-[11px]">({p.batter2Runs})</span>
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono text-[#8A94A6]">{p.totalRuns} ({p.balls}b)</td>
                                  <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">{p.totalRuns}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center gap-4 pt-4 border-t border-[#222A36]">
                <button
                  onClick={() => {
                    setPhase('SETUP');
                    randomizeSeed();
                  }}
                  className="px-6 py-2.5 rounded-lg bg-[#18202A] hover:bg-[#222B38] border border-[#283344] text-xs font-semibold text-[#F8F9FA] transition"
                >
                  Configure New Match
                </button>
                <button
                  onClick={() => {
                    handleStartMatch();
                  }}
                  className="px-6 py-2.5 rounded-lg bg-[#0D4A38] hover:bg-[#0D4A38]/90 border border-[#D4AF37]/50 text-xs font-bold text-[#D4AF37] transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Replay With Same Seed
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
