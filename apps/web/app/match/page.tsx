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
  getRulesetForFormat,
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
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
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

    // Ping API server to establish server authority status
    fetch(`${apiUrl}/stadiums`)
      .then((r) => setServerOnline(r.ok))
      .catch(() => setServerOnline(false));
  }, [apiUrl]);

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
        rulesetVersion: getRulesetForFormat(activeSession.format).rulesetVersion,
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
        rulesetVersion: getRulesetForFormat(record.format).rulesetVersion,
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
        rulesetVersion: getRulesetForFormat(format).rulesetVersion,
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

  function handleSimulateInnings() {
    if (!liveStateRef.current || !livePrngRef.current) return;
    const currentInnIdx = liveStateRef.current.currentInningsIndex;
    while (
      liveStateRef.current.status !== 'COMPLETED' &&
      liveStateRef.current.currentInningsIndex === currentInnIdx
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

  // Dynamic format & target metrics
  const activeInningsNumber = currentEvent?.inningsNumber ?? 1;
  const isTestFormat = format === 'TEST_RED_BALL' || format === 'TEST_PINK_BALL';
  const formatMaxOvers = format === 'T10' ? 10 : format === 'ODI' ? 50 : format === 'T20' ? 20 : 9999;
  const totalInningsBalls = formatMaxOvers * 6;
  const activeInnings = liveState?.innings[activeInningsNumber - 1];
  const targetRuns = activeInnings?.targetRuns;
  const runsRemaining = targetRuns !== undefined ? Math.max(0, targetRuns - currentRuns) : 0;
  const ballsRemaining = !isTestFormat ? Math.max(0, totalInningsBalls - legalBalls) : 0;
  const reqRunRate =
    ballsRemaining > 0 && targetRuns !== undefined
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

  function getPlayerPortrait(id?: string, index: number = 0): string {
    const portraitMap: Record<string, string> = {
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
      'p-sachin-tendulkar': '/assets/stitch/asset-028.png',
      'p-wasim-akram': '/assets/stitch/asset-029.png',
      'p-brian-lara': '/assets/stitch/asset-030.png',
      'p-glenn-mcgrath': '/assets/stitch/asset-031.png',
      'p-jacques-kallis': '/assets/stitch/asset-032.png',
      'p-muttiah-muralitharan': '/assets/stitch/asset-033.png',
    };
    if (id && portraitMap[id]) return portraitMap[id];
    const assetNums = [
      '004', '005', '006', '007', '008', '009', '010', '011', '012', '013', '014',
      '016', '017', '018', '019', '020', '021', '022', '023', '024', '025', '026',
      '027', '028', '029', '030', '031', '032', '033', '034', '035', '036', '037', '038'
    ];
    const num = assetNums[Math.abs(index) % assetNums.length];
    return `/assets/stitch/asset-${num}.png`;
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

  // Active striker & bowler stats
  const strikerId = activeInnings?.strikerPlayerId;
  const nonStrikerId = activeInnings?.nonStrikerPlayerId;
  const bowlerId = activeInnings?.currentBowlerPlayerId;

  const strikerStats = strikerId ? activeInnings?.batters.get(strikerId) : undefined;
  const nonStrikerStats = nonStrikerId ? activeInnings?.batters.get(nonStrikerId) : undefined;
  const bowlerStats = bowlerId ? activeInnings?.bowlers.get(bowlerId) : undefined;
  const strikerName = getPlayerDisplayName(strikerId || '');
  const nonStrikerName = getPlayerDisplayName(nonStrikerId || '');
  const bowlerName = getPlayerDisplayName(bowlerId || '');

  // Calculate live win probability
  const liveWinProb = targetRuns !== undefined
    ? Math.min(99, Math.max(1, Math.round(100 - (runsRemaining / Math.max(1, ballsRemaining)) * 14)))
    : 50;

  // Format delivery badge
  function getBallBadge(ev: DeliveryEvent) {
    if (ev.outcome === 'SIX') return { label: '6', class: 'bg-tertiary-container text-on-tertiary font-bold' };
    if (ev.outcome === 'FOUR') return { label: '4', class: 'bg-primary-container text-on-primary-container font-bold' };
    if (ev.outcome === 'WICKET') return { label: 'W', class: 'bg-wicket-red-container text-wicket-red font-bold' };
    if (ev.outcome === 'DOT') return { label: '•', class: 'bg-surface-container text-text-subdued' };
    return { label: String(ev.scorecardDelta.totalRuns), class: 'bg-surface-elevated text-text-chalk' };
  }

  return (
    <div className="w-full min-h-screen bg-surface flex flex-col select-none">
      {/* Top Breadcrumb & Status Overline */}
      <div className="w-full max-w-[1440px] mx-auto px-4 md:px-margin-desktop pt-4 pb-2 flex flex-wrap items-center justify-between gap-space-sm border-b border-border-hairline">
        <div className="flex items-center gap-space-sm">
          <Link href="/" className="font-label-caps text-label-caps text-text-subdued hover:text-text-chalk transition-colors">
            PAVILION
          </Link>
          <span className="text-text-subdued">/</span>
          <span className="font-label-caps text-label-caps text-primary uppercase tracking-widest font-bold">
            MATCH ARENA // {phase}
          </span>
          <span className="text-text-subdued">•</span>
          <span className="font-label-caps text-[10px] text-tertiary uppercase">
            {format.replace(/_/g, ' ')}
          </span>
        </div>

        <div className="flex items-center gap-space-sm">
          <button
            onClick={() => setShowHistoryDrawer(true)}
            className="bg-surface-elevated hover:bg-surface-bright text-text-slate hover:text-text-chalk px-3 py-1 rounded font-label-caps text-label-caps uppercase flex items-center gap-1 transition-all border border-border-hairline cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px] text-tertiary">history</span>
            <span>VAULT ({matchHistory.length})</span>
          </button>
          <Link
            href="/dream-teams"
            className="bg-surface-elevated hover:bg-surface-bright text-text-slate hover:text-text-chalk px-3 py-1 rounded font-label-caps text-label-caps uppercase flex items-center gap-1 transition-all border border-border-hairline"
          >
            <span className="material-symbols-outlined text-[16px]">groups</span>
            <span>SQUAD BUILDER</span>
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PHASE 1: MATCH SETUP (Stitch Screen 3: Match Setup / Format Selector)   */}
      {/* ========================================================================= */}
      {phase === 'SETUP' && (
        <main className="w-full max-w-[1440px] mx-auto px-4 md:px-margin-desktop py-space-md md:py-space-lg flex flex-col gap-space-lg flex-1">
          {/* Header Sub-bar & Tactical Step Progression */}
          <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pb-space-sm">
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center gap-space-xs">
                <span className="font-label-caps text-label-caps text-primary tracking-widest uppercase">
                  DREAM XI CHAMPIONSHIP
                </span>
                <span className="text-text-subdued font-label-caps text-label-caps">/</span>
                <span className="font-label-caps text-label-caps text-text-slate tracking-widest uppercase">
                  TACTICAL CONSOLE
                </span>
              </div>
              <div className="flex items-baseline gap-space-sm">
                <h1 className="font-headline-lg text-headline-lg text-text-chalk tracking-tight uppercase">
                  MATCH SETUP
                </h1>
                <span className="font-label-caps text-label-caps text-secondary px-space-xs py-0.5 bg-surface-container rounded uppercase">
                  PITCH CONFIG V4.2
                </span>
              </div>
            </div>

            {/* Step Progression Matrix */}
            <div className="flex items-center gap-space-xs sm:gap-space-sm overflow-x-auto pb-space-xs lg:pb-0">
              <div className="flex items-center gap-space-xs px-space-sm py-1.5 bg-surface-card rounded-lg shadow-sm border border-border-hairline">
                <span className="w-5 h-5 rounded-full bg-primary text-on-primary font-label-caps text-[11px] flex items-center justify-center font-bold">1</span>
                <span className="font-label-caps text-label-caps text-text-chalk uppercase">Format</span>
              </div>
              <span className="w-4 h-0.5 bg-surface-bright rounded" />
              <div className="flex items-center gap-space-xs px-space-sm py-1.5 bg-surface-elevated rounded-lg shadow-sm border border-border-hairline">
                <span className="w-5 h-5 rounded-full bg-primary-container text-on-primary font-label-caps text-[11px] flex items-center justify-center font-bold shadow-[0_0_8px_rgba(76,175,80,0.5)]">2</span>
                <span className="font-label-caps text-label-caps text-text-chalk uppercase">Opponent</span>
              </div>
              <span className="w-4 h-0.5 bg-surface-bright rounded" />
              <div className="flex items-center gap-space-xs px-space-sm py-1.5 bg-surface-card rounded-lg shadow-sm border border-border-hairline">
                <span className="w-5 h-5 rounded-full bg-surface-variant text-text-slate font-label-caps text-[11px] flex items-center justify-center font-bold">3</span>
                <span className="font-label-caps text-label-caps text-text-slate uppercase">Conditions</span>
              </div>
              <span className="w-4 h-0.5 bg-surface-bright rounded" />
              <div className="flex items-center gap-space-xs px-space-sm py-1.5 bg-surface-card rounded-lg shadow-sm border border-border-hairline">
                <span className="w-5 h-5 rounded-full bg-surface-variant text-text-slate font-label-caps text-[11px] flex items-center justify-center font-bold">4</span>
                <span className="font-label-caps text-label-caps text-text-slate uppercase">Review</span>
              </div>
            </div>
          </section>

          {/* Active Match Resume Banner */}
          {activeSession && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-surface-card via-surface-elevated to-surface-card border border-warning-amber/40 flex flex-wrap items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning-amber/20 border border-warning-amber/50 flex items-center justify-center text-warning-amber">
                  <span className="material-symbols-outlined text-[20px]">rotate_left</span>
                </div>
                <div>
                  <div className="text-xs font-bold text-warning-amber uppercase tracking-wider flex items-center gap-2">
                    <span>UNFINISHED MATCH IN PROGRESS</span>
                    <span className="px-1.5 py-0.2 rounded bg-warning-amber/20 text-[10px] font-mono">{activeSession.format}</span>
                  </div>
                  <div className="text-sm font-bold text-text-chalk">
                    {activeSession.userTeamName} vs {activeSession.aiTeamName}
                  </div>
                  <div className="text-xs text-text-slate">
                    {activeSession.currentEventIndex} deliveries bowled • Saved {new Date(activeSession.savedAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleResumeMatch}
                  className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">play_arrow</span> Resume Match
                </button>
                <button
                  onClick={handleDiscardActiveSession}
                  className="px-3 py-2 rounded-lg bg-surface-recessed hover:bg-wicket-red-container text-text-slate hover:text-wicket-red text-xs font-medium transition cursor-pointer"
                  type="button"
                >
                  Discard
                </button>
              </div>
            </div>
          )}

          {/* Step 1: Format Selection Matrix (5 Tactile Cards) */}
          <section className="flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="w-1.5 h-4 bg-primary rounded-full" />
                <span className="font-label-caps text-label-caps uppercase text-text-subdued tracking-wider">
                  STEP 01 // MATCH FORMAT SPECIFICATION
                </span>
              </div>
              <span className="font-label-caps text-label-caps text-text-slate uppercase">5 TIERS SANCTIONED</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-space-sm">
              {/* T10 */}
              <div
                onClick={() => setFormat('T10')}
                className={`cursor-pointer flex flex-col justify-between p-space-md rounded-xl transition-all border ${
                  format === 'T10'
                    ? 'bg-surface-elevated ring-2 ring-primary border-primary shadow-[0_0_24px_rgba(120,220,119,0.2)]'
                    : 'bg-surface-card hover:bg-surface-elevated border-border-hairline shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="px-space-xs py-0.5 rounded font-label-caps text-label-caps text-amber-300 bg-amber-950/60 uppercase">
                    T10 SLAM
                  </span>
                  <span className="material-symbols-outlined text-[18px] text-text-subdued">bolt</span>
                </div>
                <div className="py-space-md">
                  <h2 className="font-headline-md text-title-md text-text-chalk tracking-tight">Super Slam</h2>
                  <p className="font-body-sm text-body-sm text-text-slate mt-1 line-clamp-2">
                    10 overs a side, 90 mins blitz. High risk powerhitting with white seam ball.
                  </p>
                </div>
                <div className="flex items-center justify-between pt-space-xs bg-surface-recessed px-space-xs py-1 rounded">
                  <span className="font-label-caps text-[10px] text-text-subdued uppercase">BALL: WHITE</span>
                  <span className="font-scoreboard-md text-[13px] text-text-chalk">60 BALLS</span>
                </div>
              </div>

              {/* T20 */}
              <div
                onClick={() => setFormat('T20')}
                className={`cursor-pointer flex flex-col justify-between p-space-md rounded-xl transition-all border ${
                  format === 'T20'
                    ? 'bg-surface-elevated ring-2 ring-primary border-primary shadow-[0_0_24px_rgba(120,220,119,0.2)]'
                    : 'bg-surface-card hover:bg-surface-elevated border-border-hairline shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="px-space-xs py-0.5 rounded font-label-caps text-label-caps text-on-primary bg-primary font-bold uppercase">
                    T20 WORLD CUP
                  </span>
                  <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
                </div>
                <div className="py-space-md">
                  <h2 className="font-headline-md text-title-md text-text-chalk tracking-tight">World Cup T20</h2>
                  <p className="font-body-sm text-body-sm text-text-slate mt-1 line-clamp-2">
                    20 overs, 6 over powerplay, stadium floodlights with strategic DRS reviews.
                  </p>
                </div>
                <div className="flex items-center justify-between pt-space-xs bg-surface-recessed px-space-xs py-1 rounded">
                  <span className="font-label-caps text-[10px] text-secondary font-bold uppercase">ACTIVE REGIME</span>
                  <span className="font-scoreboard-md text-[13px] text-primary">120 BALLS</span>
                </div>
              </div>

              {/* ODI */}
              <div
                onClick={() => setFormat('ODI')}
                className={`cursor-pointer flex flex-col justify-between p-space-md rounded-xl transition-all border ${
                  format === 'ODI'
                    ? 'bg-surface-elevated ring-2 ring-primary border-primary shadow-[0_0_24px_rgba(120,220,119,0.2)]'
                    : 'bg-surface-card hover:bg-surface-elevated border-border-hairline shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="px-space-xs py-0.5 rounded font-label-caps text-label-caps text-telemetry-blue bg-sky-950/60 uppercase">
                    ODI TROPHY
                  </span>
                  <span className="material-symbols-outlined text-[18px] text-text-subdued">timer</span>
                </div>
                <div className="py-space-md">
                  <h2 className="font-headline-md text-title-md text-text-chalk tracking-tight">Championship</h2>
                  <p className="font-body-sm text-body-sm text-text-slate mt-1 line-clamp-2">
                    50 Overs, 3 Powerplays (1-10, 11-40, 41-50). Maximum 10 overs per bowler.
                  </p>
                </div>
                <div className="flex items-center justify-between pt-space-xs bg-surface-recessed px-space-xs py-1 rounded">
                  <span className="font-label-caps text-[10px] text-text-subdued uppercase">BALL: DUAL WHITE</span>
                  <span className="font-scoreboard-md text-[13px] text-text-chalk">300 BALLS</span>
                </div>
              </div>

              {/* TEST RED */}
              <div
                onClick={() => setFormat('TEST_RED_BALL')}
                className={`cursor-pointer flex flex-col justify-between p-space-md rounded-xl transition-all border ${
                  format === 'TEST_RED_BALL'
                    ? 'bg-surface-elevated ring-2 ring-primary border-primary shadow-[0_0_24px_rgba(120,220,119,0.2)]'
                    : 'bg-surface-card hover:bg-surface-elevated border-border-hairline shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="px-space-xs py-0.5 rounded font-label-caps text-label-caps text-wicket-red bg-wicket-red-container uppercase">
                    TEST RED
                  </span>
                  <span className="material-symbols-outlined text-[18px] text-text-subdued">shield</span>
                </div>
                <div className="py-space-md">
                  <h2 className="font-headline-md text-title-md text-text-chalk tracking-tight">The Crucible</h2>
                  <p className="font-body-sm text-body-sm text-text-slate mt-1 line-clamp-2">
                    5 Days, 2 Innings each, 90 overs/day. Dynamic turf cracks, wear & reverse seam.
                  </p>
                </div>
                <div className="flex items-center justify-between pt-space-xs bg-surface-recessed px-space-xs py-1 rounded">
                  <span className="font-label-caps text-[10px] text-text-subdued uppercase">BALL: KOOKABURRA</span>
                  <span className="font-scoreboard-md text-[13px] text-text-chalk">5 DAYS</span>
                </div>
              </div>

              {/* TEST PINK */}
              <div
                onClick={() => setFormat('TEST_PINK_BALL')}
                className={`cursor-pointer flex flex-col justify-between p-space-md rounded-xl transition-all border ${
                  format === 'TEST_PINK_BALL'
                    ? 'bg-surface-elevated ring-2 ring-primary border-primary shadow-[0_0_24px_rgba(120,220,119,0.2)]'
                    : 'bg-surface-card hover:bg-surface-elevated border-border-hairline shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="px-space-xs py-0.5 rounded font-label-caps text-label-caps text-test-pink bg-pink-950/40 uppercase">
                    DAY / NIGHT
                  </span>
                  <span className="material-symbols-outlined text-[18px] text-text-subdued">wb_twilight</span>
                </div>
                <div className="py-space-md">
                  <h2 className="font-headline-md text-title-md text-text-chalk tracking-tight">Pink Ball Test</h2>
                  <p className="font-body-sm text-body-sm text-text-slate mt-1 line-clamp-2">
                    Under lights with prominent twilight seam movement and early session swing.
                  </p>
                </div>
                <div className="flex items-center justify-between pt-space-xs bg-surface-recessed px-space-xs py-1 rounded">
                  <span className="font-label-caps text-[10px] text-text-subdued uppercase">BALL: PINK LACQUER</span>
                  <span className="font-scoreboard-md text-[13px] text-text-chalk">D/N 5D</span>
                </div>
              </div>
            </div>
          </section>

          {/* Step 2: Roster Mode & National Rivalry Selection */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
            <div className="lg:col-span-6 bg-surface-card rounded-xl p-space-md shadow-lg border border-border-hairline flex flex-col gap-space-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="w-1.5 h-4 bg-secondary rounded-full" />
                  <span className="font-label-caps text-label-caps uppercase text-text-subdued tracking-wider">
                    STEP 02 // SQUAD & RIVALRY
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('open-cricket-welcome-modal'));
                    }
                  }}
                  className="text-[11px] text-tertiary hover:underline flex items-center gap-1 font-label-caps"
                >
                  <span className="material-symbols-outlined text-[14px]">menu_book</span>
                  <span>VIEW RULES</span>
                </button>
              </div>

              {/* 3 Roster Modes */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'ONE_TEAM_PER_NATION', label: '1 Team / Nation', desc: 'Authentic Rivalry', icon: 'flag' },
                  { id: 'ONE_PLAYER_PER_NATION', label: 'World XI', desc: '1 Player / Nation', icon: 'public' },
                  { id: 'CUSTOM_DREAM_TEAM', label: 'Custom Dream XI', desc: 'Saved Lineup', icon: 'shield' },
                ].map((m) => {
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
                      className={`p-2.5 rounded-lg text-left border transition-all cursor-pointer ${
                        active
                          ? 'bg-surface-elevated border-primary text-text-chalk shadow-md'
                          : 'bg-surface-recessed border-border-hairline text-text-slate hover:bg-surface-elevated'
                      }`}
                    >
                      <div className="flex items-center gap-1 font-bold text-xs mb-0.5">
                        <span className={`material-symbols-outlined text-[16px] ${active ? 'text-primary' : ''}`}>
                          {m.icon}
                        </span>
                        <span>{m.label}</span>
                      </div>
                      <div className="text-[10px] text-text-subdued">{m.desc}</div>
                    </button>
                  );
                })}
              </div>

              {/* National Selectors */}
              {teamMode === 'ONE_TEAM_PER_NATION' && (
                <div className="p-3 rounded-lg bg-surface-recessed border border-border-hairline space-y-3 mt-1">
                  <div className="flex items-center justify-between text-xs text-primary font-label-caps">
                    <span>✓ ONE TEAM PER NATION ENFORCED</span>
                    <span className="text-[10px] text-text-subdued">No Duplicate Nations</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-text-subdued block mb-1 font-label-caps uppercase">
                        YOUR NATIONAL TEAM:
                      </label>
                      <select
                        value={userNation}
                        onChange={(e) => {
                          const newNation = e.target.value;
                          setUserNation(newNation);
                          setUserTeamName(`${newNation} All-Time XI`);
                          if (newNation === aiNation) {
                            const available = SUPPORTED_NATIONAL_TEAMS.find((t) => t.id !== newNation);
                            if (available) {
                              setAiNation(available.id);
                              setAiTeamName(`${available.id} All-Time XI`);
                            }
                          }
                        }}
                        className="w-full bg-surface-elevated border border-border-hairline text-text-chalk p-2 rounded text-body-sm focus:outline-none cursor-pointer"
                      >
                        {SUPPORTED_NATIONAL_TEAMS.map((t) => (
                          <option key={t.id} value={t.id} disabled={t.id === aiNation}>
                            {t.flag} {t.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-text-subdued block mb-1 font-label-caps uppercase">
                        AI OPPONENT TEAM:
                      </label>
                      <select
                        value={aiNation}
                        onChange={(e) => {
                          const newNation = e.target.value;
                          setAiNation(newNation);
                          setAiTeamName(`${newNation} All-Time XI`);
                        }}
                        className="w-full bg-surface-elevated border border-border-hairline text-text-chalk p-2 rounded text-body-sm focus:outline-none cursor-pointer"
                      >
                        {SUPPORTED_NATIONAL_TEAMS.map((t) => (
                          <option key={t.id} value={t.id} disabled={t.id === userNation}>
                            {t.flag} {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Stadium & Atmospheric Conditions Deck */}
            <div className="lg:col-span-6 bg-surface-card rounded-xl p-space-md shadow-lg border border-border-hairline flex flex-col gap-space-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="w-1.5 h-4 bg-tertiary rounded-full" />
                  <span className="font-label-caps text-label-caps uppercase text-text-subdued tracking-wider">
                    STEP 03 // CONDITIONS & VENUE
                  </span>
                </div>
                <span className="font-label-caps text-label-caps text-tertiary font-bold uppercase">
                  {stadium.name}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-text-subdued block mb-1 font-label-caps uppercase">VENUE:</label>
                  <select
                    value={selectedStadiumId}
                    onChange={(e) => setSelectedStadiumId(e.target.value)}
                    className="w-full bg-surface-recessed border border-border-hairline text-text-chalk p-2 rounded text-body-sm focus:outline-none cursor-pointer"
                  >
                    {VERIFIED_STADIUMS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.country})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-text-subdued block mb-1 font-label-caps uppercase">PITCH TYPE:</label>
                  <select
                    value={selectedPitch}
                    onChange={(e) => setSelectedPitch(e.target.value as any)}
                    className="w-full bg-surface-recessed border border-border-hairline text-text-chalk p-2 rounded text-body-sm focus:outline-none cursor-pointer"
                  >
                    <option value="HARD">Hard (True Bounce & Carry)</option>
                    <option value="FLAT">Flat (Batting Paradise)</option>
                    <option value="TURNING">Turning (Sharp Spin & Grip)</option>
                    <option value="GREEN">Green (Seam & Lateral Move)</option>
                    <option value="DUSTY">Dusty (Low Bounce & Crumble)</option>
                  </select>
                </div>
              </div>

              {/* Sliders for Dew & Atmospheric */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-surface-recessed p-2.5 rounded-lg border border-border-hairline">
                  <div className="flex justify-between text-label-caps font-label-caps mb-1">
                    <span className="text-text-subdued">DEW FACTOR</span>
                    <span className="text-telemetry-blue font-bold">{Math.round(dewFactor * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={dewFactor}
                    onChange={(e) => setDewFactor(parseFloat(e.target.value))}
                    className="w-full accent-primary cursor-pointer"
                  />
                </div>

                <div className="bg-surface-recessed p-2.5 rounded-lg border border-border-hairline">
                  <div className="flex justify-between text-label-caps font-label-caps mb-1">
                    <span className="text-text-subdued">CLOUD COVER</span>
                    <span className="text-warning-amber font-bold">{Math.round(cloudCover * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={cloudCover}
                    onChange={(e) => setCloudCover(parseFloat(e.target.value))}
                    className="w-full accent-primary cursor-pointer"
                  />
                </div>
              </div>

              {/* PRNG Seed & AI Difficulty */}
              <div className="flex items-center justify-between gap-3 pt-1 border-t border-border-hairline">
                <div className="flex items-center gap-1.5 flex-1">
                  <span className="font-label-caps text-[10px] text-text-subdued uppercase">SEED:</span>
                  <input
                    type="text"
                    value={seedInput}
                    onChange={(e) => setSeedInput(e.target.value)}
                    className="w-24 bg-surface-recessed border border-border-hairline px-2 py-1 rounded text-body-sm font-scoreboard-md text-text-chalk focus:outline-none"
                  />
                  <button
                    onClick={randomizeSeed}
                    className="p-1 rounded bg-surface-recessed hover:bg-surface-elevated text-text-subdued hover:text-text-chalk"
                    title="Randomize Seed"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">shuffle</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-label-caps text-[10px] text-text-subdued uppercase">AI:</span>
                  {(['EASY', 'MEDIUM', 'HARD'] as AIDifficulty[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setAiDifficulty(d)}
                      className={`px-2 py-0.5 rounded font-label-caps text-[10px] uppercase transition-all ${
                        aiDifficulty === d
                          ? 'bg-tertiary text-on-tertiary font-bold'
                          : 'bg-surface-recessed text-text-slate hover:text-text-chalk'
                      }`}
                      type="button"
                    >
                      {d[0]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Big Action CTA Dock: Proceed to Coin Toss */}
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => setPhase('TOSS')}
              className="w-full py-4 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-headline-md text-headline-md tracking-tight uppercase flex items-center justify-center gap-2 shadow-[0_4px_24px_rgba(120,220,119,0.35)] hover:scale-[1.01] transition-all cursor-pointer font-extrabold"
              type="button"
            >
              <span className="material-symbols-outlined text-[24px]">monetization_on</span>
              <span>ENTER OFFICIAL TOSS CEREMONY →</span>
            </button>
          </div>
        </main>
      )}

      {/* ========================================================================= */}
      {/* PHASE 2: COIN TOSS CEREMONY (Stitch Screen 4: Toss Ceremony)              */}
      {/* ========================================================================= */}
      {phase === 'TOSS' && (
        <main className="w-full max-w-[1440px] mx-auto px-4 md:px-margin-desktop py-space-md flex flex-col gap-space-lg flex-1">
          {/* Top Match Header Ribbon */}
          <header className="w-full bg-surface-card rounded-xl p-space-md shadow-xl flex flex-col md:flex-row items-center justify-between gap-space-md border border-border-hairline">
            <div className="flex items-center gap-space-md min-w-0">
              <div className="flex flex-col items-center justify-center bg-surface-recessed px-space-md py-space-xs rounded-lg shadow-sm border border-border-hairline">
                <span className="font-label-caps text-label-caps text-tertiary tracking-widest uppercase">MATCH FIXTURE</span>
                <span className="font-headline-md text-title-md text-text-chalk">{format.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-space-xs text-text-subdued font-label-caps text-label-caps uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-wicket-red animate-ping" />
                  <span className="text-text-chalk font-body-bold">LIVE TELECAST</span>
                  <span className="text-text-subdued">•</span>
                  <span>SUPREMACY CHAMPIONSHIP 2025</span>
                </div>
                <div className="font-headline-md text-headline-md text-text-chalk tracking-tight truncate uppercase">
                  {stadium.name} <span className="text-primary font-scoreboard-md">•</span> {stadium.country}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-space-sm">
              <div className="flex items-center gap-space-xs bg-surface-container px-space-sm py-space-xs rounded-full border border-border-hairline">
                <span className="material-symbols-outlined text-[16px] text-tertiary">wb_twilight</span>
                <span className="font-label-caps text-label-caps text-text-chalk uppercase">DUSK / FLOODLIGHTS ON</span>
              </div>
              <div className="flex items-center gap-space-xs bg-surface-elevated px-space-sm py-space-xs rounded-full shadow-sm border border-primary/40">
                <span className="material-symbols-outlined text-[16px] text-primary">sports_cricket</span>
                <span className="font-label-caps text-label-caps text-primary tracking-wider uppercase font-extrabold">
                  {selectedPitch} PITCH • TRUE BOUNCE
                </span>
              </div>
            </div>
          </header>

          {/* Central Broadcast Toss Arena (3-Column Split) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-stretch">
            {/* LEFT: HOME CAPTAIN */}
            <div className="lg:col-span-3 flex flex-col justify-between bg-surface-card rounded-xl p-space-md shadow-xl border border-border-hairline">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="px-space-xs py-0.5 rounded-full bg-surface-elevated text-secondary font-label-caps text-[10px] tracking-wider uppercase">
                    USER SQUAD
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-surface-recessed px-space-xs py-0.5 rounded-md border border-border-hairline">
                  <span className="font-label-caps text-[10px] text-text-subdued">OVR</span>
                  <span className="font-scoreboard-md text-scoreboard-md text-tertiary">96</span>
                </div>
              </div>

              <div className="relative my-space-md flex flex-col items-center">
                <div className="relative w-44 h-52 rounded-xl overflow-hidden shadow-2xl bg-surface-container border border-border-hairline">
                  <img
                    className="w-full h-full object-cover"
                    alt={userTeamName}
                    src="/assets/stitch/asset-004.png"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-card via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-tertiary text-on-tertiary px-space-xs py-0.5 rounded font-label-caps text-label-caps font-black shadow-[0_0_12px_rgba(233,195,73,0.5)]">
                    <span className="material-symbols-outlined text-[14px]">military_tech</span> CAPTAIN
                  </div>
                </div>

                <div className="text-center mt-space-sm">
                  <span className="font-label-caps text-label-caps text-primary tracking-widest uppercase">
                    {userTeamName}
                  </span>
                  <h2 className="font-headline-lg text-headline-md text-text-chalk tracking-tight leading-none mt-0.5 uppercase">
                    ROHIT SHARMA
                  </h2>
                  <span className="font-body-sm text-body-sm text-text-subdued">Opening Master • Toss Caller</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-space-xs bg-surface-recessed p-space-xs rounded-lg text-center border border-border-hairline">
                <div className="flex flex-col py-1">
                  <span className="font-label-caps text-[10px] text-text-subdued uppercase">PWR PLAY</span>
                  <span className="font-scoreboard-md text-title-md text-text-chalk">98</span>
                </div>
                <div className="flex flex-col py-1 bg-surface-elevated rounded">
                  <span className="font-label-caps text-[10px] text-primary uppercase">TOSS LUCK</span>
                  <span className="font-scoreboard-md text-title-md text-primary">74%</span>
                </div>
                <div className="flex flex-col py-1">
                  <span className="font-label-caps text-[10px] text-text-subdued uppercase">CHASE AVG</span>
                  <span className="font-scoreboard-md text-title-md text-text-chalk">52.8</span>
                </div>
              </div>
            </div>

            {/* CENTER: 3D COIN STAGE & TOSS DECISION DOCK */}
            <div className="lg:col-span-6 flex flex-col justify-between bg-surface-card rounded-xl p-space-lg shadow-2xl border border-border-hairline relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary text-[20px]">monetization_on</span>
                  <span className="font-label-caps text-label-caps text-text-chalk tracking-widest uppercase">
                    OFFICIAL COIN TOSS CEREMONY
                  </span>
                </div>
                <div className="px-space-sm py-1 bg-primary-container text-on-primary-container rounded-full font-label-caps text-[10px] tracking-widest font-black uppercase flex items-center gap-1 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-surface-container-lowest animate-ping" />
                  VERIFIED BY MATCH REFEREE
                </div>
              </div>

              {/* Central 3D Interactive Coin Stage */}
              <div className="relative py-space-md flex flex-col items-center justify-center min-h-[260px]">
                <div className="relative w-56 h-56 rounded-full bg-surface-recessed flex items-center justify-center shadow-inner overflow-hidden border border-border-hairline">
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-primary/20" />
                  <div className="relative z-20 w-36 h-36 rounded-full bg-gradient-to-tr from-tertiary via-tertiary-fixed to-tertiary-fixed-dim shadow-[0_12px_36px_rgba(233,195,73,0.35)] flex items-center justify-center">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-b from-tertiary-fixed to-on-tertiary-container flex items-center justify-center shadow-inner">
                      <div className="w-28 h-28 rounded-full bg-tertiary-container flex flex-col items-center justify-center p-2 text-center text-on-tertiary shadow-md">
                        <span className="material-symbols-outlined text-[32px] text-tertiary-fixed drop-shadow">sports_cricket</span>
                        <span className="font-scoreboard-md text-[14px] tracking-wider font-extrabold text-text-chalk">
                          {tossResult ? tossResult.coinLanded : coinSide}
                        </span>
                        <span className="font-label-caps text-[8px] text-tertiary-fixed tracking-widest uppercase">
                          SUPREMACY XI
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Toss Control Deck */}
                {!tossResult ? (
                  <div className="w-full max-w-sm flex flex-col gap-3 mt-6">
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={() => setCoinSide('HEADS')}
                        className={`flex-1 py-2 rounded-lg font-label-caps text-label-caps uppercase font-bold transition-all border cursor-pointer ${
                          coinSide === 'HEADS'
                            ? 'bg-primary text-on-primary border-primary shadow-md'
                            : 'bg-surface-elevated text-text-slate border-border-hairline hover:text-text-chalk'
                        }`}
                        type="button"
                      >
                        HEADS
                      </button>
                      <button
                        onClick={() => setCoinSide('TAILS')}
                        className={`flex-1 py-2 rounded-lg font-label-caps text-label-caps uppercase font-bold transition-all border cursor-pointer ${
                          coinSide === 'TAILS'
                            ? 'bg-primary text-on-primary border-primary shadow-md'
                            : 'bg-surface-elevated text-text-slate border-border-hairline hover:text-text-chalk'
                        }`}
                        type="button"
                      >
                        TAILS
                      </button>
                    </div>

                    <button
                      onClick={handleConductToss}
                      className="w-full py-3.5 rounded-lg bg-tertiary hover:bg-tertiary-container text-on-tertiary font-headline-md text-title-md font-extrabold uppercase tracking-wider transition shadow-lg cursor-pointer flex items-center justify-center gap-2"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[20px]">monetization_on</span>
                      <span>SPIN THE COIN</span>
                    </button>
                  </div>
                ) : (
                  <div className="w-full max-w-sm flex flex-col gap-3 mt-6">
                    <div className="p-4 rounded-xl bg-surface-elevated border border-border-hairline text-center">
                      <div className="text-xs text-text-subdued font-label-caps uppercase mb-1">
                        COIN LANDED ON: <strong className="text-tertiary">{tossResult.coinLanded}</strong>
                      </div>
                      <div className="text-base font-bold text-text-chalk uppercase">
                        {tossResult.winner === 'USER' ? `${userTeamName} WON THE TOSS!` : `${aiTeamName} WON THE TOSS!`}
                      </div>

                      {tossResult.winner === 'USER' ? (
                        <div className="mt-3">
                          <div className="text-xs text-text-subdued mb-2 font-label-caps uppercase">WHAT DO YOU ELECT TO DO?</div>
                          <div className="flex justify-center gap-3">
                            <button
                              onClick={() => setTossResult((prev) => (prev ? { ...prev, decision: 'BAT' } : null))}
                              className={`flex-1 py-2 rounded-lg font-label-caps text-label-caps uppercase font-bold transition border cursor-pointer ${
                                tossResult.decision === 'BAT'
                                  ? 'bg-primary text-on-primary border-primary'
                                  : 'bg-surface-recessed text-text-slate border-border-hairline'
                              }`}
                              type="button"
                            >
                              🏏 BAT FIRST
                            </button>
                            <button
                              onClick={() => setTossResult((prev) => (prev ? { ...prev, decision: 'BOWL' } : null))}
                              className={`flex-1 py-2 rounded-lg font-label-caps text-label-caps uppercase font-bold transition border cursor-pointer ${
                                tossResult.decision === 'BOWL'
                                  ? 'bg-primary text-on-primary border-primary'
                                  : 'bg-surface-recessed text-text-slate border-border-hairline'
                              }`}
                              type="button"
                            >
                              ⚾ BOWL FIRST
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-text-subdued mt-2 bg-surface-recessed p-2.5 rounded-lg border border-border-hairline">
                          <span className="font-semibold text-tertiary block mb-0.5 uppercase">
                            {aiTeamName} elected to {tossResult.decision} first.
                          </span>
                          <span>{tossResult.aiReason}</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleStartMatch}
                      className="w-full py-4 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-headline-md text-title-md font-extrabold uppercase tracking-wider transition shadow-lg cursor-pointer flex items-center justify-center gap-2"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[20px]">play_arrow</span>
                      <span>COMMENCE MATCH SIMULATION</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: OPPONENT CAPTAIN */}
            <div className="lg:col-span-3 flex flex-col justify-between bg-surface-card rounded-xl p-space-md shadow-xl border border-border-hairline">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="px-space-xs py-0.5 rounded-full bg-surface-elevated text-telemetry-blue font-label-caps text-[10px] tracking-wider uppercase">
                    OPPONENT SQUAD
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-surface-recessed px-space-xs py-0.5 rounded-md border border-border-hairline">
                  <span className="font-label-caps text-[10px] text-text-subdued">OVR</span>
                  <span className="font-scoreboard-md text-scoreboard-md text-tertiary">95</span>
                </div>
              </div>

              <div className="relative my-space-md flex flex-col items-center">
                <div className="relative w-44 h-52 rounded-xl overflow-hidden shadow-2xl bg-surface-container border border-border-hairline">
                  <img
                    className="w-full h-full object-cover"
                    alt={aiTeamName}
                    src="/assets/stitch/asset-012.png"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-card via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-surface-elevated text-text-chalk px-space-xs py-0.5 rounded font-label-caps text-label-caps font-black border border-border-hairline">
                    <span className="material-symbols-outlined text-[14px]">military_tech</span> CAPTAIN
                  </div>
                </div>

                <div className="text-center mt-space-sm">
                  <span className="font-label-caps text-label-caps text-telemetry-blue tracking-widest uppercase">
                    {aiTeamName}
                  </span>
                  <h2 className="font-headline-lg text-headline-md text-text-chalk tracking-tight leading-none mt-0.5 uppercase">
                    PAT CUMMINS
                  </h2>
                  <span className="font-body-sm text-body-sm text-text-subdued">Pace Leader • World Champion</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-space-xs bg-surface-recessed p-space-xs rounded-lg text-center border border-border-hairline">
                <div className="flex flex-col py-1">
                  <span className="font-label-caps text-[10px] text-text-subdued uppercase">SPEED</span>
                  <span className="font-scoreboard-md text-title-md text-text-chalk">146k</span>
                </div>
                <div className="flex flex-col py-1 bg-surface-elevated rounded">
                  <span className="font-label-caps text-[10px] text-telemetry-blue uppercase">ECONOMY</span>
                  <span className="font-scoreboard-md text-title-md text-telemetry-blue">6.8</span>
                </div>
                <div className="flex flex-col py-1">
                  <span className="font-label-caps text-[10px] text-text-subdued uppercase">WKTS/M</span>
                  <span className="font-scoreboard-md text-title-md text-text-chalk">2.4</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* ========================================================================= */}
      {/* PHASE 3 & 4: LIVE SIMULATION & COMPLETED (Stitch Screens 5 & 6)          */}
      {/* ========================================================================= */}
      {(phase === 'LIVE' || phase === 'COMPLETED') && (
        <main className="w-full max-w-[1440px] mx-auto px-4 md:px-margin-desktop py-space-md flex flex-col gap-space-md flex-1">
          {/* ZONE A: TOP BROADCAST HUD SCOREBOARD */}
          <section className="w-full bg-surface-card rounded-xl shadow-xl border border-border-hairline p-space-md flex flex-col gap-space-sm">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md">
              {/* Score & Teams Capsule */}
              <div className="flex items-center gap-space-lg flex-wrap sm:flex-nowrap">
                {/* 1st Inn Score (if in 2nd Innings) */}
                {activeInningsNumber === 2 && (
                  <div className="flex items-center gap-space-sm bg-surface-recessed px-space-md py-space-xs rounded border border-border-hairline">
                    <span className="font-label-caps text-label-caps text-text-subdued uppercase">1ST INN</span>
                    <div className="flex items-baseline gap-1">
                      <span className="font-headline-md text-title-md text-text-chalk uppercase">
                        {activeInnings?.bowlingTeamId === 'user-team' ? 'USER' : 'AI'}
                      </span>
                      <span className="font-scoreboard-md text-scoreboard-md text-text-slate">
                        {(targetRuns || 0) - 1}
                      </span>
                    </div>
                  </div>
                )}

                {/* Chasing / Active Live Unit */}
                <div className="flex items-center gap-space-md">
                  <div className="flex items-center gap-space-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-wicket-red animate-ping" />
                    <span className="font-display-lg text-headline-lg text-primary tracking-tight uppercase">
                      {activeInnings?.battingTeamId === 'user-team' ? userTeamName : aiTeamName}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-space-xs">
                    <span className="font-scoreboard-xl text-scoreboard-xl text-text-chalk font-extrabold tracking-tighter">
                      {currentRuns}<span className="text-wicket-red">/{currentWickets}</span>
                    </span>
                    <span className="font-scoreboard-md text-scoreboard-md text-text-slate">
                      {oversFormatted} <span className="font-label-caps text-label-caps text-text-subdued uppercase">/ {formatMaxOvers} OV</span>
                    </span>
                  </div>
                </div>

                {/* Over Matrix Tracker */}
                <div className="flex items-center gap-space-xs bg-surface-recessed px-space-sm py-1 rounded border border-border-hairline">
                  <span className="font-label-caps text-label-caps text-text-subdued mr-1 uppercase">
                    OV {Math.floor(legalBalls / 6) + 1}
                  </span>
                  {visibleEvents.slice(-6).map((ev, i) => {
                    const badge = getBallBadge(ev);
                    return (
                      <span
                        key={i}
                        className={`w-7 h-7 rounded flex items-center justify-center font-scoreboard-md text-body-sm ${badge.class}`}
                      >
                        {badge.label}
                      </span>
                    );
                  })}
                  {Array.from({ length: Math.max(0, 6 - (visibleEvents.length % 6)) }).map((_, i) => (
                    <span
                      key={`empty-${i}`}
                      className="w-7 h-7 rounded flex items-center justify-center font-scoreboard-md text-body-sm bg-surface-container text-text-subdued"
                    >
                      _
                    </span>
                  ))}
                </div>
              </div>

              {/* Tactical Equation Status Pill */}
              <div className="flex items-center gap-space-md flex-wrap lg:flex-nowrap">
                <div className="flex items-center bg-surface-elevated px-space-md py-space-xs rounded gap-space-md shadow-md border border-border-hairline">
                  {targetRuns !== undefined ? (
                    <>
                      <div className="flex flex-col">
                        <span className="font-label-caps text-label-caps text-text-subdued uppercase">TARGET</span>
                        <span className="font-scoreboard-md text-scoreboard-md text-tertiary">{targetRuns}</span>
                      </div>
                      <div className="h-8 w-px bg-border-hairline" />
                      <div className="flex flex-col">
                        <span className="font-label-caps text-label-caps text-text-subdued uppercase">REQUIRED</span>
                        <span className="font-body-bold text-body-bold text-text-chalk">
                          {runsRemaining} <span className="text-text-subdued font-normal">off {ballsRemaining}b</span>
                        </span>
                      </div>
                      <div className="h-8 w-px bg-border-hairline" />
                      <div className="flex items-center gap-space-sm">
                        <div className="flex flex-col">
                          <span className="font-label-caps text-label-caps text-text-subdued uppercase">REQ RR</span>
                          <span className="font-scoreboard-md text-scoreboard-md text-warning-amber">{reqRunRate}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-label-caps text-label-caps text-text-subdued uppercase">CURR RR</span>
                          <span className="font-scoreboard-md text-scoreboard-md text-secondary">{runRate}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-space-sm">
                      <div className="flex flex-col">
                        <span className="font-label-caps text-label-caps text-text-subdued uppercase">CURRENT RUN RATE</span>
                        <span className="font-scoreboard-md text-scoreboard-md text-primary">{runRate}</span>
                      </div>
                      <div className="h-8 w-px bg-border-hairline" />
                      <div className="flex flex-col">
                        <span className="font-label-caps text-label-caps text-text-subdued uppercase">PROJECTED</span>
                        <span className="font-scoreboard-md text-scoreboard-md text-tertiary">
                          {Math.round(parseFloat(runRate) * formatMaxOvers)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Real-time Broadcast Telemetry Ticker */}
            <div className="flex items-center justify-between bg-surface-recessed px-space-md py-1 rounded overflow-hidden border border-border-hairline">
              <div className="flex items-center gap-space-sm min-w-0">
                <span className="font-label-caps text-label-caps text-wicket-red uppercase tracking-wider font-extrabold flex items-center gap-1 shrink-0">
                  <span className="material-symbols-outlined text-[14px]">sports_cricket</span>
                  {currentEvent ? `${currentEvent.inningsNumber}.${currentEvent.overNumber}.${currentEvent.ballInOver} REPLAY` : 'MATCH RADAR'}
                </span>
                <p className="font-body-sm text-body-sm text-text-chalk truncate">
                  {currentEvent ? (
                    <>
                      <span className="text-text-slate">{bowlerName} to {strikerName}: </span>
                      <strong className="text-tertiary">{currentEvent.outcome}! </strong>
                      {currentEvent.scorecardDelta.totalRuns} run(s) scored. {currentEvent.dismissal ? `Dismissal: ${currentEvent.dismissal.mode}` : ''}
                    </>
                  ) : (
                    'Match in progress. Select tactical batter intent and step delivery.'
                  )}
                </p>
              </div>
              <div className="hidden md:flex items-center gap-space-md shrink-0">
                <span className="font-label-caps text-label-caps text-telemetry-blue flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">air</span> WIND 14 KM/H OUT
                </span>
                <span className="font-label-caps text-label-caps text-secondary flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">altitude</span> DEW INDEX {Math.round(dewFactor * 100)}%
                </span>
              </div>
            </div>
          </section>

          {/* MATCH ENGINE COCKPIT (ZONE B & ZONE C COMBINED GRID) */}
          <div className="w-full grid grid-cols-1 xl:grid-cols-12 gap-space-md items-start">
            {/* LEFT HUD: LIVE BATSMEN, BOWLER SENSORS & FORM (3 Cols) */}
            <div className="xl:col-span-3 flex flex-col gap-space-md order-2 xl:order-1">
              {/* Striker Profile Card */}
              <div className="bg-surface-card rounded-xl p-space-md flex flex-col gap-space-sm shadow-lg border border-border-hairline">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-space-xs">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="font-label-caps text-label-caps text-primary uppercase">STRIKER ON PITCH</span>
                  </div>
                  <span className="font-label-caps text-label-caps bg-surface-elevated text-secondary px-2 py-0.5 rounded">
                    FORM 96
                  </span>
                </div>
                <div className="flex items-center gap-space-sm">
                  <img
                    className="w-12 h-12 rounded-lg object-cover shrink-0 bg-surface-recessed"
                    alt={strikerName}
                    src={getPlayerPortrait(strikerId, 0)}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="font-headline-md text-title-md text-text-chalk truncate">{strikerName}</span>
                    <span className="font-label-caps text-label-caps text-text-subdued uppercase">RHB • ANCHOR / ACCEL</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 bg-surface-recessed p-space-xs rounded text-center border border-border-hairline">
                  <div>
                    <span className="font-label-caps text-label-caps text-text-subdued block uppercase">RUNS (B)</span>
                    <span className="font-scoreboard-md text-scoreboard-md text-text-chalk">
                      {strikerStats?.runs ?? 0}<span className="text-primary font-normal text-body-sm">*</span>{' '}
                      <span className="font-label-caps text-label-caps text-text-subdued">({strikerStats?.ballsFaced ?? 0})</span>
                    </span>
                  </div>
                  <div>
                    <span className="font-label-caps text-label-caps text-text-subdued block uppercase">S/R</span>
                    <span className="font-scoreboard-md text-scoreboard-md text-secondary">
                      {strikerStats?.strikeRate.toFixed(1) ?? '0.0'}
                    </span>
                  </div>
                  <div>
                    <span className="font-label-caps text-label-caps text-text-subdued block uppercase">4s / 6s</span>
                    <span className="font-scoreboard-md text-scoreboard-md text-tertiary">
                      {strikerStats?.fours ?? 0} / {strikerStats?.sixes ?? 0}
                    </span>
                  </div>
                </div>
                {/* Batting Confidence Gauge */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between font-label-caps text-label-caps text-text-subdued">
                    <span>TIMING ZONE</span>
                    <span className="text-primary uppercase font-bold">LOCKED IN (94%)</span>
                  </div>
                  <div className="w-full bg-surface-recessed h-1.5 rounded-full overflow-hidden">
                    <div className="bg-primary h-full rounded-full" style={{ width: '94%' }} />
                  </div>
                </div>
              </div>

              {/* Non-Striker Card */}
              <div className="bg-surface-card rounded-xl p-space-md flex flex-col gap-space-xs shadow-sm border border-border-hairline">
                <div className="flex items-center justify-between text-text-subdued font-label-caps text-label-caps uppercase">
                  <span>NON-STRIKER</span>
                  <span>RUNNER</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-space-sm">
                    <img
                      className="w-9 h-9 rounded object-cover shrink-0 bg-surface-recessed"
                      alt={nonStrikerName}
                      src={getPlayerPortrait(nonStrikerId, 1)}
                    />
                    <div className="flex flex-col">
                      <span className="font-title-md text-body-bold text-text-chalk">{nonStrikerName}</span>
                      <span className="font-label-caps text-[10px] text-text-subdued">RUNNING FIT 98%</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-scoreboard-md text-title-md text-text-chalk">
                      {nonStrikerStats?.runs ?? 0}
                    </span>
                    <span className="font-label-caps text-label-caps text-text-subdued block">
                      ({nonStrikerStats?.ballsFaced ?? 0}b)
                    </span>
                  </div>
                </div>
              </div>

              {/* Bowler Spell & Radar */}
              <div className="bg-surface-card rounded-xl p-space-md flex flex-col gap-space-sm shadow-lg border border-border-hairline">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-space-xs">
                    <span className="w-2 h-2 rounded-full bg-telemetry-blue" />
                    <span className="font-label-caps text-label-caps text-telemetry-blue uppercase">BOWLER IN ATTACK</span>
                  </div>
                  <span className="font-label-caps text-label-caps bg-surface-elevated text-text-slate px-2 py-0.5 rounded uppercase">
                    SPELL: {bowlerStats?.oversBowledFormatted ?? '0.0'} OV
                  </span>
                </div>
                <div className="flex items-center gap-space-sm">
                  <img
                    className="w-12 h-12 rounded-lg object-cover shrink-0 bg-surface-recessed"
                    alt={bowlerName}
                    src={getPlayerPortrait(bowlerId, 2)}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="font-headline-md text-title-md text-text-chalk truncate">{bowlerName}</span>
                    <span className="font-label-caps text-label-caps text-text-subdued uppercase">FAST SEAM • 144 KM/H</span>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1 bg-surface-recessed p-space-xs rounded text-center border border-border-hairline">
                  <div>
                    <span className="font-label-caps text-[10px] text-text-subdued block uppercase">OVERS</span>
                    <span className="font-scoreboard-md text-scoreboard-md text-text-chalk">
                      {bowlerStats?.oversBowledFormatted ?? '0.0'}
                    </span>
                  </div>
                  <div>
                    <span className="font-label-caps text-[10px] text-text-subdued block uppercase">MAIDENS</span>
                    <span className="font-scoreboard-md text-scoreboard-md text-text-chalk">
                      {bowlerStats?.maidens ?? 0}
                    </span>
                  </div>
                  <div>
                    <span className="font-label-caps text-[10px] text-text-subdued block uppercase">RUNS</span>
                    <span className="font-scoreboard-md text-scoreboard-md text-text-slate">
                      {bowlerStats?.runsConceded ?? 0}
                    </span>
                  </div>
                  <div>
                    <span className="font-label-caps text-[10px] text-text-subdued block uppercase">WKTS</span>
                    <span className="font-scoreboard-md text-scoreboard-md text-wicket-red font-bold">
                      {bowlerStats?.wickets ?? 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Live Win Probability Gauge */}
              <div className="bg-surface-card rounded-xl p-space-md flex flex-col gap-space-xs shadow-sm border border-border-hairline">
                <div className="flex justify-between font-label-caps text-label-caps text-text-subdued">
                  <span>WIN PROBABILITY</span>
                  <span className="text-primary font-bold">{liveWinProb}% USER</span>
                </div>
                <div className="w-full bg-surface-recessed h-2 rounded-full overflow-hidden flex">
                  <div className="bg-primary h-full transition-all duration-300" style={{ width: `${liveWinProb}%` }} />
                  <div className="bg-wicket-red h-full transition-all duration-300" style={{ width: `${100 - liveWinProb}%` }} />
                </div>
              </div>
            </div>

            {/* CENTER: PIXIJS V8 2D MATCH CANVAS & WAGON WHEEL (6 Cols) */}
            <div className="xl:col-span-6 flex flex-col gap-space-md order-1 xl:order-2">
              {liveState && (
                <div className="w-full rounded-xl overflow-hidden border border-border-hairline shadow-2xl">
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

              {/* Ball Trajectory & Field Radar */}
              <div className="bg-surface-card rounded-xl p-space-md shadow-md border border-border-hairline flex flex-col items-center">
                <div className="w-full flex items-center justify-between mb-2">
                  <span className="font-label-caps text-label-caps text-text-subdued uppercase flex items-center gap-1.5 font-bold">
                    <span className="material-symbols-outlined text-[16px] text-tertiary">radar</span>
                    BALL TRAJECTORY & FIELD RADAR
                  </span>
                  {currentEvent && (
                    <span
                      className={`px-2 py-0.5 rounded font-scoreboard-md text-[11px] font-bold ${
                        currentEvent.outcome === 'SIX'
                          ? 'bg-tertiary-container text-on-tertiary'
                          : currentEvent.outcome === 'FOUR'
                          ? 'bg-primary-container text-on-primary-container'
                          : currentEvent.outcome === 'WICKET'
                          ? 'bg-wicket-red-container text-wicket-red'
                          : 'bg-surface-elevated text-text-chalk'
                      }`}
                    >
                      {currentEvent.outcome}
                    </span>
                  )}
                </div>

                <div className="relative w-full aspect-square max-w-[280px] my-auto flex items-center justify-center">
                  <svg viewBox="-100 -100 200 200" className="w-full h-full">
                    <circle cx="0" cy="0" r="95" fill="#0C150E" stroke="#1D3021" strokeWidth="2" />
                    <circle cx="0" cy="0" r="90" fill="none" stroke="#cca72f" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
                    <circle cx="0" cy="0" r="50" fill="none" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.25" strokeDasharray="2 2" />
                    <rect x="-6" y="-18" width="12" height="36" fill="#785A3A" rx="1.5" opacity="0.85" />
                    <line x1="-5" y1="-14" x2="5" y2="-14" stroke="#FFF" strokeWidth="0.8" />
                    <line x1="-5" y1="14" x2="5" y2="14" stroke="#FFF" strokeWidth="0.8" />
                    {currentEvent?.trajectory && (() => {
                      const rad = ((currentEvent.trajectory.angleDegrees - 90) * Math.PI) / 180;
                      const normDist = Math.min(88, (currentEvent.trajectory.distanceMeters / (stadium.averageBoundaryRadiusMeters || 70)) * 88);
                      const lx = normDist * Math.cos(rad);
                      const ly = normDist * Math.sin(rad);
                      const strokeColor =
                        currentEvent.outcome === 'SIX'
                          ? '#e9c349'
                          : currentEvent.outcome === 'FOUR'
                          ? '#78dc77'
                          : currentEvent.outcome === 'WICKET'
                          ? '#c92a2a'
                          : '#a9d55f';
                      return (
                        <g>
                          <line x1="0" y1="12" x2={lx} y2={ly} stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
                          <circle cx={lx} cy={ly} r="3.5" fill={strokeColor} />
                        </g>
                      );
                    })()}
                  </svg>
                </div>
              </div>
            </div>

            {/* RIGHT HUD: TACTICAL WHEEL & STEPPER ACTION (3 Cols) */}
            <div className="xl:col-span-3 flex flex-col gap-space-md order-3">
              {/* Tactical Batter Intent Selector */}
              <div className="bg-surface-card rounded-xl p-space-md shadow-lg border border-border-hairline flex flex-col gap-space-sm">
                <span className="font-label-caps text-label-caps text-text-subdued uppercase font-bold">
                  BATTER TACTICAL INTENT
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'DEFEND', label: 'DEFENSIVE', icon: 'shield' },
                    { id: 'ROTATE_STRIKE', label: 'ROTATE', icon: 'sync' },
                    { id: 'AGGRESSIVE', label: 'ATTACK', icon: 'sports_baseball' },
                    { id: 'MAXIMUM_POWER', label: 'CARNAGE', icon: 'bolt' },
                  ].map((m) => {
                    const active = userIntent === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setUserIntent(m.id as BatterIntent)}
                        className={`p-2.5 rounded-lg font-label-caps text-label-caps uppercase font-bold flex flex-col items-center justify-center gap-1 transition-all border cursor-pointer ${
                          active
                            ? 'bg-primary text-on-primary border-primary shadow-md'
                            : 'bg-surface-recessed text-text-slate border-border-hairline hover:bg-surface-elevated hover:text-text-chalk'
                        }`}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[18px]">{m.icon}</span>
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bowling Line & Length Selector */}
              <div className="bg-surface-card rounded-xl p-space-md shadow-sm border border-border-hairline flex flex-col gap-space-xs">
                <span className="font-label-caps text-label-caps text-text-subdued uppercase font-bold">
                  BOWLING TACTICS
                </span>
                <div className="grid grid-cols-2 gap-2 text-body-sm">
                  <select
                    value={userLength}
                    onChange={(e) => setUserLength(e.target.value as BowlingLength)}
                    className="bg-surface-recessed border border-border-hairline text-text-chalk p-1.5 rounded text-[11px] font-label-caps focus:outline-none cursor-pointer"
                  >
                    <option value="GOOD_LENGTH">Good Length</option>
                    <option value="FULL">Full</option>
                    <option value="YORKER">Yorker</option>
                    <option value="BACK_OF_LENGTH">Back of Length</option>
                    <option value="SHORT">Short / Bouncer</option>
                  </select>
                  <select
                    value={userLine}
                    onChange={(e) => setUserLine(e.target.value as BowlingLine)}
                    className="bg-surface-recessed border border-border-hairline text-text-chalk p-1.5 rounded text-[11px] font-label-caps focus:outline-none cursor-pointer"
                  >
                    <option value="OUTSIDE_OFF">Outside Off</option>
                    <option value="STUMPS">Off / Middle</option>
                    <option value="DOWN_LEG">Down Leg</option>
                  </select>
                </div>
              </div>

              {/* Big Stepper Button */}
              <div className="bg-surface-card rounded-xl p-space-md shadow-xl border border-border-hairline flex flex-col gap-space-sm">
                <button
                  onClick={stepToNextDelivery}
                  className="w-full py-4 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-headline-md text-headline-md font-extrabold uppercase tracking-tight flex items-center justify-center gap-2 shadow-[0_4px_24px_rgba(120,220,119,0.35)] hover:scale-[1.01] transition-all cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[24px]">sports_cricket</span>
                  <span>TAKE STRIKE [SPACE]</span>
                </button>

                {/* Simulation Steppers Bar */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <button
                    onClick={handleSimulateOver}
                    className="py-1.5 rounded bg-surface-elevated hover:bg-surface-bright text-text-slate hover:text-text-chalk font-label-caps text-[10px] uppercase font-bold transition border border-border-hairline cursor-pointer"
                    type="button"
                  >
                    SIM OVER
                  </button>
                  <button
                    onClick={handleSimulateInnings}
                    className="py-1.5 rounded bg-surface-elevated hover:bg-surface-bright text-text-slate hover:text-text-chalk font-label-caps text-[10px] uppercase font-bold transition border border-border-hairline cursor-pointer"
                    type="button"
                  >
                    SIM INNINGS
                  </button>
                  <button
                    onClick={handleInstantResult}
                    className="py-1.5 rounded bg-surface-elevated hover:bg-surface-bright text-tertiary font-label-caps text-[10px] uppercase font-bold transition border border-border-hairline cursor-pointer"
                    type="button"
                  >
                    SIM MATCH
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PHASE 4: POST-MATCH CELEBRATION (Stitch Screen 6: Scorecard Results)      */}
          {/* ========================================================================= */}
          {phase === 'COMPLETED' && simulationResult && (
            <section className="w-full bg-surface-card rounded-2xl p-6 shadow-2xl border border-border-hairline flex flex-col gap-space-lg">
              {/* Victory Headline Banner */}
              <div className="p-6 rounded-xl bg-gradient-to-r from-surface-elevated via-surface-card to-surface-elevated border border-primary/40 text-center flex flex-col gap-2">
                <span className="font-label-caps text-label-caps text-tertiary tracking-widest uppercase flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-[18px]">military_tech</span>
                  CHAMPIONSHIP MATCH FINISHED • OFFICIAL RESULT
                </span>
                <h1 className="font-display-lg text-display-lg text-text-chalk tracking-tight uppercase">
                  {simulationResult.scorecard.result?.summary ?? 'Match Concluded'}
                </h1>
                <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-text-slate">
                  <button
                    onClick={() => handleVerifyReplay()}
                    className="flex items-center gap-1.5 text-primary hover:underline transition font-mono font-medium cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    <span>100% Deterministic Parity Verified (Audit)</span>
                  </button>
                  <span>•</span>
                  <span className="font-mono text-text-subdued">Seed: #{simulationResult.finalState.config.seed.toString()}</span>
                </div>
              </div>

              {/* Scoreboard Strip Split Bento (Innings Summary + Player of Match) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
                {/* Scoreboard Dual Matrix Card (8 cols) */}
                <div className="lg:col-span-8 bg-surface-elevated rounded-xl p-space-lg flex flex-col justify-between gap-space-lg shadow-xl border border-border-hairline">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
                    {simulationResult.scorecard.innings.map((inn, idx) => (
                      <div key={idx} className="flex flex-col justify-between p-space-md rounded-lg bg-surface-recessed border border-border-hairline">
                        <div className="flex items-center justify-between pb-space-sm">
                          <span className="font-headline-md text-title-md text-text-chalk uppercase">
                            {inn.battingTeamName}
                          </span>
                          <span className="px-space-xs py-0.5 rounded bg-surface-elevated font-label-caps text-label-caps text-text-slate uppercase">
                            INNINGS {inn.inningsNumber}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-space-sm py-space-sm">
                          <span className="font-scoreboard-xl text-scoreboard-xl text-text-chalk">
                            {inn.totalRuns}<span className="text-wicket-red">/{inn.totalWickets}</span>
                          </span>
                          <span className="font-scoreboard-md text-scoreboard-md text-text-subdued">
                            ({inn.oversCompletedFormatted} Ov)
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 pt-space-xs text-text-slate font-body-sm text-body-sm">
                          {inn.batters.slice(0, 2).map((b) => (
                            <div key={b.playerId} className="flex justify-between">
                              <span className="font-body-bold text-text-chalk">{getPlayerDisplayName(b.playerId)}</span>
                              <span className="font-label-caps text-label-caps text-on-surface">
                                {b.runs} ({b.ballsFaced}b) [{b.fours}x4, {b.sixes}x6]
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Innings Tabs & Detailed Tables */}
                  <div className="flex items-center gap-2 border-b border-border-hairline pb-2">
                    {simulationResult.scorecard.innings.map((inn, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedInningsTab(idx)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition font-label-caps uppercase cursor-pointer ${
                          selectedInningsTab === idx
                            ? 'bg-primary text-on-primary'
                            : 'bg-surface-recessed text-text-slate hover:text-text-chalk'
                        }`}
                      >
                        Innings {inn.inningsNumber}: {inn.battingTeamName} ({inn.totalRuns}/{inn.totalWickets})
                      </button>
                    ))}
                  </div>

                  {/* Batters Table */}
                  {simulationResult.scorecard.innings[selectedInningsTab] && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-border-hairline text-text-subdued font-label-caps">
                            <th className="py-2.5 px-3">BATTER</th>
                            <th className="py-2.5 px-3">DISMISSAL</th>
                            <th className="py-2.5 px-3 text-right">R</th>
                            <th className="py-2.5 px-3 text-right">B</th>
                            <th className="py-2.5 px-3 text-right">4s</th>
                            <th className="py-2.5 px-3 text-right">6s</th>
                            <th className="py-2.5 px-3 text-right">SR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {simulationResult.scorecard.innings[selectedInningsTab].batters.map((b) => (
                            <tr key={b.playerId} className="border-b border-border-hairline/60 hover:bg-surface-card">
                              <td className="py-2 px-3 font-semibold text-text-chalk">{getPlayerDisplayName(b.playerId)}</td>
                              <td className="py-2 px-3 text-text-slate text-[11px]">{formatDismissal(b)}</td>
                              <td className="py-2 px-3 text-right font-scoreboard-md text-text-chalk">{b.runs}</td>
                              <td className="py-2 px-3 text-right font-scoreboard-md text-text-slate">{b.ballsFaced}</td>
                              <td className="py-2 px-3 text-right font-scoreboard-md text-text-slate">{b.fours}</td>
                              <td className="py-2 px-3 text-right font-scoreboard-md text-text-slate">{b.sixes}</td>
                              <td className="py-2 px-3 text-right font-scoreboard-md text-primary">{b.strikeRate.toFixed(1)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Player of the Match Spotlight Card (4 cols) */}
                {simulationResult.scorecard.playerOfTheMatch && (
                  <div className="lg:col-span-4 bg-surface-elevated rounded-xl p-space-lg flex flex-col justify-between shadow-xl border border-border-hairline">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-space-xs px-space-sm py-1 rounded-full bg-surface-card text-tertiary font-label-caps text-label-caps uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[16px]">emoji_events</span>
                        PLAYER OF THE MATCH
                      </div>
                      <span className="font-label-caps text-label-caps px-space-xs py-0.5 rounded bg-surface-recessed text-text-chalk font-bold">
                        {simulationResult.scorecard.playerOfTheMatch.impactPoints} PTS
                      </span>
                    </div>

                    <div className="my-space-md flex flex-col items-center text-center">
                      <img
                        className="w-24 h-24 rounded-full object-cover ring-2 ring-tertiary shadow-lg bg-surface-recessed mb-3"
                        alt={simulationResult.scorecard.playerOfTheMatch.playerName}
                        src={getPlayerPortrait(simulationResult.scorecard.playerOfTheMatch.playerId, 0)}
                      />
                      <h3 className="font-headline-md text-headline-md text-text-chalk uppercase">
                        {simulationResult.scorecard.playerOfTheMatch.playerName}
                      </h3>
                      <span className="font-label-caps text-label-caps text-secondary uppercase">
                        {simulationResult.scorecard.playerOfTheMatch.teamName}
                      </span>
                      <p className="font-body-sm text-body-sm text-text-slate mt-2 max-w-xs">
                        {simulationResult.scorecard.playerOfTheMatch.performanceSummary}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-space-xs border-t border-border-hairline">
                      <button
                        onClick={() => setPhase('SETUP')}
                        className="w-full py-3 rounded-lg bg-primary text-on-primary font-headline-md text-body-sm font-bold uppercase transition hover:scale-[1.01] cursor-pointer"
                        type="button"
                      >
                        PLAY AGAIN / NEW MATCH
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
        </main>
      )}

      {/* Replay Verification Modal */}
      {showReplayModal && replayReport && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-card border border-border-hairline rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border-hairline pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-chalk">Cryptographic Replay Audit</h3>
                  <p className="text-[10px] text-text-subdued font-mono">SplitMix64 + SHA-256 Authority</p>
                </div>
              </div>
              <button
                onClick={() => setShowReplayModal(false)}
                className="p-1 rounded-lg text-text-slate hover:text-text-chalk cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-surface-recessed border border-border-hairline space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-text-subdued">Verification Status:</span>
                  <span className={replayReport.isValid ? 'text-primary font-bold' : 'text-wicket-red font-bold'}>
                    {replayReport.isValid ? '✓ 100% BIT-EXACT PARITY' : '✗ PARITY MISMATCH'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-subdued">Original Hash:</span>
                  <span className="text-primary">{replayReport.originalStateHash.slice(0, 18)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-subdued">Replayed Hash:</span>
                  <span className="text-primary">{replayReport.replayedStateHash.slice(0, 18)}...</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-surface-recessed text-[11px] text-text-slate leading-relaxed border border-border-hairline">
                The match was re-simulated autonomously from its original seed and configuration. Every delivery outcome, score delta, and dismissal was checked against the replayed state. Deterministic reproducibility is verified at 100%.
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setShowReplayModal(false)}
                  className="px-4 py-2 rounded bg-surface-elevated text-text-chalk font-label-caps text-label-caps uppercase cursor-pointer"
                >
                  CLOSE AUDIT
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Vault Drawer */}
      {showHistoryDrawer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-card border border-border-hairline rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border-hairline pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-surface-elevated text-tertiary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">history</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-chalk">Match History & Deterministic Vault</h3>
                  <p className="text-xs text-text-subdued">Archived matches with bit-exact replay capability</p>
                </div>
              </div>
              <button
                onClick={() => setShowHistoryDrawer(false)}
                className="p-1.5 rounded-lg text-text-slate hover:text-text-chalk cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {matchHistory.length === 0 ? (
                <div className="text-center py-12 text-text-subdued text-xs space-y-2">
                  <span className="material-symbols-outlined text-[32px] text-text-subdued block mx-auto">history</span>
                  <p>No completed matches archived in vault yet.</p>
                </div>
              ) : (
                matchHistory.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 rounded-xl bg-surface-elevated border border-border-hairline hover:border-border-focus transition space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="px-2 py-0.5 rounded bg-surface-recessed text-tertiary font-mono font-bold text-[10px]">
                        {m.format}
                      </span>
                      <span className="text-text-subdued font-mono text-[11px]">
                        {new Date(m.date).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-text-chalk">
                      {m.team1Name} vs {m.team2Name}
                    </div>

                    <div className="text-xs text-secondary font-medium">
                      {m.resultSummary}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-hairline">
                      <button
                        onClick={() => handleVerifyArchivedMatch(m)}
                        className="px-2.5 py-1 rounded bg-surface-recessed hover:bg-surface-container border border-border-hairline text-[11px] text-primary font-medium transition cursor-pointer font-label-caps"
                      >
                        AUDIT PARITY
                      </button>
                      <button
                        onClick={() => handleLoadArchivedReplay(m)}
                        className="px-2.5 py-1 rounded bg-primary text-on-primary text-[11px] font-bold transition cursor-pointer font-label-caps"
                      >
                        LOAD SEED
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
