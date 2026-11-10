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
  SUPPORTED_IPL_TEAMS,
  buildNationalLineup,
  buildWorldXILineup,
  buildIPLLineup,
} from '@/lib/national-teams';
import { getAuthoritativePlayerImage } from '@/lib/player-image-resolver';
import {
  InteractiveFieldEditor,
  CANONICAL_FIELD_PRESETS,
  type InteractiveFielder,
} from '@/components/InteractiveFieldEditor';
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
  selectIncomingBatter,
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
  type BowlingPaceStrategy,
  type BowlingIntent,
  type FieldPreset,
  type CustomFielderPosition,
  type TacticalDeliveryAction,
  type BowlingPlan,
  getActiveBowlingPhase,
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
import { CricketDreamXILogo } from '@/components/CricketDreamXILogo';

const CricketVisualizerCanvas = dynamic(
  () =>
    import('./visualizer/CricketVisualizerCanvas').then(
      (mod) => mod.CricketVisualizerCanvas,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[580px] bg-surface-recessed rounded-2xl flex flex-col items-center justify-center border border-border-hairline shadow-2xl gap-4">
        <CricketDreamXILogo
          variant="app-icon"
          width={64}
          height={64}
          className="w-16 h-16 rounded-2xl shadow-[0_0_30px_rgba(120,220,119,0.2)] animate-pulse"
        />
        <div className="flex items-center space-x-2 text-primary font-mono text-xs uppercase tracking-widest">
          <span className="w-2 h-2 rounded-full bg-primary animate-ping inline-block" />
          <span>INITIALIZING PIXIJS V8 2D BROADCAST VISUALIZER...</span>
        </div>
      </div>
    ),
  },
);

