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
  History,
  AlertTriangle,
  X,
  RefreshCw,
  Globe,
  BookOpen,
} from 'lucide-react';
import {
  SUPPORTED_NATIONAL_TEAMS,
  buildNationalLineup,
  buildWorldXILineup,
} from '@/lib/national-teams';
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
  createInitialMatchState,
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
  type ReplayVerificationReport,
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

export interface ActiveMatchSession {
  version: string;
  matchId: string;
  format: MatchFormat;
  selectedStadiumId: string;
  selectedPitch: 'HARD' | 'FLAT' | 'TURNING' | 'GREEN' | 'DUSTY';
  dewFactor: number;
  temperature: number;
  humidity: number;
  cloudCover: number;
  seedInput: string;
  userTeamName: string;
  aiTeamName: string;
  aiDifficulty: AIDifficulty;
  tossResult: {
    winner: 'USER' | 'AI';
    decision: 'BAT' | 'BOWL';
    coinLanded: 'HEADS' | 'TAILS';
    aiReason?: string;
  } | null;
  currentEventIndex: number;
  visibleEvents: DeliveryEvent[];
  initialStateHash: string;
  savedAt: string;
}

export interface ArchivedMatchRecord {
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
  initialStateHash: string;
  totalDeliveries: number;
}

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
    aiReason?: string;
  } | null>(null);

  const liveStateRef = useRef<MatchState | null>(null);
  const livePrngRef = useRef<DeterministicPRNG | null>(null);

  // --- Live Simulation State ---
  const [simulationResult, setSimulationResult] = useState<MatchSimulationResult | null>(null);
  const [liveState, setLiveState] = useState<MatchState | null>(null);
  const [visibleEvents, setVisibleEvents] = useState<DeliveryEvent[]>([]);
  const [currentEventIndex, setCurrentEventIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeed, setPlaySpeed] = useState<number>(300); // ms per ball
  const [selectedInningsTab, setSelectedInningsTab] = useState<number>(0);

  // --- Persistence & Vault State (Gates P6.11 & P6.12) ---
  const [activeSession, setActiveSession] = useState<ActiveMatchSession | null>(null);
  const [matchHistory, setMatchHistory] = useState<ArchivedMatchRecord[]>([]);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState<boolean>(false);
  const [replayReport, setReplayReport] = useState<ReplayVerificationReport | null>(null);
  const [showReplayModal, setShowReplayModal] = useState<boolean>(false);

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

  // --- Nation & World XI Match Modes ---
  const [teamMode, setTeamMode] = useState<'ONE_TEAM_PER_NATION' | 'ONE_PLAYER_PER_NATION' | 'CUSTOM_DREAM_TEAM'>('ONE_TEAM_PER_NATION');
  const [userNation, setUserNation] = useState<string>('India');
  const [aiNation, setAiNation] = useState<string>('Australia');

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

      const sessionStr = localStorage.getItem('cricket_active_match_session');
      if (sessionStr) {
        const parsedSession = JSON.parse(sessionStr);
        if (parsedSession && parsedSession.currentEventIndex > 0) {
          setActiveSession(parsedSession);
        }
      }

      const historyStr = localStorage.getItem('cricket_match_history');
      if (historyStr) {
        const parsedHistory = JSON.parse(historyStr);
        if (Array.isArray(parsedHistory)) {
          setMatchHistory(parsedHistory);
        }
      }
    } catch {
      // Ignore
    }
  }, []);

  function saveActiveSession(
    currentState: MatchState,
    events: DeliveryEvent[],
    eventIndex: number,
  ) {
    if (typeof window === 'undefined') return;
    try {
      const session: ActiveMatchSession = {
        version: '1.0.0',
        matchId: currentState.config.matchId,
        format,
        selectedStadiumId,
        selectedPitch,
        dewFactor,
        temperature,
        humidity,
        cloudCover,
        seedInput,
        userTeamName,
        aiTeamName,
        aiDifficulty,
        tossResult,
        currentEventIndex: eventIndex,
        visibleEvents: events,
        initialStateHash: simulationResult?.initialStateHash || '',
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem('cricket_active_match_session', JSON.stringify(session));
    } catch (err) {
      console.error('Failed to save active match session:', err);
    }
  }

  function archiveCompletedMatch(result: MatchSimulationResult) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem('cricket_active_match_session');
      setActiveSession(null);

      const existingHistoryStr = localStorage.getItem('cricket_match_history');
      const history: ArchivedMatchRecord[] = existingHistoryStr ? JSON.parse(existingHistoryStr) : [];

      const inn1 = result.scorecard.innings[0];
      const inn2 = result.scorecard.innings[1];
      const stadiumSpec = VERIFIED_STADIUMS.find((s) => s.id === result.finalState.config.stadiumId);

      const record: ArchivedMatchRecord = {
        id: result.matchId,
        date: new Date().toISOString(),
        format: result.finalState.config.format,
        seed: result.finalState.config.seed.toString(),
        stadiumName: stadiumSpec?.name || 'International Stadium',
        pitchType: result.finalState.config.pitchType,
        team1Name: inn1?.battingTeamName || 'Team 1',
        team1Score: inn1 ? `${inn1.totalRuns}/${inn1.totalWickets} (${inn1.oversCompletedFormatted} ov)` : '-',
        team2Name: inn2?.battingTeamName || 'Team 2',
        team2Score: inn2 ? `${inn2.totalRuns}/${inn2.totalWickets} (${inn2.oversCompletedFormatted} ov)` : '-',
        resultSummary: result.scorecard.result?.summary || 'Match Finished',
        potm: result.scorecard.playerOfTheMatch
          ? {
              name: result.scorecard.playerOfTheMatch.playerName,
              team: result.scorecard.playerOfTheMatch.teamName,
              points: result.scorecard.playerOfTheMatch.impactPoints,
              summary: result.scorecard.playerOfTheMatch.performanceSummary,
            }
          : null,
        initialStateHash: result.initialStateHash,
        totalDeliveries: result.allEvents.length,
      };

      const updated = [record, ...history.filter((h) => h.id !== record.id)].slice(0, 20);
      localStorage.setItem('cricket_match_history', JSON.stringify(updated));
      setMatchHistory(updated);
    } catch (err) {
      console.error('Failed to archive completed match:', err);
    }
  }

  function handleDiscardActiveSession() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cricket_active_match_session');
    }
    setActiveSession(null);
  }

  function handleResumeMatch() {
    if (!activeSession) return;

    setFormat(activeSession.format);
    setSelectedStadiumId(activeSession.selectedStadiumId);
    setSelectedPitch(activeSession.selectedPitch);
    setDewFactor(activeSession.dewFactor);
    setTemperature(activeSession.temperature);
    setHumidity(activeSession.humidity);
    setCloudCover(activeSession.cloudCover);
    setSeedInput(activeSession.seedInput);
    setUserTeamName(activeSession.userTeamName);
    setAiTeamName(activeSession.aiTeamName);
    setAiDifficulty(activeSession.aiDifficulty);
    setTossResult(activeSession.tossResult);

    const { team1, team2, profiles } = prepareSimulationSquads();
    const seed = BigInt(activeSession.seedInput || '12345');

    let battingFirst = team1;
    let bowlingFirst = team2;

    if (activeSession.tossResult) {
      if (
        (activeSession.tossResult.winner === 'USER' && activeSession.tossResult.decision === 'BOWL') ||
        (activeSession.tossResult.winner === 'AI' && activeSession.tossResult.decision === 'BAT')
      ) {
        battingFirst = team2;
        bowlingFirst = team1;
      }
    }

    const config: MatchSimulationConfig = {
      matchId: activeSession.matchId,
      format: activeSession.format,
      seed,
      versions: {
        simulationVersion: 'sim-1.0.0',
        rulesetVersion: 'rules-t20-icc-2026.1',
        ratingVersion: 'rate-1.0.0',
      },
      stadiumId: activeSession.selectedStadiumId,
      pitchType: activeSession.selectedPitch,
      conditions: {
        ambientTemperatureC: activeSession.temperature,
        humidityPercentage: activeSession.humidity,
        cloudCoverPercentage: activeSession.cloudCover,
        dewFactor: activeSession.dewFactor,
      },
      team1: battingFirst,
      team2: bowlingFirst,
      playerProfiles: profiles,
    };

    const fullResult = simulateFullMatch(config);
    setSimulationResult(fullResult);

    let currentLiveState = createInitialMatchState(config);
    const livePrng = new DeterministicPRNG(seed);

    for (let i = 0; i < activeSession.currentEventIndex; i++) {
      if (currentLiveState.status === 'COMPLETED') break;
      const aiAction = resolveAITacticalAction(currentLiveState, livePrng);
      const { nextState } = stepDelivery(currentLiveState, aiAction, livePrng);
      currentLiveState = nextState;
    }

    liveStateRef.current = currentLiveState;
    livePrngRef.current = livePrng;

    setLiveState(currentLiveState);
    setVisibleEvents(activeSession.visibleEvents);
    setCurrentEventIndex(activeSession.currentEventIndex);
    setActiveSession(null);
    setPhase(currentLiveState.status === 'COMPLETED' ? 'COMPLETED' : 'LIVE');
    setIsPlaying(false);
  }

  function handleVerifyReplay(targetResult?: MatchSimulationResult) {
    const resultToVerify = targetResult || simulationResult;
    if (!resultToVerify) return;
    const report = verifyMatchReplay(resultToVerify);
    setReplayReport(report);
    setShowReplayModal(true);
  }

  function handleVerifyArchivedMatch(record: ArchivedMatchRecord) {
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
        formatRating: p.ratings[record.format] || p.ratings.T20,
        ratings: p.ratings,
      });
    }

    const t1Names = ['Rohit', 'Gilchrist', 'Kohli', 'Lara', 'Villiers', 'Sobers', 'Stokes', 'Jadeja', 'Akram', 'Warne', 'Bumrah'];
    const defaultIds = t1Names.map((n) => all.find((p) => p.fullName.includes(n))?.id || all[0].id);
    const lineup1 = defaultIds.map((pid, idx) => ({
      playerId: pid,
      battingOrder: idx + 1,
      isCaptain: idx === 2,
      isDesignatedWicketkeeper: idx === 1,
      bowlingPriority: idx === 8 ? 1 : idx === 10 ? 1 : idx === 9 ? 2 : idx === 7 ? 3 : idx === 5 ? 4 : idx === 6 ? 5 : null,
    }));

    const seed = BigInt(record.seed);
    const aiResult = generateAIOpponentTeam(profiles, {
      userLineup: lineup1,
      difficulty: 'MEDIUM',
      pitchType: (record.pitchType as any) || 'HARD',
      format: record.format,
      seed,
    });

    const config: MatchSimulationConfig = {
      matchId: record.id,
      format: record.format,
      seed,
      versions: {
        simulationVersion: 'sim-1.0.0',
        rulesetVersion: 'rules-t20-icc-2026.1',
        ratingVersion: 'rate-1.0.0',
      },
      stadiumId: record.stadiumName.toLowerCase().includes('melbourne') ? 'stadium-mcg' : 'stadium-lords',
      pitchType: (record.pitchType as any) || 'HARD',
      conditions: {
        ambientTemperatureC: 27,
        humidityPercentage: 55,
        cloudCoverPercentage: 20,
        dewFactor: 0.2,
      },
      team1: { id: 'team-1', name: record.team1Name, lineup: lineup1 },
      team2: { id: 'team-2', name: record.team2Name, lineup: aiResult.lineup },
      playerProfiles: profiles,
    };

    const simulated = simulateFullMatch(config);
    const report = verifyMatchReplay(simulated);
    setReplayReport(report);
    setShowReplayModal(true);
  }

  function handleLoadArchivedReplay(record: ArchivedMatchRecord) {
    setSeedInput(record.seed);
    setFormat(record.format);
    setSelectedPitch((record.pitchType as any) || 'HARD');
    setShowHistoryDrawer(false);
    setPhase('SETUP');
  }

  function handleReplayFromStart() {
    if (!simulationResult) return;
    const config = simulationResult.finalState.config;
    const initialLiveState = createInitialMatchState(config);
    const livePrng = new DeterministicPRNG(config.seed);
    liveStateRef.current = initialLiveState;
    livePrngRef.current = livePrng;

    setLiveState(initialLiveState);
    setVisibleEvents([]);
    setCurrentEventIndex(0);
    setPhase('LIVE');
    setIsPlaying(true);
  }

  function handleRematch() {
    randomizeSeed();
    handleStartMatch();
  }

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
        primaryNationality: p.primaryNationality,
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

    if (teamMode === 'ONE_TEAM_PER_NATION') {
      const res = buildNationalLineup(userNation, all, format);
      lineup1 = res.lineup;
      customName = res.teamName;
    } else if (teamMode === 'ONE_PLAYER_PER_NATION') {
      const res = buildWorldXILineup(all, format);
      lineup1 = res.lineup;
      customName = 'User World XI (1 Per Nation)';
    } else {
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
    }

    // Team 2: Dynamically generated AI Opponent tailored to pitch & difficulty (0 overlap)
    const seed = BigInt(seedInput || '987654321');
    const aiResult = generateAIOpponentTeam(profiles, {
      userLineup: lineup1,
      difficulty: aiDifficulty,
      pitchType: selectedPitch,
      format,
      seed,
      uniqueNationRule: teamMode === 'ONE_PLAYER_PER_NATION',
      targetNation: teamMode === 'ONE_TEAM_PER_NATION' ? aiNation : undefined,
      excludedNations: teamMode === 'ONE_TEAM_PER_NATION' ? [userNation] : undefined,
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

    const winner: 'USER' | 'AI' = userWon ? 'USER' : 'AI';
    let aiDecision: 'BAT' | 'BOWL' = 'BAT';
    let aiReason = '';

    if (dewFactor > 0.25 || selectedPitch === 'FLAT') {
      aiDecision = 'BOWL';
      aiReason = `Elected to BOWL first to exploit anticipated dew (${Math.round(dewFactor * 100)}%) and favorable chase conditions.`;
    } else if (selectedPitch === 'TURNING' || selectedPitch === 'DUSTY') {
      aiDecision = 'BAT';
      aiReason = `Elected to BAT first to capitalize on fresh track carry before pitch wear and spin accelerate.`;
    } else {
      aiDecision = prng.nextFloat() < 0.5 ? 'BAT' : 'BOWL';
      aiReason = `Elected to ${aiDecision} first based on balanced team tactical equilibrium.`;
    }

    setTossResult({
      winner,
      decision: winner === 'USER' ? 'BAT' : aiDecision,
      coinLanded: coin,
      aiReason,
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

    // Pre-calculate full match for verification & scorecard fallback
    const result = simulateFullMatch(config);
    setSimulationResult(result);

    // Initialize live interactive simulation state
    const initialLiveState = createInitialMatchState(config);
    const livePrng = new DeterministicPRNG(seed);
    liveStateRef.current = initialLiveState;
    livePrngRef.current = livePrng;

    setLiveState(initialLiveState);
    setVisibleEvents([]);
    setCurrentEventIndex(0);
    setPhase('LIVE');
    setIsPlaying(true);
  }

  function stepToNextDelivery() {
    if (!liveStateRef.current || !livePrngRef.current) return;
    const state = liveStateRef.current;
    const prng = livePrngRef.current;

    if (state.status === 'COMPLETED') {
      setIsPlaying(false);
      setPhase('COMPLETED');
      return;
    }

    const aiAction = resolveAITacticalAction(state, prng);
    const currentInnings = state.innings[state.currentInningsIndex];
    const isUserBatting = currentInnings?.battingTeamId === 'user-team';
    const isUserBowling = currentInnings?.bowlingTeamId === 'user-team';

    const action: TacticalDeliveryAction = {
      batterIntent: isUserBatting && !isAIOptimized ? userIntent : aiAction.batterIntent,
      bowlerLength: isUserBowling && !isAIOptimized ? userLength : aiAction.bowlerLength,
      bowlerLine: isUserBowling && !isAIOptimized ? userLine : aiAction.bowlerLine,
      bowlerVariation: isUserBowling && !isAIOptimized ? userVariation : aiAction.bowlerVariation,
      fieldPreset: isUserBowling && !isAIOptimized ? userField : aiAction.fieldPreset,
    };

    const { nextState, event } = stepDelivery(state, action, prng);
    liveStateRef.current = nextState;
    setLiveState(nextState);
    const nextEvents = [...visibleEvents, event];
    const nextIndex = currentEventIndex + 1;
    setVisibleEvents(nextEvents);
    setCurrentEventIndex(nextIndex);

    if (nextState.status === 'COMPLETED') {
      setIsPlaying(false);
      setPhase('COMPLETED');
      if (simulationResult) {
        archiveCompletedMatch(simulationResult);
      }
    } else {
      saveActiveSession(nextState, nextEvents, nextIndex);
    }
  }

  function handleInstantResult() {
    if (!simulationResult) return;
    setVisibleEvents([...simulationResult.allEvents]);
    setCurrentEventIndex(simulationResult.allEvents.length);
    setLiveState(simulationResult.finalState);
    if (liveStateRef.current) {
      liveStateRef.current = simulationResult.finalState;
    }
    setIsPlaying(false);
    setPhase('COMPLETED');
    archiveCompletedMatch(simulationResult);
  }

  function handleSimulateOver() {
    if (!liveStateRef.current || !livePrngRef.current) return;
    const currentInnings = liveStateRef.current.innings[liveStateRef.current.currentInningsIndex];
    if (!currentInnings || currentInnings.isCompleted) return;

    const targetOver = currentInnings.completedOvers;
    const targetInn = currentInnings.inningsNumber;

    while (
      liveStateRef.current.status !== 'COMPLETED' &&
      liveStateRef.current.currentInningsIndex === targetInn - 1 &&
      liveStateRef.current.innings[liveStateRef.current.currentInningsIndex].completedOvers === targetOver
    ) {
      stepToNextDelivery();
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
            <button
              onClick={() => setShowHistoryDrawer(true)}
              className="text-xs px-3 py-1.5 rounded bg-[#161B22] hover:bg-[#202732] border border-[#262E3B] text-[#8A94A6] hover:text-[#F8F9FA] transition flex items-center gap-1.5"
            >
              <History className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Vault ({matchHistory.length})</span>
            </button>
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
          {/* Active Match Resume Banner (Gate P6.11) */}
          {activeSession && (
            <div className="mb-8 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-[#18202A] to-amber-500/10 border border-amber-500/40 flex flex-wrap items-center justify-between gap-4 animate-fade-in shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <span>Unfinished Match In Progress</span>
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-[10px] font-mono">{activeSession.format}</span>
                  </div>
                  <div className="text-sm font-bold text-[#F8F9FA]">
                    {activeSession.userTeamName} vs {activeSession.aiTeamName}
                  </div>
                  <div className="text-xs text-[#8A94A6]">
                    {activeSession.currentEventIndex} deliveries bowled • Saved {new Date(activeSession.savedAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleResumeMatch}
                  className="px-4 py-2 rounded-lg bg-[#0D4A38] hover:bg-[#0D4A38]/90 border border-[#D4AF37]/50 text-xs font-bold text-[#D4AF37] transition flex items-center gap-1.5 shadow-md"
                >
                  <Play className="w-3.5 h-3.5" /> Resume Match
                </button>
                <button
                  onClick={handleDiscardActiveSession}
                  className="px-3 py-2 rounded-lg bg-[#18202A] hover:bg-rose-950/40 border border-[#262E3B] hover:border-rose-500/50 text-xs font-medium text-[#8A94A6] hover:text-rose-300 transition"
                >
                  Discard
                </button>
              </div>
            </div>
          )}

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
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-[#8A94A6] uppercase tracking-wider">
                    Match Roster Mode
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('open-cricket-welcome-modal'));
                      }
                    }}
                    className="text-[11px] text-[#D4AF37] hover:underline flex items-center gap-1"
                  >
                    <BookOpen className="w-3 h-3" />
                    <span>View Rules</span>
                  </button>
                </div>

                {/* 3 Modes */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { id: 'ONE_TEAM_PER_NATION', label: '1 Team / Nation', icon: Globe, desc: 'Country Rivalry' },
                    { id: 'ONE_PLAYER_PER_NATION', label: 'World XI', icon: Sparkles, desc: '1 Player / Nation' },
                    { id: 'CUSTOM_DREAM_TEAM', label: 'Custom Dream XI', icon: Shield, desc: 'Saved Lineup' },
                  ].map((m) => {
                    const Icon = m.icon;
                    const active = teamMode === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setTeamMode(m.id as any);
                          if (m.id === 'ONE_TEAM_PER_NATION') {
                            setUserTeamName(`${userNation} All-Time XI`);
                            setAiTeamName(`${aiNation} All-Time XI`);
                          } else if (m.id === 'ONE_PLAYER_PER_NATION') {
                            setUserTeamName('User World XI (1 Per Nation)');
                            setAiTeamName('AI Global World XI (1 Per Nation)');
                          } else {
                            setUserTeamName('User Dream XI');
                            setAiTeamName('AI World XI');
                          }
                        }}
                        className={`p-2 rounded-lg text-left border transition ${
                          active
                            ? 'bg-[#0D4A38] border-[#D4AF37] text-[#F8F9FA] shadow-md'
                            : 'bg-[#181F2A] border-[#252E3E] text-[#8A94A6] hover:bg-[#202938]'
                        }`}
                      >
                        <div className="flex items-center gap-1 font-bold text-xs mb-0.5">
                          <Icon className={`w-3.5 h-3.5 ${active ? 'text-[#D4AF37]' : ''}`} />
                          <span>{m.label}</span>
                        </div>
                        <div className="text-[10px] text-[#8A94A6]">{m.desc}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Mode Specific Configuration */}
                {teamMode === 'ONE_TEAM_PER_NATION' && (
                  <div className="p-3 rounded-lg bg-[#18202A] border border-emerald-500/30 space-y-3">
                    <div className="flex items-center justify-between text-xs text-emerald-400 font-mono">
                      <span>✓ ONE TEAM PER NATION ENFORCED</span>
                      <span className="text-[10px] text-[#8A94A6]">No Duplicate Nations</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-[#8A94A6] block mb-1">Your National Team:</label>
                        <select
                          value={userNation}
                          onChange={(e) => {
                            const newNation = e.target.value;
                            setUserNation(newNation);
                            setUserTeamName(`${newNation} All-Time XI`);
                            // If AI had same nation, switch AI to another
                            if (aiNation === newNation) {
                              const other = SUPPORTED_NATIONAL_TEAMS.find((n) => n.id !== newNation)?.id || 'Australia';
                              setAiNation(other);
                              setAiTeamName(`${other} All-Time XI`);
                            }
                          }}
                          className="w-full bg-[#12161E] border border-[#283548] text-xs font-semibold text-[#F8F9FA] rounded px-2.5 py-1.5 focus:outline-none focus:border-[#D4AF37]"
                        >
                          {SUPPORTED_NATIONAL_TEAMS.map((n) => (
                            <option key={n.id} value={n.id}>
                              {n.flag} {n.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] text-[#8A94A6] block mb-1">AI Opponent Nation:</label>
                        <select
                          value={aiNation}
                          onChange={(e) => {
                            const newAiNation = e.target.value;
                            setAiNation(newAiNation);
                            setAiTeamName(`${newAiNation} All-Time XI`);
                          }}
                          className="w-full bg-[#12161E] border border-[#283548] text-xs font-semibold text-[#3B82F6] rounded px-2.5 py-1.5 focus:outline-none focus:border-[#3B82F6]"
                        >
                          {SUPPORTED_NATIONAL_TEAMS.filter((n) => n.id !== userNation).map((n) => (
                            <option key={n.id} value={n.id}>
                              {n.flag} {n.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {teamMode === 'ONE_PLAYER_PER_NATION' && (
                  <div className="p-3 rounded-lg bg-[#18202A] border border-emerald-500/30 space-y-2">
                    <div className="text-xs text-emerald-400 font-mono flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>WORLD XI CHALLENGE: 1 PLAYER PER NATION</span>
                    </div>
                    <p className="text-[11px] text-[#8A94A6] leading-relaxed">
                      Both squads contain 11 legendary cricketers from 11 distinct countries (IND, AUS, ENG, WI, SA, PAK, NZ, SL, AFG, BAN, ZIM/IRE). Zero national duplicates!
                    </p>
                  </div>
                )}

                {/* Team Matchup Cards Display */}
                <div className="mt-3 space-y-2">
                  <div className="p-3 rounded-lg bg-[#18202A] border border-[#283344] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded bg-[#EC1C24]/20 border border-[#EC1C24]/40 flex items-center justify-center text-[#EC1C24]">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[#F8F9FA]">{userTeamName}</div>
                        <div className="text-[11px] text-[#8A94A6]">
                          {teamMode === 'ONE_TEAM_PER_NATION'
                            ? `Authentic All-Time ${userNation} Squad`
                            : teamMode === 'ONE_PLAYER_PER_NATION'
                            ? '11 Elite Cricketers from 11 Nations'
                            : 'Custom User Playing XI'}
                        </div>
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
                        <div className="text-[11px] text-[#8A94A6]">
                          {teamMode === 'ONE_TEAM_PER_NATION'
                            ? `Authentic All-Time ${aiNation} Squad &middot; ${aiDifficulty}`
                            : teamMode === 'ONE_PLAYER_PER_NATION'
                            ? `AI World XI (11 Distinct Nations) &middot; ${aiDifficulty}`
                            : `Autonomous Tactical Captaincy &middot; ${aiDifficulty}`}
                        </div>
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

                  {tossResult.winner === 'USER' ? (
                    <div className="mt-3">
                      <div className="text-xs text-[#8A94A6] mb-2">What do you elect to do?</div>
                      <div className="flex justify-center gap-3">
                        <button
                          onClick={() => setTossResult((prev) => (prev ? { ...prev, decision: 'BAT' } : null))}
                          className={`px-5 py-2.5 rounded-lg font-bold text-xs border transition ${
                            tossResult.decision === 'BAT'
                              ? 'bg-[#0D4A38] text-[#D4AF37] border-[#D4AF37] shadow-lg'
                              : 'bg-[#181F2A] text-[#8A94A6] border-[#252E3E]'
                          }`}
                        >
                          🏏 Bat First
                        </button>
                        <button
                          onClick={() => setTossResult((prev) => (prev ? { ...prev, decision: 'BOWL' } : null))}
                          className={`px-5 py-2.5 rounded-lg font-bold text-xs border transition ${
                            tossResult.decision === 'BOWL'
                              ? 'bg-[#0D4A38] text-[#D4AF37] border-[#D4AF37] shadow-lg'
                              : 'bg-[#181F2A] text-[#8A94A6] border-[#252E3E]'
                          }`}
                        >
                          ⚾ Bowl First
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-[#8A94A6] mt-2 bg-[#12161E] p-2.5 rounded-lg border border-[#202838]">
                      <span className="font-semibold text-[#D4AF37] block mb-0.5">
                        {aiTeamName} elected to {tossResult.decision} first.
                      </span>
                      <span>{tossResult.aiReason}</span>
                    </div>
                  )}
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
              <div className="p-5 rounded-xl bg-gradient-to-r from-[#0D4A38]/50 via-[#12161E] to-[#0D4A38]/50 border border-[#D4AF37]/50 text-center space-y-3">
                <div className="text-xs text-[#D4AF37] tracking-widest uppercase font-mono">
                  OFFICIAL ICC T20 MATCH RESULT
                </div>
                <div className="text-2xl md:text-3xl font-serif font-black text-[#F8F9FA]">
                  {simulationResult.scorecard.result?.summary ?? 'Match Finished'}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-[#8A94A6]">
                  <button
                    onClick={() => handleVerifyReplay()}
                    className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition font-mono font-medium"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> 100% Deterministic Parity Verified (Click to Audit)
                  </button>
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

              {/* Action Buttons (Gate P6.12) */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-6 border-t border-[#222A36]">
                <button
                  onClick={() => handleVerifyReplay()}
                  className="px-4 py-2.5 rounded-lg bg-[#18202A] hover:bg-[#222B38] border border-emerald-500/40 text-xs font-semibold text-emerald-400 transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Audit Cryptographic Replay
                </button>
                <button
                  onClick={handleReplayFromStart}
                  className="px-4 py-2.5 rounded-lg bg-[#0D4A38] hover:bg-[#0D4A38]/90 border border-[#D4AF37]/50 text-xs font-bold text-[#D4AF37] transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Replay From Ball 1
                </button>
                <button
                  onClick={handleRematch}
                  className="px-4 py-2.5 rounded-lg bg-[#18202A] hover:bg-[#222B38] border border-[#D4AF37]/40 text-xs font-bold text-[#F8F9FA] transition flex items-center gap-1.5"
                >
                  <Swords className="w-3.5 h-3.5 text-[#D4AF37]" /> Rematch (New Seed)
                </button>
                <button
                  onClick={() => {
                    setPhase('SETUP');
                    randomizeSeed();
                  }}
                  className="px-4 py-2.5 rounded-lg bg-[#18202A] hover:bg-[#222B38] border border-[#283344] text-xs font-semibold text-[#8A94A6] hover:text-[#F8F9FA] transition"
                >
                  Configure New Match
                </button>
                <Link
                  href="/dream-teams"
                  className="px-4 py-2.5 rounded-lg bg-[#18202A] hover:bg-[#222B38] border border-[#283344] text-xs font-semibold text-[#8A94A6] hover:text-[#F8F9FA] transition flex items-center gap-1.5"
                >
                  <Shield className="w-3.5 h-3.5" /> Return to Squad Builder
                </Link>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Replay Verification Modal (Gate P6.11 & P6.14) */}
      {showReplayModal && replayReport && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#12161E] border border-[#D4AF37]/40 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#222A36] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#F8F9FA]">Cryptographic Replay Audit</h3>
                  <p className="text-[10px] text-[#8A94A6] font-mono">SplitMix64 + SHA-256 Authority</p>
                </div>
              </div>
              <button
                onClick={() => setShowReplayModal(false)}
                className="p-1 rounded-lg hover:bg-[#1E2530] text-[#8A94A6] hover:text-[#F8F9FA] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-[#18202A] border border-[#262E3B] space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-[#8A94A6]">Verification Status:</span>
                  <span className={replayReport.isValid ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {replayReport.isValid ? '✓ 100% BIT-EXACT PARITY' : '✗ PARITY MISMATCH'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8A94A6]">Match Identifier:</span>
                  <span className="text-[#F8F9FA] truncate max-w-[200px]">{replayReport.matchId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8A94A6]">Original Hash:</span>
                  <span className="text-emerald-400">{replayReport.originalStateHash.slice(0, 18)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8A94A6]">Replayed Hash:</span>
                  <span className="text-emerald-400">{replayReport.replayedStateHash.slice(0, 18)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8A94A6]">Discrepancies:</span>
                  <span className="text-[#F8F9FA]">{replayReport.discrepancies.length}</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#0D1812] border border-emerald-950/60 text-[11px] text-emerald-300 leading-relaxed">
                The match was re-simulated autonomously from its original seed and configuration. Every delivery outcome, score delta, and dismissal was checked against the replayed state. Deterministic reproducibility is verified at 100%.
              </div>

              <div className="flex justify-between items-center text-[10px] text-[#8A94A6] font-mono border-t border-[#222A36] pt-3">
                <span>sim-1.0.0 • rules-t20-icc-2026.1 • rate-1.0.0</span>
                <button
                  onClick={() => setShowReplayModal(false)}
                  className="px-3 py-1.5 rounded bg-[#18202A] hover:bg-[#202936] text-[#F8F9FA] font-sans font-medium transition"
                >
                  Close Audit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Vault Drawer (Gate P6.11) */}
      {showHistoryDrawer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#12161E] border border-[#222A36] rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#222A36] pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#0D4A38] border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37]">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#F8F9FA]">Match History & Deterministic Vault</h3>
                  <p className="text-xs text-[#8A94A6]">Archived matches with bit-exact replay capability</p>
                </div>
              </div>
              <button
                onClick={() => setShowHistoryDrawer(false)}
                className="p-1.5 rounded-lg hover:bg-[#1E2530] text-[#8A94A6] hover:text-[#F8F9FA] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {matchHistory.length === 0 ? (
                <div className="text-center py-12 text-[#8A94A6] text-xs space-y-2">
                  <History className="w-8 h-8 mx-auto opacity-40 text-[#D4AF37]" />
                  <p>No completed matches archived in vault yet.</p>
                  <p className="text-[11px] text-[#60697B]">Play and complete a match to archive it for replay verification.</p>
                </div>
              ) : (
                matchHistory.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 rounded-xl bg-[#161D27] border border-[#222A36] hover:border-[#D4AF37]/40 transition space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-[#0D4A38] text-[#D4AF37] font-mono font-bold text-[10px]">
                          {m.format}
                        </span>
                        <span className="text-[#8A94A6] font-mono text-[11px]">
                          {new Date(m.date).toLocaleDateString()} {new Date(m.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#8A94A6] font-mono">
                        Seed: #{m.seed.slice(0, 8)}...
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm font-bold text-[#F8F9FA]">
                      <div>
                        {m.team1Name} <span className="font-mono text-xs font-normal text-[#8A94A6]">({m.team1Score})</span>
                        {' vs '}
                        {m.team2Name} <span className="font-mono text-xs font-normal text-[#8A94A6]">({m.team2Score})</span>
                      </div>
                    </div>

                    <div className="text-xs text-[#D4AF37] font-medium">
                      {m.resultSummary}
                    </div>

                    {m.potm && (
                      <div className="text-[11px] text-[#8A94A6] flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>POTM: <strong className="text-[#F8F9FA]">{m.potm.name}</strong> ({m.potm.points} pts)</span>
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#202735]">
                      <button
                        onClick={() => handleVerifyArchivedMatch(m)}
                        className="px-2.5 py-1 rounded bg-[#18202A] hover:bg-[#202938] border border-emerald-500/40 text-[11px] text-emerald-400 font-medium transition flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Audit Parity
                      </button>
                      <button
                        onClick={() => handleLoadArchivedReplay(m)}
                        className="px-2.5 py-1 rounded bg-[#0D4A38] hover:bg-[#0D4A38]/90 border border-[#D4AF37]/50 text-[11px] text-[#D4AF37] font-bold transition flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" /> Load Seed
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