type MatchPhase = 'SETUP' | 'TOSS' | 'POST_TOSS_MANAGEMENT' | 'LIVE' | 'COMPLETED';

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
  userIntent?: BatterIntent;
  userPaceStrategy?: BowlingPaceStrategy;
  userBowlingIntent?: BowlingIntent;
  userBowlingPlan?: BowlingPlan;
  managementMode?: 'MANUAL' | 'ASSISTED' | 'AUTOMATIC';
  userField?: FieldPreset;
  customFielders?: InteractiveFielder[];
  userOpeningBowlerId?: string;
  userBattingLineup?: DreamTeamPlayerSlotInput[];
  configSnapshot?: {
    readonly config: Omit<MatchSimulationConfig, 'seed' | 'playerProfiles'> & {
      readonly seed: string;
      readonly playerProfiles: readonly [string, PlayerSquadContext][];
    };
  };
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
  const [selectedNextBatterId, setSelectedNextBatterId] = useState<string>('');
  const [userLength, setUserLength] = useState<BowlingLength>('GOOD_LENGTH');
  const [userLine, setUserLine] = useState<BowlingLine>('OUTSIDE_OFF');
  const [userVariation, setUserVariation] = useState<BowlingVariation>('STOCK');
  const [userField, setUserField] = useState<FieldPreset>('BALANCED_RING');
  const [userPaceStrategy, setUserPaceStrategy] = useState<BowlingPaceStrategy>('FULL_PACE');
  const [userBowlingIntent, setUserBowlingIntent] = useState<BowlingIntent>('ATTACKING');
  const [userBowlingPlan, setUserBowlingPlan] = useState<BowlingPlan>('BALANCED');
  const [managementMode, setManagementMode] = useState<'MANUAL' | 'ASSISTED' | 'AUTOMATIC'>('ASSISTED');
  const [showAdvancedTactics, setShowAdvancedTactics] = useState(false);
  const [userNominatedBowlerId, setUserNominatedBowlerId] = useState<string>('');
  const [userOpeningBowlerId, setUserOpeningBowlerId] = useState<string>('');
  const [userBattingLineup, setUserBattingLineup] = useState<DreamTeamPlayerSlotInput[]>([]);
  const [customFielders, setCustomFielders] = useState<InteractiveFielder[]>(() => {
    return CANONICAL_FIELD_PRESETS.BALANCED_RING.positions.map((pos, idx) => ({
      id: `fielder-${idx + 1}`,
      name: pos.role,
      role: pos.role,
      angleDeg: pos.angleDeg,
      distM: pos.distM,
      isBoundary: pos.isBoundary,
    }));
  });
  const [isAIOptimized, setIsAIOptimized] = useState<boolean>(false);
  const [userTeamName, setUserTeamName] = useState<string>('User Dream XI');
  const [aiTeamName, setAiTeamName] = useState<string>('AI World XI');
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('MEDIUM');

  // --- Nation & World XI Match Modes ---
  const [teamMode, setTeamMode] = useState<
    'ONE_TEAM_PER_NATION' | 'IPL_TEAMS' | 'ONE_PLAYER_PER_NATION' | 'CUSTOM_DREAM_TEAM'
  >('ONE_TEAM_PER_NATION');
  const [userNation, setUserNation] = useState<string>('India');
  const [aiNation, setAiNation] = useState<string>('Australia');
  const [userIPLTeam, setUserIPLTeam] = useState<string>('CSK');
  const [aiIPLTeam, setAiIPLTeam] = useState<string>('MI');
  const [savedSquads, setSavedSquads] = useState<any[]>([]);
  const [selectedSquadId, setSelectedSquadId] = useState<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      // Load saved user dream squads
      try {
        const rawTeams = localStorage.getItem('cricket_dream_teams');
        if (rawTeams) {
          const parsedTeams = JSON.parse(rawTeams);
          if (Array.isArray(parsedTeams) && parsedTeams.length > 0) {
            setSavedSquads(parsedTeams);
            const activeTeam = parsedTeams[0];
            setSelectedSquadId(activeTeam.id);
            if (activeTeam.teamName) {
              setUserTeamName(activeTeam.teamName);
            }
          }
        }
      } catch {}

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

      // Check for saved post-toss pre-match state
      const preMatchStr = localStorage.getItem('cricket_active_pre_match');
      if (preMatchStr) {
        try {
          const preMatch = JSON.parse(preMatchStr);
          if (preMatch && preMatch.tossResult) {
            if (preMatch.format) setFormat(preMatch.format);
            if (preMatch.selectedStadiumId) setSelectedStadiumId(preMatch.selectedStadiumId);
            if (preMatch.selectedPitch) setSelectedPitch(preMatch.selectedPitch);
            if (preMatch.dewFactor !== undefined) setDewFactor(preMatch.dewFactor);
            if (preMatch.temperature !== undefined) setTemperature(preMatch.temperature);
            if (preMatch.humidity !== undefined) setHumidity(preMatch.humidity);
            if (preMatch.cloudCover !== undefined) setCloudCover(preMatch.cloudCover);
            if (preMatch.seedInput) setSeedInput(preMatch.seedInput);
            if (preMatch.userTeamName) setUserTeamName(preMatch.userTeamName);
            if (preMatch.aiTeamName) setAiTeamName(preMatch.aiTeamName);
            if (preMatch.aiDifficulty) setAiDifficulty(preMatch.aiDifficulty);
            setTossResult(preMatch.tossResult);
            if (preMatch.userOpeningBowlerId) setUserOpeningBowlerId(preMatch.userOpeningBowlerId);
            if (Array.isArray(preMatch.userBattingLineup) && preMatch.userBattingLineup.length === 11) {
              setUserBattingLineup(preMatch.userBattingLineup);
            }
            if (Array.isArray(preMatch.customFielders) && preMatch.customFielders.length === 9) {
              setCustomFielders(preMatch.customFielders);
            }
            if (preMatch.userField) setUserField(preMatch.userField);
            if (preMatch.userBowlingPlan) setUserBowlingPlan(preMatch.userBowlingPlan);
            if (preMatch.managementMode) setManagementMode(preMatch.managementMode);
            setPhase('POST_TOSS_MANAGEMENT');
          }
        } catch {
          // Ignore
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
        userIntent,
        userPaceStrategy,
        userBowlingIntent,
        userField,
        userBowlingPlan,
        managementMode,
        customFielders,
        configSnapshot: {
          config: {
            ...currentState.config,
            seed: currentState.config.seed.toString(),
            playerProfiles: Array.from(currentState.config.playerProfiles.entries()),
          },
        },
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
      localStorage.removeItem('cricket_active_pre_match');
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

    const config: MatchSimulationConfig = activeSession.configSnapshot
      ? {
          ...activeSession.configSnapshot.config,
          seed: BigInt(activeSession.configSnapshot.config.seed),
          playerProfiles: new Map(activeSession.configSnapshot.config.playerProfiles),
        }
      : {
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
      const recordedAction = activeSession.visibleEvents[i]?.tactics;
      const action = recordedAction ?? resolveAITacticalAction(currentLiveState, livePrng);
      const { nextState } = stepDelivery(currentLiveState, action, livePrng);
      currentLiveState = nextState;
    }

    liveStateRef.current = currentLiveState;
    livePrngRef.current = livePrng;

    setLiveState(currentLiveState);
    setVisibleEvents(activeSession.visibleEvents);
    setCurrentEventIndex(activeSession.currentEventIndex);
    if (activeSession.userIntent) setUserIntent(activeSession.userIntent);
    if (activeSession.userPaceStrategy) setUserPaceStrategy(activeSession.userPaceStrategy);
    if (activeSession.userBowlingIntent) setUserBowlingIntent(activeSession.userBowlingIntent);
    if (activeSession.userBowlingPlan) setUserBowlingPlan(activeSession.userBowlingPlan);
    if (activeSession.managementMode) setManagementMode(activeSession.managementMode);
    if (activeSession.userField) setUserField(activeSession.userField);
    if (activeSession.customFielders && activeSession.customFielders.length === 9) {
      setCustomFielders(activeSession.customFielders);
    }
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
    let customTeam2: { id: string; name: string; lineup: DreamTeamPlayerSlotInput[] } | null = null;

    if (teamMode === 'IPL_TEAMS') {
      const res1 = buildIPLLineup(userIPLTeam, all, format);
      lineup1 = res1.lineup;
      customName = res1.teamName;

      const res2 = buildIPLLineup(aiIPLTeam, all, format);
      customTeam2 = { id: 'ai-team', name: res2.teamName, lineup: res2.lineup };
    } else if (teamMode === 'ONE_TEAM_PER_NATION') {
      const res = buildNationalLineup(userNation, all, format);
      lineup1 = res.lineup;
      customName = res.teamName;
    } else if (teamMode === 'ONE_PLAYER_PER_NATION') {
      const res = buildWorldXILineup(all, format);
      lineup1 = res.lineup;
      customName = 'User World XI (1 Per Nation)';
    } else {
      // Check selected saved squad from state or localStorage
      const foundSquad = savedSquads.find((s) => s.id === selectedSquadId) || savedSquads[0];
      if (foundSquad && Array.isArray(foundSquad.lineup) && foundSquad.lineup.length === 11) {
        lineup1 = foundSquad.lineup;
        if (foundSquad.teamName) customName = foundSquad.teamName;
      } else if (typeof window !== 'undefined') {
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

    // Team 2: Dynamically generated AI Opponent tailored to pitch & difficulty (or authentic IPL opponent)
    const seed = BigInt(seedInput || '987654321');
    const aiResult = customTeam2
      ? { name: customTeam2.name, lineup: customTeam2.lineup }
      : generateAIOpponentTeam(profiles, {
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

  function handleProceedToManagement() {
    if (!tossResult) return;
    const { team1 } = prepareSimulationSquads();
    if (userBattingLineup.length !== 11) {
      setUserBattingLineup(team1.lineup);
    }
    if (!userOpeningBowlerId) {
      const p1 = team1.lineup.find((s) => s.bowlingPriority === 1);
      const chosen = p1 ? p1.playerId : team1.lineup[team1.lineup.length - 1].playerId;
      setUserOpeningBowlerId(chosen);
    }
    // Save to pre-match storage
    if (typeof window !== 'undefined') {
      try {
        const preMatch = {
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
          userOpeningBowlerId: userOpeningBowlerId || (team1.lineup.find((s) => s.bowlingPriority === 1)?.playerId || team1.lineup[10].playerId),
          userBattingLineup: userBattingLineup.length === 11 ? userBattingLineup : team1.lineup,
          customFielders,
          userField,
        };
        localStorage.setItem('cricket_active_pre_match', JSON.stringify(preMatch));
      } catch {
        // Ignore
      }
    }
    setPhase('POST_TOSS_MANAGEMENT');
  }

  function handleStartMatch() {
    const { team1, team2, profiles } = prepareSimulationSquads();
    const seed = BigInt(seedInput || '12345');

    // Finalize team 1 user lineup with custom pre-innings batting order or bowler selection
    let finalizedUserLineup = userBattingLineup.length === 11 ? userBattingLineup : team1.lineup;

    // Is user bowling first?
    const isUserBowlingFirst = tossResult
      ? (tossResult.winner === 'USER' && tossResult.decision === 'BOWL') ||
        (tossResult.winner === 'AI' && tossResult.decision === 'BAT')
      : false;

    if (isUserBowlingFirst && userOpeningBowlerId) {
      const idx = finalizedUserLineup.findIndex((s) => s.playerId === userOpeningBowlerId);
      if (idx !== -1) {
        const selectedSlot = finalizedUserLineup[idx];
        const rest = finalizedUserLineup.filter((_, i) => i !== idx);
        // Put nominated opening bowler as last item in bowlingLineup so createInitialInningsState picks it
        finalizedUserLineup = [...rest, { ...selectedSlot, bowlingPriority: 1 }];
      }
    }

    const customTeam1 = {
      ...team1,
      lineup: finalizedUserLineup,
    };

    // Adjust batting order based on toss winner & decision
    let battingFirst = customTeam1;
    let bowlingFirst = team2;

    if (tossResult) {
      if (isUserBowlingFirst) {
        battingFirst = team2;
        bowlingFirst = customTeam1;
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

    // Clear pre-match storage now that match has commenced
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cricket_active_pre_match');
    }

    setLiveState(initialLiveState);
    setVisibleEvents([]);
    setCurrentEventIndex(0);
    setPhase('LIVE');
    setIsPlaying(true);
  }

  function stepToNextDelivery() {
    if (phase !== 'LIVE') return;
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

    // The fundamental principle: The USER manages their own Dream XI. The OPPONENT is managed entirely by CPU AI.
    // When user's team is batting: User controls batter intent; CPU controls bowler line/length/variation/field.
    // When user's team is bowling: User controls bowling pace, line, length, variation, intent, field & bowler; CPU controls batter intent.
    // Prepare custom fielder coordinates if user is bowling and has configured field
    const mappedCustomField: CustomFielderPosition[] = isUserBowling && customFielders.length === 9
      ? customFielders.map((f) => ({
          id: f.id,
          roleName: f.role,
          angleDegrees: f.angleDeg,
          distanceMeters: f.distM,
          isBoundary: f.isBoundary,
          isSlipsOrGully: f.role.toLowerCase().includes('slip') || f.role.toLowerCase().includes('gully'),
          isLegSide: f.angleDeg > 180 && f.angleDeg < 360,
        }))
      : [];

    const action: TacticalDeliveryAction = {
      batterIntent: isUserBatting ? userIntent : aiAction.batterIntent,
      bowlerLength: isUserBowling ? userLength : aiAction.bowlerLength,
      bowlerLine: isUserBowling ? userLine : aiAction.bowlerLine,
      bowlerVariation: isUserBowling ? userVariation : aiAction.bowlerVariation,
      fieldPreset: isUserBowling ? userField : aiAction.fieldPreset,
      customFieldPositions: isUserBowling && mappedCustomField.length > 0 ? mappedCustomField : undefined,
      bowlingPaceStrategy: isUserBowling ? userPaceStrategy : aiAction.bowlingPaceStrategy,
      bowlingIntent: isUserBowling ? userBowlingIntent : aiAction.bowlingIntent,
      bowlingPlan: isUserBowling ? userBowlingPlan : aiAction.bowlingPlan,
      activePhase: getActiveBowlingPhase(
        state.config.format,
        currentInnings?.completedOvers ?? 0,
        state.currentSessionNumber ?? 1,
        currentInnings?.totalWickets ?? 0,
      ).id,
      actionId: `${state.config.matchId}:${state.currentInningsIndex}:${currentInnings?.events.length ?? 0}`,
      pauseForBatterSelection: isUserBatting,
      nextBowlerPlayerId: isUserBowling && userNominatedBowlerId ? userNominatedBowlerId : undefined,
    };

    const { nextState, event } = stepDelivery(state, action, prng);
    liveStateRef.current = nextState;
    setLiveState(nextState);
    const nextEvents = [...visibleEvents, event];
    const nextIndex = currentEventIndex + 1;
    setVisibleEvents(nextEvents);
    setCurrentEventIndex(nextIndex);

    if (nextState.innings[nextState.currentInningsIndex]?.pendingBatterSelection) {
      setIsPlaying(false);
      setSelectedNextBatterId('');
      saveActiveSession(nextState, nextEvents, nextIndex);
      return;
    }

    if (nextState.status === 'COMPLETED') {
      setIsPlaying(false);
      setPhase('COMPLETED');
      if (simulationResult) {
        const authoritativeResult: MatchSimulationResult = {
          ...simulationResult,
          finalState: nextState,
          scorecard: reconcileMatchScorecard(nextState),
          allEvents: nextEvents,
          totalDeliveriesSimulated: nextEvents.length,
        };
        setSimulationResult(authoritativeResult);
        archiveCompletedMatch(authoritativeResult);
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

  function handleConfirmIncomingBatter() {
    if (!liveStateRef.current || !selectedNextBatterId) return;
    const nextState = selectIncomingBatter(liveStateRef.current, selectedNextBatterId);
    const recordedEvents = visibleEvents.map((event, index) =>
      index === visibleEvents.length - 1 && event.tactics
        ? {
            ...event,
            tactics: {
              ...event.tactics,
              nextBatterPlayerId: selectedNextBatterId,
              pauseForBatterSelection: true,
            },
          }
        : event,
    );
    liveStateRef.current = nextState;
    setLiveState(nextState);
    setVisibleEvents(recordedEvents);
    setSelectedNextBatterId('');
    saveActiveSession(nextState, recordedEvents, currentEventIndex);
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
      liveStateRef.current.innings[liveStateRef.current.currentInningsIndex].completedOvers === targetOver &&
      !liveStateRef.current.innings[liveStateRef.current.currentInningsIndex].pendingBatterSelection
    ) {
      stepToNextDelivery();
    }
  }

  function handleSimulateInnings() {
    if (!liveStateRef.current || !livePrngRef.current) return;
    const currentInnIdx = liveStateRef.current.currentInningsIndex;
    while (
      liveStateRef.current.status !== 'COMPLETED' &&
      liveStateRef.current.currentInningsIndex === currentInnIdx &&
      !liveStateRef.current.innings[liveStateRef.current.currentInningsIndex].pendingBatterSelection
    ) {
      stepToNextDelivery();
    }
  }

  // Authoritative match score derived directly from the single source of truth: liveState
  const currentEvent: DeliveryEvent | undefined =
    visibleEvents.length > 0 ? visibleEvents[visibleEvents.length - 1] : undefined;

  const activeInningsNumber = liveState ? liveState.currentInningsIndex + 1 : (currentEvent?.inningsNumber ?? 1);
  const activeInnings = liveState?.innings[activeInningsNumber - 1];

  // Derive scores from authoritative activeInnings state
  const currentRuns = activeInnings?.totalRuns ?? (currentEvent ? currentEvent.scorecardDelta.totalRuns : 0);
  const currentWickets = activeInnings?.totalWickets ?? (currentEvent ? currentEvent.scorecardDelta.totalWickets : 0);
  const legalBalls = activeInnings
    ? activeInnings.completedOvers * 6 + activeInnings.legalBallsInCurrentOver
    : 0;
  const oversFormatted = activeInnings
    ? `${activeInnings.completedOvers}.${activeInnings.legalBallsInCurrentOver}`
    : '0.0';
  const runRate = legalBalls > 0 ? ((currentRuns / legalBalls) * 6).toFixed(2) : '0.00';

  // Dynamic format & target metrics
  const isTestFormat = format === 'TEST_RED_BALL' || format === 'TEST_PINK_BALL';
  const formatMaxOvers = format === 'T10' ? 10 : format === 'ODI' ? 50 : format === 'T20' ? 20 : Infinity;
  const totalInningsBalls = formatMaxOvers * 6;
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
    const p = id ? (simulationResult?.finalState.config.playerProfiles instanceof Map
      ? simulationResult.finalState.config.playerProfiles.get(id)
      : (simulationResult?.finalState.config.playerProfiles as any)?.[id]) : undefined;
    return getAuthoritativePlayerImage(id, p?.fullName || p?.displayName, p?.primaryRole, p?.primaryNationality);
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

  // Real-time team ownership evaluation
  const isUserBatting = activeInnings?.battingTeamId === 'user-team';
  const isUserBowling = activeInnings?.bowlingTeamId === 'user-team';

  // Eligible user bowlers for dynamic bowling changes
  const userBowlingSlots = liveState && isUserBowling
    ? (liveState.config.team1.id === 'user-team' ? liveState.config.team1.lineup : liveState.config.team2.lineup)
      .filter((slot) => liveState.config.playerProfiles.get(slot.playerId)?.bowlingStyle !== 'NONE')
    : [];

  const strikerStats = strikerId ? activeInnings?.batters.get(strikerId) : undefined;
  const nonStrikerStats = nonStrikerId ? activeInnings?.batters.get(nonStrikerId) : undefined;
  const bowlerStats = bowlerId ? activeInnings?.bowlers.get(bowlerId) : undefined;
  const strikerName = getPlayerDisplayName(strikerId || '');
  const nonStrikerName = getPlayerDisplayName(nonStrikerId || '');
  const bowlerName = getPlayerDisplayName(bowlerId || '');
  const pendingBatterDecision = isUserBatting ? activeInnings?.pendingBatterSelection : undefined;
  const availableIncomingBatters = liveState && activeInnings && isUserBatting
    ? (liveState.config.team1.id === activeInnings.battingTeamId ? liveState.config.team1.lineup : liveState.config.team2.lineup)
      .filter((slot) => slot.playerId !== strikerId && slot.playerId !== nonStrikerId && !activeInnings.batters.get(slot.playerId)?.isOut)
      .sort((a, b) => a.battingOrder - b.battingOrder)
    : [];

  // Current active bowler profile and style determination
  const currentActiveBowler = liveState && bowlerId
    ? liveState.config.playerProfiles.get(bowlerId)
    : undefined;
  const currentActiveBowlerIsSpin = currentActiveBowler
    ? currentActiveBowler.bowlingStyle.includes('BREAK') ||
      currentActiveBowler.bowlingStyle.includes('SPIN') ||
      currentActiveBowler.bowlingStyle.includes('ORTHODOX')
    : false;
  const activeBowlingPhase = activeInnings
    ? getActiveBowlingPhase(format, activeInnings.completedOvers, liveState?.currentSessionNumber ?? 1, activeInnings.totalWickets)
    : undefined;
  const displayedQuota = format === 'T10' ? 2 : format === 'T20' ? 4 : format === 'ODI' ? 10 : undefined;

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
            MATCH ARENA • {phase}
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
                  STEP 1: SELECT MATCH FORMAT
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
                    STEP 2: SQUADS & TEAMS
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

              {/* 4 Roster Modes: National, IPL Franchises, World XI, Custom Dream XI */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'ONE_TEAM_PER_NATION', label: '1 Team / Nation', desc: 'Authentic Rivalry', icon: 'flag' },
                  { id: 'IPL_TEAMS', label: 'IPL Franchises', desc: '2026 Squads', icon: 'local_fire_department' },
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
                        if (m.id === 'IPL_TEAMS') {
                          const uTeam = SUPPORTED_IPL_TEAMS.find((t) => t.id === userIPLTeam) || SUPPORTED_IPL_TEAMS[0];
                          const aTeam = SUPPORTED_IPL_TEAMS.find((t) => t.id === aiIPLTeam) || SUPPORTED_IPL_TEAMS[1];
                          setUserTeamName(uTeam.name);
                          setAiTeamName(aTeam.name);
                        } else if (m.id === 'ONE_TEAM_PER_NATION') {
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

              {/* Custom Dream XI Squad Selector */}
              {teamMode === 'CUSTOM_DREAM_TEAM' && (
                <div className="p-3 rounded-lg bg-surface-recessed border border-border-hairline space-y-3 mt-1">
                  <div className="flex items-center justify-between text-xs text-secondary font-label-caps">
                    <span>✓ YOUR VERIFIED DREAM XI SQUADS</span>
                    <Link href="/dream-teams" className="text-primary hover:underline text-[10px]">
                      + Build / Edit Squads
                    </Link>
                  </div>
                  {savedSquads.length === 0 ? (
                    <div className="text-center py-2 text-text-subdued text-xs">
                      No saved squads found. (Using default balanced XI or{' '}
                      <Link href="/dream-teams" className="text-primary underline">
                        create one now
                      </Link>
                      )
                    </div>
                  ) : (
                    <div>
                      <label className="text-[11px] text-text-subdued block mb-1 font-label-caps uppercase">
                        SELECT ACTIVE SQUAD:
                      </label>
                      <select
                        value={selectedSquadId}
                        onChange={(e) => {
                          const sqId = e.target.value;
                          setSelectedSquadId(sqId);
                          const chosen = savedSquads.find((s) => s.id === sqId);
                          if (chosen) {
                            setUserTeamName(chosen.teamName);
                            if (typeof window !== 'undefined') {
                              localStorage.setItem('cricket_active_user_team', JSON.stringify(chosen));
                            }
                          }
                        }}
                        className="w-full bg-surface-elevated border border-border-hairline text-text-chalk p-2 rounded text-body-sm focus:outline-none cursor-pointer"
                      >
                        {savedSquads.map((sq) => (
                          <option key={sq.id} value={sq.id}>
                            {sq.teamName} ({sq.lineup?.length || 11} Players - {sq.format || 'ALL'})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* IPL 2026 Franchises Selector */}
              {teamMode === 'IPL_TEAMS' && (
                <div className="p-3 rounded-lg bg-surface-recessed border border-border-hairline space-y-3 mt-1">
                  <div className="flex items-center justify-between text-xs text-primary font-label-caps">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-tertiary">
                        local_fire_department
                      </span>
                      <span className="text-tertiary font-bold">2026 IPL SQUADS &amp; FRANCHISES</span>
                    </div>
                    <span className="text-[10px] text-text-subdued">Authentic 11-Player Playing XIs</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-text-subdued block mb-1 font-label-caps uppercase">
                        YOUR IPL TEAM:
                      </label>
                      <select
                        value={userIPLTeam}
                        onChange={(e) => {
                          const newTeamId = e.target.value;
                          setUserIPLTeam(newTeamId);
                          const chosen = SUPPORTED_IPL_TEAMS.find((t) => t.id === newTeamId);
                          if (chosen) {
                            setUserTeamName(chosen.name);
                          }
                          if (newTeamId === aiIPLTeam) {
                            const available = SUPPORTED_IPL_TEAMS.find((t) => t.id !== newTeamId);
                            if (available) {
                              setAiIPLTeam(available.id);
                              setAiTeamName(available.name);
                            }
                          }
                        }}
                        className="w-full bg-surface-elevated border border-border-hairline text-text-chalk p-2 rounded text-body-sm focus:outline-none cursor-pointer"
                      >
                        {SUPPORTED_IPL_TEAMS.map((t) => (
                          <option key={t.id} value={t.id} disabled={t.id === aiIPLTeam}>
                            {t.shortName} • {t.name} (Capt: {t.captainName})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-text-subdued block mb-1 font-label-caps uppercase">
                        AI OPPONENT IPL TEAM:
                      </label>
                      <select
                        value={aiIPLTeam}
                        onChange={(e) => {
                          const newTeamId = e.target.value;
                          setAiIPLTeam(newTeamId);
                          const chosen = SUPPORTED_IPL_TEAMS.find((t) => t.id === newTeamId);
                          if (chosen) {
                            setAiTeamName(chosen.name);
                          }
                        }}
                        className="w-full bg-surface-elevated border border-border-hairline text-text-chalk p-2 rounded text-body-sm focus:outline-none cursor-pointer"
                      >
                        {SUPPORTED_IPL_TEAMS.map((t) => (
                          <option key={t.id} value={t.id} disabled={t.id === userIPLTeam}>
                            {t.shortName} • {t.name} (Capt: {t.captainName})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Active Matchup Card Strip */}
                  {(() => {
                    const uMeta = SUPPORTED_IPL_TEAMS.find((t) => t.id === userIPLTeam);
                    const aMeta = SUPPORTED_IPL_TEAMS.find((t) => t.id === aiIPLTeam);
                    if (!uMeta || !aMeta) return null;
                    return (
                      <div className="pt-2 border-t border-border-hairline flex flex-wrap items-center justify-between text-[11px] font-mono gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: uMeta.primaryColor }}
                          />
                          <span className="text-text-chalk font-bold">{uMeta.name}</span>
                          <span className="text-text-subdued">
                            (WK: {uMeta.wicketkeeperName})
                          </span>
                        </div>
                        <span className="text-secondary font-bold">VS</span>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: aMeta.primaryColor }}
                          />
                          <span className="text-text-chalk font-bold">{aMeta.name}</span>
                          <span className="text-text-subdued">
                            (Capt: {aMeta.captainName})
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

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
                    STEP 3: VENUE & CONDITIONS
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

              {(() => {
                const squads = prepareSimulationSquads();
                const capSlot = squads.team1.lineup.find((s) => s.isCaptain) || squads.team1.lineup[0];
                const capProfile = capSlot ? squads.profiles.get(capSlot.playerId) : undefined;
                const capName = capProfile?.fullName || capProfile?.displayName || 'Team Captain';
                const capRole = capProfile?.primaryRole?.replace(/_/g, ' ') || 'Squad Leader';
                const capImg = getAuthoritativePlayerImage(capSlot?.playerId, capName, capProfile?.primaryRole, capProfile?.primaryNationality);
                return (
                  <div className="relative my-space-md flex flex-col items-center">
                    <div className="relative w-44 h-52 rounded-xl overflow-hidden shadow-2xl bg-surface-container border border-border-hairline">
                      <img
                        className="w-full h-full object-cover"
                        alt={capName}
                        src={capImg}
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
                        {capName}
                      </h2>
                      <span className="font-body-sm text-body-sm text-text-subdued">{capRole} • Toss Caller</span>
                    </div>
                  </div>
                );
              })()}

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
                      onClick={handleProceedToManagement}
                      className="w-full py-4 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-headline-md text-title-md font-extrabold uppercase tracking-wider transition shadow-lg cursor-pointer flex items-center justify-center gap-2"
                      type="button"
                    >
                      <span>CONFIRM TOSS & PROCEED TO MANAGEMENT</span>
                      <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
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

              {(() => {
                const squads = prepareSimulationSquads();
                const capSlot = squads.team2.lineup.find((s) => s.isCaptain) || squads.team2.lineup[0];
                const capProfile = capSlot ? squads.profiles.get(capSlot.playerId) : undefined;
                const capName = capProfile?.fullName || capProfile?.displayName || 'Opponent Captain';
                const capRole = capProfile?.primaryRole?.replace(/_/g, ' ') || 'Opponent Leader';
                const capImg = getAuthoritativePlayerImage(capSlot?.playerId, capName, capProfile?.primaryRole, capProfile?.primaryNationality);
                return (
                  <div className="relative my-space-md flex flex-col items-center">
                    <div className="relative w-44 h-52 rounded-xl overflow-hidden shadow-2xl bg-surface-container border border-border-hairline">
                      <img
                        className="w-full h-full object-cover"
                        alt={capName}
                        src={capImg}
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
                        {capName}
                      </h2>
                      <span className="font-body-sm text-body-sm text-text-subdued">{capRole} • Challenging Captain</span>
                    </div>
                  </div>
                );
              })()}

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
      {/* PHASE 2.5: MANDATORY POST-TOSS TEAM MANAGEMENT (PHASE 9.6)                */}
      {/* ========================================================================= */}
      {phase === 'POST_TOSS_MANAGEMENT' && (() => {
        const { team1, team2, profiles } = prepareSimulationSquads();
        const activeLineup = userBattingLineup.length === 11 ? userBattingLineup : team1.lineup;

        const isUserBowlingFirst = tossResult
          ? (tossResult.winner === 'USER' && tossResult.decision === 'BOWL') ||
            (tossResult.winner === 'AI' && tossResult.decision === 'BAT')
          : false;

        const isUserBattingFirst = !isUserBowlingFirst;

        // Eligible bowlers for opening over
        const eligibleBowlers = team1.lineup.filter((s) => {
          const prof = profiles.get(s.playerId);
          if (!prof) return false;
          // Must not be pure wicketkeeper unless part-time
          if (prof.isWicketkeeper && prof.primaryRole === 'WICKETKEEPER_BATTER') return false;
          return true;
        });

        // AI recommended opening bowler (highest bowling priority or pace/spin rating)
        const aiRecommendedBowler = team1.lineup.find((s) => s.bowlingPriority === 1) || eligibleBowlers[0] || team1.lineup[0];

        // Ensure active opening bowler state is set
        const activeOpeningBowlerId = userOpeningBowlerId || aiRecommendedBowler.playerId;

        // Powerplay regulations for format
        const maxOutsideCircle = format === 'T10' || format === 'T20' || format === 'ODI' ? 2 : 9;
        const currentOutsideCircle = customFielders.filter((f) => f.distM > 30).length;

        // MCC Law 28.4
        const legSideCount = customFielders.filter((f) => f.angleDeg > 180 && f.angleDeg < 360).length;
        const behindSquareLegCount = customFielders.filter((f) => f.angleDeg >= 180 && f.angleDeg <= 270).length;

        const isPowerplayValid = currentOutsideCircle <= maxOutsideCircle;
        const isLaw28Valid = legSideCount <= 5 && behindSquareLegCount <= 2;
        const isFieldValid = isPowerplayValid && isLaw28Valid;

        // Lineup validity: 11 unique players
        const uniqueBatters = new Set(activeLineup.map((s) => s.playerId));
        const isBattingValid = uniqueBatters.size === 11 && activeLineup.length === 11;

        // Overall readiness
        const isReadyToStart = isBattingValid && (!isUserBowlingFirst || (Boolean(activeOpeningBowlerId) && isFieldValid));

        function moveSlot(currIdx: number, targetIdx: number) {
          if (targetIdx < 0 || targetIdx >= activeLineup.length) return;
          const updated = [...activeLineup];
          const temp = updated[currIdx];
          updated[currIdx] = updated[targetIdx];
          updated[targetIdx] = temp;
          // Re-index batting order
          const reordered = updated.map((slot, i) => ({
            ...slot,
            battingOrder: i + 1,
          }));
          setUserBattingLineup(reordered);
        }

        function handleAutoSelectBowler() {
          setUserOpeningBowlerId(aiRecommendedBowler.playerId);
        }

        function handleAutoSelectBatting() {
          setUserBattingLineup(team1.lineup);
        }

        return (
          <main className="w-full max-w-[1440px] mx-auto px-4 md:px-margin-desktop py-space-md flex flex-col gap-space-lg flex-1 animate-in fade-in duration-300">
            {/* Top Match Header Ribbon */}
            <header className="w-full bg-surface-card rounded-xl p-space-md shadow-xl flex flex-col md:flex-row items-center justify-between gap-space-md border border-border-hairline">
              <div className="flex items-center gap-space-md min-w-0">
                <div className="flex flex-col items-center justify-center bg-surface-recessed px-space-md py-space-xs rounded-lg shadow-sm border border-border-hairline">
                  <span className="font-label-caps text-label-caps text-primary tracking-widest uppercase font-bold">STAGE</span>
                  <span className="font-headline-md text-title-md text-text-chalk">POST-TOSS MANAGEMENT</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-space-xs text-text-subdued font-label-caps text-label-caps uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-text-chalk font-body-bold">MANDATORY PRE-MATCH CONFIGURATION</span>
                    <span className="text-text-subdued">•</span>
                    <span>{format.replace(/_/g, ' ')}</span>
                  </div>
                  <h1 className="font-headline-lg text-title-md md:text-headline-md text-text-chalk truncate tracking-tight uppercase font-extrabold mt-0.5">
                    {userTeamName} <span className="text-text-subdued font-light">vs</span> {aiTeamName}
                  </h1>
                </div>
              </div>

              {/* Toss Outcome Badge */}
              <div className="flex items-center gap-2 bg-surface-recessed px-3 py-2 rounded-xl border border-border-hairline text-right">
                <div className="flex flex-col">
                  <span className="text-[10px] font-label-caps uppercase text-text-subdued">TOSS RESULT</span>
                  <span className="text-xs font-bold text-text-chalk uppercase">
                    {tossResult ? (
                      tossResult.winner === 'USER' ? `${userTeamName} (Elected to ${tossResult.decision})` : `${aiTeamName} (Elected to ${tossResult.decision})`
                    ) : 'Pending'}
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                  isUserBattingFirst ? 'bg-primary/20 text-primary border border-primary/40' : 'bg-secondary/20 text-secondary border border-secondary/40'
                }`}>
                  {isUserBattingFirst ? 'YOU BAT FIRST' : 'YOU BOWL FIRST'}
                </span>
              </div>
            </header>

            {/* Main Management Cockpit */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md">
              {/* SECTION: If user bats first -> Batting Lineup Management */}
              {(
                <div className="lg:col-span-12 flex flex-col gap-space-md">
                  <div className="bg-surface-card rounded-xl p-space-md shadow-xl border border-border-hairline flex flex-col gap-space-md">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border-hairline gap-2">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[22px]">sports_cricket</span>
                        <div>
                          <h2 className="text-sm font-extrabold text-text-chalk uppercase tracking-wider font-headline-md">
                            SELECT OPENING PAIR & BATTING ORDER
                          </h2>
                          <p className="text-xs text-text-subdued">
                            Configure your #1 Striker and #2 Non-Striker. Promote or demote batters for format conditions.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleAutoSelectBatting}
                        className="px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface-bright text-text-slate hover:text-text-chalk text-xs font-label-caps uppercase tracking-wider border border-border-hairline transition cursor-pointer self-start sm:self-auto"
                        type="button"
                      >
                        ⚡ AUTO SELECT BALANCED ORDER
                      </button>
                    </div>

                    {/* Opening Batting Pair Spotlight */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-surface-recessed p-3 rounded-xl border border-border-hairline">
                      {[0, 1].map((idx) => {
                        const slot = activeLineup[idx];
                        const prof = slot ? profiles.get(slot.playerId) : undefined;
                        const pName = prof?.fullName || prof?.displayName || 'Unknown Batter';
                        const pImg = getAuthoritativePlayerImage(slot?.playerId, pName, prof?.primaryRole, prof?.primaryNationality);
                        const isStriker = idx === 0;

                        return (
                          <div
                            key={slot?.playerId || idx}
                            className="flex items-center gap-3 p-3 bg-surface-card rounded-xl border border-primary/30 shadow-md"
                          >
                            <span className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-scoreboard-md text-sm font-bold flex-shrink-0">
                              #{idx + 1}
                            </span>
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-recessed border border-border-hairline flex-shrink-0">
                              <img src={pImg} alt={pName} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-sm text-text-chalk truncate">{pName}</span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-primary/20 text-primary uppercase font-bold">
                                  {isStriker ? 'STRIKER' : 'NON-STRIKER'}
                                </span>
                              </div>
                              <div className="text-[11px] text-text-subdued truncate">
                                {prof?.primaryRole?.replace(/_/g, ' ')} • {prof?.battingHand?.replace(/_/g, ' ')} • OVR {typeof prof?.formatRating === 'number' ? prof.formatRating : 85}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Full 11-Player Interactive Batting Lineup */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-text-subdued px-1">
                        REMAINING BATTING ORDER (#3 TO #11)
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {activeLineup.slice(2).map((slot, offsetIdx) => {
                          const realIdx = offsetIdx + 2;
                          const prof = profiles.get(slot.playerId);
                          const pName = prof?.fullName || prof?.displayName || 'Player';

                          return (
                            <div
                              key={slot.playerId}
                              className="flex items-center justify-between p-2.5 rounded-lg bg-surface-recessed border border-border-hairline hover:border-border-hairline/80 transition"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="text-xs font-mono font-bold text-text-subdued w-6">
                                  #{realIdx + 1}
                                </span>
                                <div className="truncate">
                                  <div className="text-xs font-bold text-text-chalk truncate">{pName}</div>
                                  <div className="text-[10px] text-text-subdued truncate">
                                    {prof?.primaryRole?.replace(/_/g, ' ')} • OVR {typeof prof?.formatRating === 'number' ? prof.formatRating : 80}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => moveSlot(realIdx, realIdx - 1)}
                                  className="p-1 rounded bg-surface-elevated hover:bg-surface-bright text-text-slate hover:text-text-chalk text-xs transition cursor-pointer"
                                  title="Move Up"
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveSlot(realIdx, realIdx + 1)}
                                  className="p-1 rounded bg-surface-elevated hover:bg-surface-bright text-text-slate hover:text-text-chalk text-xs transition cursor-pointer"
                                  title="Move Down"
                                >
                                  ▼
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION: If user bowls first -> Opening Bowler & Field Setup */}
              {isUserBowlingFirst && (
                <>
                  {/* Left Column: Opening Bowler Selection */}
                  <div className="lg:col-span-5 flex flex-col gap-space-md">
                    <div className="bg-surface-card rounded-xl p-space-md shadow-xl border border-border-hairline flex flex-col gap-3">
                      <div className="flex items-center justify-between pb-2 border-b border-border-hairline">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-secondary text-[20px]">sports_baseball</span>
                          <h2 className="text-sm font-extrabold text-text-chalk uppercase tracking-wider font-headline-md">
                            SELECT OPENING BOWLER
                          </h2>
                        </div>
                        <button
                          type="button"
                          onClick={handleAutoSelectBowler}
                          className="px-2.5 py-1 rounded bg-surface-elevated hover:bg-surface-bright text-secondary text-[11px] font-label-caps uppercase border border-border-hairline transition cursor-pointer font-bold"
                        >
                          ⚡ AUTO SELECT (AI PICK)
                        </button>
                      </div>

                      <p className="text-xs text-text-subdued">
                        Select which frontline strike bowler delivers Over 1. Overs quota for {format}: {format === 'T10' ? '2' : format === 'T20' ? '4' : format === 'ODI' ? '10' : 'No Limit'}.
                      </p>

                      {/* Selected Bowler Showcase */}
                      {(() => {
                        const selProf = profiles.get(activeOpeningBowlerId);
                        const selName = selProf?.fullName || selProf?.displayName || 'Selected Bowler';
                        const selImg = getAuthoritativePlayerImage(activeOpeningBowlerId, selName, selProf?.primaryRole, selProf?.primaryNationality);

                        return (
                          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-secondary/10 via-surface-elevated to-surface-card rounded-xl border border-secondary/40 shadow-md">
                            <div className="w-14 h-16 rounded-lg overflow-hidden bg-surface-recessed border border-border-hairline flex-shrink-0">
                              <img src={selImg} alt={selName} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-sm text-text-chalk uppercase truncate">{selName}</span>
                                <span className="px-1.5 py-0.2 rounded bg-secondary/20 text-secondary font-mono text-[9px] uppercase font-bold">
                                  CONFIRMED OVER 1
                                </span>
                              </div>
                              <div className="text-xs text-text-slate mt-0.5">
                                {selProf?.bowlingStyle?.replace(/_/g, ' ') || 'Bowler'} • {selProf?.primaryRole?.replace(/_/g, ' ')}
                              </div>
                              <div className="flex items-center gap-3 mt-1.5 text-[11px] font-mono">
                                <span className="text-secondary font-bold">OVR {typeof selProf?.formatRating === 'number' ? selProf.formatRating : 88}</span>
                                <span className="text-text-subdued">•</span>
                                <span className="text-text-slate">QUOTA: {format === 'T10' ? '2' : format === 'T20' ? '4' : format === 'ODI' ? '10' : '∞'} OV</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Bowler Selection Grid */}
                      <div className="space-y-1.5 mt-1">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-text-subdued px-1">
                          ELIGIBLE BOWLERS IN SQUAD
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
                          {eligibleBowlers.map((slot) => {
                            const prof = profiles.get(slot.playerId);
                            const pName = prof?.fullName || prof?.displayName || 'Player';
                            const isSelected = slot.playerId === activeOpeningBowlerId;
                            const isRecommended = slot.playerId === aiRecommendedBowler.playerId;

                            return (
                              <button
                                key={slot.playerId}
                                type="button"
                                onClick={() => setUserOpeningBowlerId(slot.playerId)}
                                className={`p-2.5 rounded-lg text-left transition border cursor-pointer flex flex-col justify-between ${
                                  isSelected
                                    ? 'bg-secondary/20 border-secondary text-text-chalk shadow-sm ring-1 ring-secondary'
                                    : 'bg-surface-recessed border-border-hairline text-text-slate hover:bg-surface-elevated'
                                }`}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span className="font-bold text-xs truncate">{pName}</span>
                                  {isRecommended && (
                                    <span className="text-[8px] px-1 py-0.2 rounded bg-primary/20 text-primary font-mono font-bold">
                                      AI REC
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-text-subdued truncate mt-1">
                                  {prof?.bowlingStyle?.replace(/_/g, ' ') || prof?.primaryRole?.replace(/_/g, ' ')}
                                </div>
                                <div className="text-[10px] font-mono text-secondary mt-1 font-bold">
                                  RATING: {typeof prof?.formatRating === 'number' ? prof.formatRating : 85}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Pre-Match Opening Field Placement */}
                  <div className="lg:col-span-7 flex flex-col gap-space-md">
                    <div className="bg-surface-card rounded-xl p-space-md shadow-xl border border-border-hairline flex flex-col gap-3">
                      <div className="flex items-center justify-between pb-2 border-b border-border-hairline">
                        <div className="flex items-center gap-1.5">
                          <Shield className="w-5 h-5 text-primary" />
                          <div>
                            <h2 className="text-sm font-extrabold text-text-chalk uppercase tracking-wider font-headline-md">
                              OPENING FIELD CONFIGURATION (POWERPLAY)
                            </h2>
                            <p className="text-xs text-text-subdued">
                              Drag fielders or choose a tactical preset before the first ball.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase border ${
                            isFieldValid ? 'bg-primary/20 text-primary border-primary/40' : 'bg-wicket-red/20 text-wicket-red border-wicket-red/40'
                          }`}>
                            {isFieldValid ? 'FIELD LEGAL' : 'ILLEGAL FIELD'}
                          </span>
                        </div>
                      </div>

                      {/* Interactive Field Editor Component */}
                      <InteractiveFieldEditor
                        currentPreset={userField}
                        fielders={customFielders}
                        isUserBowling={true}
                        onPresetSelect={(p) => {
                          setUserField(p);
                          if (CANONICAL_FIELD_PRESETS[p]) {
                            setCustomFielders(
                              CANONICAL_FIELD_PRESETS[p].positions.map((pos, idx) => ({
                                id: `fielder-${idx + 1}`,
                                name: pos.role,
                                role: pos.role,
                                angleDeg: pos.angleDeg,
                                distM: pos.distM,
                                isBoundary: pos.isBoundary,
                              }))
                            );
                          }
                        }}
                        onFielderMove={(fielderId, newAngleDeg, newDistM) => {
                          setUserField('CUSTOM');
                          setCustomFielders((prev) =>
                            prev.map((f) =>
                              f.id === fielderId
                                ? {
                                    ...f,
                                    angleDeg: newAngleDeg,
                                    distM: newDistM,
                                    isBoundary: newDistM > 55,
                                  }
                                : f
                            )
                          );
                        }}
                        onResetPreset={() => {
                          setUserField('BALANCED_RING');
                          setCustomFielders(
                            CANONICAL_FIELD_PRESETS.BALANCED_RING.positions.map((pos, idx) => ({
                              id: `fielder-${idx + 1}`,
                              name: pos.role,
                              role: pos.role,
                              angleDeg: pos.angleDeg,
                              distM: pos.distM,
                              isBoundary: pos.isBoundary,
                            }))
                          );
                        }}
                      />

                      {/* Real-time Field Legal Status Alert */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono mt-1">
                        <div className={`p-2 rounded-lg border ${
                          isPowerplayValid ? 'bg-surface-recessed border-border-hairline text-text-slate' : 'bg-wicket-red/10 border-wicket-red/40 text-wicket-red font-bold'
                        }`}>
                          POWERPLAY CIRCLE: {currentOutsideCircle}/{maxOutsideCircle} OUTSIDE 30-YD
                        </div>
                        <div className={`p-2 rounded-lg border ${
                          isLaw28Valid ? 'bg-surface-recessed border-border-hairline text-text-slate' : 'bg-wicket-red/10 border-wicket-red/40 text-wicket-red font-bold'
                        }`}>
                          MCC LAW 28.4: {legSideCount}/5 LEG-SIDE • {behindSquareLegCount}/2 BEHIND POPPING CREASE
                        </div>
                      </div>
                      {!isFieldValid && (
                        <div className="p-2.5 rounded-lg bg-wicket-red/15 border border-wicket-red/40 text-wicket-red text-xs flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                          <span>
                            Field violates playing conditions! Fix fielder positions or choose a preset before simulation can start.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Mandatory START SIMULATION Footer Dock */}
            <div className="w-full bg-surface-card rounded-xl p-space-md shadow-2xl border border-border-hairline flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
              <div className="flex flex-col">
                <span className="text-xs font-mono text-text-subdued uppercase">
                  MATCH READY STATUS: {isReadyToStart ? 'VALIDATED • READY' : 'CONFIGURATION REQUIRED'}
                </span>
                <span className="text-sm font-bold text-text-chalk">
                  {isUserBowlingFirst
                    ? `Opening Bowler: ${profiles.get(activeOpeningBowlerId)?.fullName || 'Selected'} • Field: ${userField}`
                    : `Opening Pair: #${activeLineup[0]?.battingOrder} ${profiles.get(activeLineup[0]?.playerId)?.fullName || 'Striker'} & #${activeLineup[1]?.battingOrder} ${profiles.get(activeLineup[1]?.playerId)?.fullName || 'Non-Striker'}`
                  }
                </span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setPhase('TOSS')}
                  className="px-4 py-3 rounded-xl bg-surface-elevated hover:bg-surface-bright text-text-slate hover:text-text-chalk text-xs font-label-caps uppercase transition border border-border-hairline cursor-pointer"
                >
                  ← RETURN TO TOSS
                </button>
                <button
                  type="button"
                  disabled={!isReadyToStart}
                  onClick={handleStartMatch}
                  className={`flex-1 sm:flex-none px-8 py-3.5 rounded-xl font-headline-md text-title-md font-extrabold uppercase tracking-wider transition shadow-xl flex items-center justify-center gap-2 ${
                    isReadyToStart
                      ? 'bg-primary hover:bg-primary-container text-on-primary shadow-[0_4px_24px_rgba(120,220,119,0.35)] cursor-pointer hover:scale-[1.01]'
                      : 'bg-surface-recessed text-text-subdued border border-border-hairline cursor-not-allowed opacity-50'
                  }`}
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>START SIMULATION</span>
                </button>
              </div>
            </div>
          </main>
        );
      })()}

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
                      {currentEvent.runsBat + currentEvent.extras.wides + currentEvent.extras.noBalls + currentEvent.extras.byes + currentEvent.extras.legByes} run(s) scored on this delivery. {currentEvent.dismissal ? `Dismissal: ${currentEvent.dismissal.mode}` : ''}
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
                    currentFieldPreset={userField}
                    customFieldPositions={customFielders.map((f) => {
                      const rad = ((f.angleDeg - 90) * Math.PI) / 180;
                      return {
                        id: f.id,
                        name: f.role,
                        role: f.role,
                        x: Math.cos(rad) * f.distM,
                        y: 8.84 - Math.sin(rad) * f.distM,
                        isBoundary: f.isBoundary,
                        angleDeg: f.angleDeg,
                        distM: f.distM,
                      };
                    })}
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
              {/* Tactical Status Tag */}
              <div className="bg-surface-elevated rounded-xl p-3 border border-border-hairline shadow-md flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${isUserBatting ? 'bg-primary animate-pulse' : 'bg-primary'}`} />
                  <span className="font-label-caps text-xs font-extrabold uppercase tracking-wider text-text-chalk">
                    {isUserBatting ? 'BATTING CONTROLS' : 'BOWLING CONTROLS'}
                  </span>
                </div>
                <span className="font-label-caps text-[10px] text-text-subdued px-2 py-0.5 rounded bg-surface-recessed border border-border-hairline uppercase">
                  {isUserBatting ? 'OPPONENT BOWLING' : 'OPPONENT BATTING'}
                </span>
              </div>

              {/* USER BATTING CONTROLS (Shown only when user is batting) */}
              {isUserBatting ? (
                <div className="bg-surface-card rounded-xl p-space-md shadow-lg border border-border-hairline flex flex-col gap-space-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-label-caps text-label-caps text-primary uppercase font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">sports_baseball</span>
                      BATTER SHOT INTENT
                    </span>
                    <span className="font-label-caps text-[10px] text-text-subdued uppercase">DIRECT CONTROL</span>
                  </div>
                  {pendingBatterDecision && (
                    <div className="rounded-lg border border-primary/50 bg-primary/10 p-3 flex flex-col gap-2">
                      <div>
                        <p className="text-xs font-bold text-text-chalk">Wicket down — choose the next batter</p>
                        <p className="text-[10px] text-text-subdued">Select who takes {pendingBatterDecision.replacesAt === 'STRIKER' ? 'strike' : 'the non-striker’s end'} before play resumes.</p>
                      </div>
                      <select
                        value={selectedNextBatterId}
                        onChange={(event) => setSelectedNextBatterId(event.target.value)}
                        className="bg-surface-card border border-border-hairline rounded px-2 py-2 text-xs text-text-chalk"
                        aria-label="Select incoming batter"
                      >
                        <option value="">Choose a batter</option>
                        {availableIncomingBatters.map((slot) => (
                          <option key={slot.playerId} value={slot.playerId}>
                            #{slot.battingOrder} {getPlayerDisplayName(slot.playerId)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={!selectedNextBatterId}
                        onClick={handleConfirmIncomingBatter}
                        className="rounded bg-primary px-3 py-2 text-xs font-bold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        SEND BATTER IN
                      </button>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'DEFEND', label: 'DEFENSIVE', icon: 'shield', desc: 'Solid Block' },
                      { id: 'ROTATE_STRIKE', label: 'ROTATE', icon: 'sync', desc: 'Singles & Twos' },
                      { id: 'AGGRESSIVE', label: 'ATTACK', icon: 'sports_baseball', desc: 'Boundary Hunt' },
                      { id: 'MAXIMUM_POWER', label: 'CARNAGE', icon: 'bolt', desc: 'Six Or Out' },
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
                          <span className="text-[9px] font-normal lowercase opacity-75">{m.desc}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* CPU Bowler Plan (Read-Only Information) */}
                  <div className="mt-2 p-2.5 rounded-lg bg-surface-recessed border border-border-hairline flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[10px] font-label-caps text-text-subdued uppercase">
                      <span>BOWLER STRATEGY</span>
                      <span className="text-primary font-bold">ACTIVE</span>
                    </div>
                    <div className="text-xs text-text-chalk flex items-center gap-1 font-mono">
                      <span className="text-text-slate">{bowlerName}:</span>
                      <span className="text-tertiary">Attacking Corridor • Yorker Guard</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* USER BOWLING CONTROLS (Shown when user is bowling) */
                <div className="bg-surface-card rounded-xl p-space-md shadow-lg border border-border-hairline flex flex-col gap-space-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-label-caps text-label-caps text-primary uppercase font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">sports_cricket</span>
                      BOWLING MANAGEMENT
                    </span>
                    <span className="font-label-caps text-[10px] text-text-subdued uppercase">TACTICS</span>
                  </div>

                  <div className="rounded-lg bg-surface-recessed border border-border-hairline p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-text-chalk">Bowling plan</p>
                        <p className="text-[10px] text-text-subdued">{activeBowlingPhase?.label ?? 'Choose a plan'} · affects the next delivery</p>
                      </div>
                      <select
                        value={managementMode}
                        onChange={(e) => setManagementMode(e.target.value as 'MANUAL' | 'ASSISTED' | 'AUTOMATIC')}
                        className="bg-surface-card border border-border-hairline text-text-slate rounded px-2 py-1 text-[10px]"
                        aria-label="Bowling management mode"
                      >
                        <option value="ASSISTED">Assisted</option>
                        <option value="MANUAL">Manual</option>
                        <option value="AUTOMATIC">Automatic</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {([
                        ['ATTACK', 'Take wickets'],
                        ['BALANCED', 'Control'],
                        ['DEFENSIVE', 'Protect runs'],
                      ] as const).map(([id, description]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setUserBowlingPlan(id)}
                          className={`rounded-md border px-2 py-2 text-left transition ${userBowlingPlan === id ? 'border-primary bg-primary/15 text-primary' : 'border-border-hairline bg-surface-card text-text-slate hover:text-text-chalk'}`}
                        >
                          <span className="block text-[10px] font-bold uppercase">{id}</span>
                          <span className="block text-[9px] normal-case opacity-80">{description}</span>
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAdvancedTactics((value) => !value)}
                      className="self-start text-[10px] font-bold uppercase tracking-wide text-text-subdued hover:text-text-chalk"
                    >
                      {showAdvancedTactics ? '▾ Hide advanced tactics' : '▸ Advanced tactics'}
                    </button>
                  </div>

                  {/* Bowler Selection / Change */}
                  {userBowlingSlots.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-label-caps text-text-subdued uppercase">
                        SELECT BOWLER FOR NEXT OVER
                      </label>
                      <select
                        value={userNominatedBowlerId || bowlerId || ''}
                        onChange={(e) => setUserNominatedBowlerId(e.target.value)}
                        className="bg-surface-recessed border border-border-hairline text-text-chalk p-1.5 rounded text-[11px] font-label-caps focus:outline-none cursor-pointer"
                      >
                        {userBowlingSlots.map((slot) => {
                          const profile = simulationResult?.finalState.config.playerProfiles.get(slot.playerId);
                          const bEntry = activeInnings?.bowlers.get(slot.playerId);
                          const oversBowled = bEntry ? Math.floor(bEntry.ballsBowled / 6) : 0;
                          const isCurrent = slot.playerId === bowlerId;
                          const quotaReached = displayedQuota !== undefined && oversBowled >= displayedQuota;
                          return (
                            <option
                              key={slot.playerId}
                              value={slot.playerId}
                              disabled={isCurrent && (activeInnings?.legalBallsInCurrentOver === 0 && (activeInnings?.completedOvers || 0) > 0)}
                            >
                              {profile?.displayName || slot.playerId} ({oversBowled}/{displayedQuota ?? '∞'} ov{quotaReached ? ' - MAX' : ''}{isCurrent ? ' - ACTIVE' : ''})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}

                  {showAdvancedTactics && <>
                  {/* Bowling Pace & Intensity Strategy */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-label-caps text-text-subdued uppercase">
                      DELIVERY PACE & TEMPO
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { id: 'FULL_PACE', label: 'FULL PACE' },
                        { id: 'CONTROLLED', label: 'CONTROLLED' },
                        { id: 'EFFORT_BALL', label: 'EFFORT BALL' },
                        { id: 'VARIATION_FOCUS', label: 'VARIATION' },
                        { id: 'CONSERVE', label: 'CONSERVE' },
                      ].map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setUserPaceStrategy(p.id as BowlingPaceStrategy)}
                          className={`py-1 rounded text-[10px] font-label-caps uppercase transition border cursor-pointer ${
                            userPaceStrategy === p.id
                              ? 'bg-telemetry-blue text-on-surface border-telemetry-blue font-bold shadow-sm'
                              : 'bg-surface-recessed text-text-slate border-border-hairline hover:bg-surface-elevated'
                          }`}
                          type="button"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bowling Tactical Intent */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-label-caps text-text-subdued uppercase">
                      BOWLING INTENT
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { id: 'ATTACKING', label: 'ATTACKING' },
                        { id: 'CONTAINMENT', label: 'CONTAIN' },
                        { id: 'WICKET_TAKING', label: 'WICKET' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setUserBowlingIntent(m.id as BowlingIntent)}
                          className={`py-1 rounded text-[10px] font-label-caps uppercase transition border cursor-pointer ${
                            userBowlingIntent === m.id
                              ? 'bg-secondary text-on-secondary border-secondary font-bold shadow-sm'
                              : 'bg-surface-recessed text-text-slate border-border-hairline hover:bg-surface-elevated'
                          }`}
                          type="button"
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Line, Length & Variation */}
                  <div className="grid grid-cols-2 gap-2 text-body-sm pt-1">
                    <div>
                      <label className="text-[10px] font-label-caps text-text-subdued uppercase block mb-0.5">LENGTH</label>
                      <select
                        value={userLength}
                        onChange={(e) => setUserLength(e.target.value as BowlingLength)}
                        className="w-full bg-surface-recessed border border-border-hairline text-text-chalk p-1.5 rounded text-[11px] font-label-caps focus:outline-none cursor-pointer"
                      >
                        <option value="GOOD_LENGTH">Good Length</option>
                        <option value="FULL">Full Pitch</option>
                        <option value="YORKER">Toe-Crushing Yorker</option>
                        <option value="BACK_OF_LENGTH">Back of Length</option>
                        <option value="SHORT">Short / Bouncer</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-label-caps text-text-subdued uppercase block mb-0.5">LINE</label>
                      <select
                        value={userLine}
                        onChange={(e) => setUserLine(e.target.value as BowlingLine)}
                        className="w-full bg-surface-recessed border border-border-hairline text-text-chalk p-1.5 rounded text-[11px] font-label-caps focus:outline-none cursor-pointer"
                      >
                        <option value="OUTSIDE_OFF">Corridor / Outside Off</option>
                        <option value="STUMPS">Attacking Stumps</option>
                        <option value="DOWN_LEG">Down Leg Side</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-body-sm">
                    <div>
                      <label className="text-[10px] font-label-caps text-text-subdued uppercase block mb-0.5">
                        VARIATION {currentActiveBowler ? (currentActiveBowlerIsSpin ? '(SPIN)' : '(PACE)') : ''}
                      </label>
                      <select
                        value={userVariation}
                        onChange={(e) => setUserVariation(e.target.value as BowlingVariation)}
                        className="w-full bg-surface-recessed border border-border-hairline text-text-chalk p-1.5 rounded text-[11px] font-label-caps focus:outline-none cursor-pointer"
                      >
                        <option value="STOCK">Stock Delivery</option>
                        {currentActiveBowlerIsSpin ? (
                          <>
                            <option value="GOOGLY">Googly / Wrong-Un</option>
                            <option value="ARM_BALL">Arm Ball / Drifter</option>
                            <option value="FLIPPER">Flipper / Top-Spinner</option>
                          </>
                        ) : (
                          <>
                            <option value="SLOWER_BALL">Deceptive Slower Ball</option>
                            <option value="CUTTER">Off/Leg Cutter</option>
                            <option value="BOUNCER">Bouncer / Short Ball</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-label-caps text-text-subdued uppercase block mb-0.5">FIELDING PRESET</label>
                      <select
                        value={userField}
                        onChange={(e) => {
                          const newPreset = e.target.value as FieldPreset;
                          setUserField(newPreset);
                          if (newPreset !== 'CUSTOM' && CANONICAL_FIELD_PRESETS[newPreset]) {
                            setCustomFielders(
                              CANONICAL_FIELD_PRESETS[newPreset].positions.map((pos, idx) => ({
                                id: `fielder-${idx + 1}`,
                                name: pos.role,
                                role: pos.role,
                                angleDeg: pos.angleDeg,
                                distM: pos.distM,
                                isBoundary: pos.isBoundary,
                              })),
                            );
                          }
                        }}
                        className="w-full bg-surface-recessed border border-border-hairline text-text-chalk p-1.5 rounded text-[11px] font-label-caps focus:outline-none cursor-pointer"
                      >
                        <option value="BALANCED_RING">Balanced Ring</option>
                        <option value="ATTACKING_CLOSE_CATCHERS">Close Catchers</option>
                        <option value="DEATH_BOUNDARY_DEFENSE">Boundary Defense</option>
                        <option value="SPIN_CHOKE">Spin Choke</option>
                        <option value="CUSTOM">Custom Placement</option>
                      </select>
                    </div>
                  </div>
                  </>}

                  {/* CPU Batter Plan (Read-Only Information) */}
                  <div className="mt-1 p-2 rounded-lg bg-surface-recessed border border-border-hairline flex flex-col gap-0.5">
                    <div className="flex items-center justify-between text-[10px] font-label-caps text-text-subdued uppercase">
                      <span>CPU OPPONENT BATTING INTENT</span>
                      <span className="text-primary font-bold">AUTONOMOUS</span>
                    </div>
                    <div className="text-xs text-text-chalk flex items-center gap-1 font-mono">
                      <span className="text-text-slate">{strikerName}:</span>
                      <span className="text-tertiary">Balanced Stance • Reading Field Preset</span>
                    </div>
                  </div>

                  {/* Interactive Manual Field Placement Editor */}
                  <div className="mt-2">
                    <InteractiveFieldEditor
                      currentPreset={userField}
                      fielders={customFielders}
                      isUserBowling={isUserBowling}
                      onPresetSelect={(p) => {
                        setUserField(p);
                        if (CANONICAL_FIELD_PRESETS[p]) {
                          setCustomFielders(
                            CANONICAL_FIELD_PRESETS[p].positions.map((pos, idx) => ({
                              id: `fielder-${idx + 1}`,
                              name: pos.role,
                              role: pos.role,
                              angleDeg: pos.angleDeg,
                              distM: pos.distM,
                              isBoundary: pos.isBoundary,
                            })),
                          );
                        }
                      }}
                      onFielderMove={(fielderId, newAngleDeg, newDistM) => {
                        setUserField('CUSTOM');
                        setCustomFielders((prev) =>
                          prev.map((f) =>
                            f.id === fielderId
                              ? {
                                  ...f,
                                  angleDeg: newAngleDeg,
                                  distM: newDistM,
                                  isBoundary: newDistM >= 55,
                                }
                              : f,
                          ),
                        );
                      }}
                      onResetPreset={() => {
                        setUserField('BALANCED_RING');
                        setCustomFielders(
                          CANONICAL_FIELD_PRESETS.BALANCED_RING.positions.map((pos, idx) => ({
                            id: `fielder-${idx + 1}`,
                            name: pos.role,
                            role: pos.role,
                            angleDeg: pos.angleDeg,
                            distM: pos.distM,
                            isBoundary: pos.isBoundary,
                          })),
                        );
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Big Stepper Button (Disabled on match completion) */}
              <div className="bg-surface-card rounded-xl p-space-md shadow-xl border border-border-hairline flex flex-col gap-space-sm">
                <button
                  onClick={stepToNextDelivery}
                  disabled={phase === 'COMPLETED' || Boolean(pendingBatterDecision)}
                  className={`w-full py-4 rounded-xl font-headline-md text-headline-md font-extrabold uppercase tracking-tight flex items-center justify-center gap-2 transition-all ${
                    phase === 'COMPLETED' || pendingBatterDecision
                      ? 'bg-surface-container text-text-subdued border border-border-hairline cursor-not-allowed opacity-60'
                      : 'bg-primary hover:bg-primary-container text-on-primary shadow-[0_4px_24px_rgba(120,220,119,0.35)] hover:scale-[1.01] cursor-pointer'
                  }`}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[24px]">sports_cricket</span>
                  <span>{pendingBatterDecision ? 'SELECT NEXT BATTER' : isUserBatting ? 'TAKE STRIKE [SPACE]' : 'BOWL NEXT BALL [SPACE]'}</span>
                </button>

                {/* Simulation Steppers Bar (Disabled on match completion) */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <button
                    onClick={handleSimulateOver}
                    disabled={phase === 'COMPLETED'}
                    className={`py-1.5 rounded font-label-caps text-[10px] uppercase font-bold transition border ${
                      phase === 'COMPLETED'
                        ? 'bg-surface-recessed text-text-subdued border-border-hairline cursor-not-allowed opacity-50'
                        : 'bg-surface-elevated hover:bg-surface-bright text-text-slate hover:text-text-chalk border-border-hairline cursor-pointer'
                    }`}
                    type="button"
                  >
                    SIM OVER
                  </button>
                  <button
                    onClick={handleSimulateInnings}
                    disabled={phase === 'COMPLETED'}
                    className={`py-1.5 rounded font-label-caps text-[10px] uppercase font-bold transition border ${
                      phase === 'COMPLETED'
                        ? 'bg-surface-recessed text-text-subdued border-border-hairline cursor-not-allowed opacity-50'
                        : 'bg-surface-elevated hover:bg-surface-bright text-text-slate hover:text-text-chalk border-border-hairline cursor-pointer'
                    }`}
                    type="button"
                  >
                    SIM INNINGS
                  </button>
                  <button
                    onClick={handleInstantResult}
                    disabled={phase === 'COMPLETED'}
                    className={`py-1.5 rounded font-label-caps text-[10px] uppercase font-bold transition border ${
                      phase === 'COMPLETED'
                        ? 'bg-surface-recessed text-text-subdued border-border-hairline cursor-not-allowed opacity-50'
                        : 'bg-surface-elevated hover:bg-surface-bright text-tertiary border-border-hairline cursor-pointer'
                    }`}
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
