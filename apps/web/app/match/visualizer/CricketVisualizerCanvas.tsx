'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  FastForward,
  SkipForward,
  Sparkles,
  Shield,
  Activity,
  Flame,
  Zap,
} from 'lucide-react';
import type {
  DeliveryEvent,
  MatchState,
  InningsState,
  BatterScorecardEntry,
  BowlerScorecardEntry,
  FieldPreset,
} from '@cricket/simulation-engine';
import type { BattingHand, BowlingStyle } from '@cricket/shared-types';
import { PixiCricketVisualizer } from './pixi-cricket-visualizer';
import type { AnimationPhase } from './types';

export interface CricketVisualizerCanvasProps {
  readonly matchState: MatchState;
  readonly activeEvent?: DeliveryEvent | null;
  readonly isPlaying: boolean;
  readonly playSpeed: number; // ms per ball
  readonly customFieldPositions?: any[];
  readonly currentFieldPreset?: FieldPreset;
  readonly onPlayPauseToggle: () => void;
  readonly onStepNextBall: () => void;
  readonly onSkipOver: () => void;
  readonly onSpeedChange: (speedMs: number) => void;
}

const STADIUM_LABELS: Record<string, string> = {
  'stadium-mcg': 'MELBOURNE (MCG)',
  'stadium-wankhede': 'WANKHEDE, MUMBAI',
  'stadium-lords': "LORD'S, LONDON",
  'stadium-eden-gardens': 'EDEN GARDENS, KOLKATA',
  'stadium-chinnaswamy': 'M. CHINNASWAMY, BENGALURU',
  'stadium-scg': 'SYDNEY (SCG)',
  'stadium-ahmedabad': 'NARENDRA MODI STADIUM',
  'stadium-oval': 'THE OVAL, LONDON',
  'stadium-gabba': 'THE GABBA, BRISBANE',
  'stadium-trent-bridge': 'TRENT BRIDGE, NOTTINGHAM',
};

function getStadiumName(stadiumId: string): string {
  if (STADIUM_LABELS[stadiumId]) return STADIUM_LABELS[stadiumId];
  return stadiumId.replace(/^stadium-/, '').replace(/-/g, ' ').toUpperCase();
}

export function CricketVisualizerCanvas({
  matchState,
  activeEvent,
  isPlaying,
  playSpeed,
  customFieldPositions,
  currentFieldPreset,
  onPlayPauseToggle,
  onStepNextBall,
  onSkipOver,
  onSpeedChange,
}: CricketVisualizerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const visualizerRef = useRef<PixiCricketVisualizer | null>(null);

  const [currentPhase, setCurrentPhase] = useState<AnimationPhase>('IDLE');
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  const currentInnings = matchState.innings[matchState.currentInningsIndex];
  const strikerProfile = currentInnings
    ? matchState.config.playerProfiles.get(currentInnings.strikerPlayerId)
    : undefined;
  const nonStrikerProfile = currentInnings
    ? matchState.config.playerProfiles.get(currentInnings.nonStrikerPlayerId)
    : undefined;
  const bowlerProfile = currentInnings
    ? matchState.config.playerProfiles.get(currentInnings.currentBowlerPlayerId)
    : undefined;

  const strikerScore = currentInnings
    ? currentInnings.batters.get(currentInnings.strikerPlayerId)
    : undefined;
  const nonStrikerScore = currentInnings
    ? currentInnings.batters.get(currentInnings.nonStrikerPlayerId)
    : undefined;
  const bowlerScore = currentInnings
    ? currentInnings.bowlers.get(currentInnings.currentBowlerPlayerId)
    : undefined;

  // Initialize PixiJS v8 Application once canvas mounts
  useEffect(() => {
    if (!canvasRef.current || visualizerRef.current) return;

    const visualizer = new PixiCricketVisualizer();
    visualizerRef.current = visualizer;

    const boundaryRadius =
      matchState.config.stadiumId === 'stadium-mcg'
        ? 82
        : matchState.config.stadiumId === 'stadium-chinnaswamy'
          ? 62
          : 70;

    visualizer
      .init({
        canvas: canvasRef.current,
        stadiumId: matchState.config.stadiumId,
        boundaryRadiusMeters: boundaryRadius,
        pitchType: matchState.config.pitchType,
        battingHand: strikerProfile?.battingHand ?? 'RIGHT_HAND',
        bowlingStyle: bowlerProfile?.bowlingStyle ?? 'RIGHT_ARM_FAST',
        fieldPreset: 'BALANCED_RING',
        onPhaseChange: (phase) => setCurrentPhase(phase),
      })
      .then(() => {
        setIsInitialized(true);
      })
      .catch((err) => {
        console.error('Failed to initialize PixiCricketVisualizer:', err);
      });

    const handleResize = () => {
      if (containerRef.current && visualizerRef.current) {
        visualizerRef.current.resize(
          containerRef.current.clientWidth,
          containerRef.current.clientHeight,
        );
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (visualizerRef.current) {
        visualizerRef.current.destroy();
        visualizerRef.current = null;
      }
    };
  }, []);

  // Update speed multiplier when playSpeed changes
  useEffect(() => {
    if (visualizerRef.current) {
      // 300ms => 1x, 150ms => 2x, 75ms => 4x, 600ms => 0.5x
      const multiplier = 300 / Math.max(50, playSpeed);
      visualizerRef.current.setPlaybackSpeed(multiplier);
    }
  }, [playSpeed]);

  // Play animation when activeEvent updates
  useEffect(() => {
    if (visualizerRef.current && activeEvent && isInitialized) {
      visualizerRef.current.playDelivery(activeEvent);
    }
  }, [activeEvent, isInitialized]);

  // Update fielders whenever currentFieldPreset or customFieldPositions changes
  useEffect(() => {
    if (visualizerRef.current && isInitialized) {
      visualizerRef.current.setFieldPreset(
        currentFieldPreset || 'BALANCED_RING',
        customFieldPositions,
      );
    }
  }, [currentFieldPreset, customFieldPositions, isInitialized]);

  // Compute Recent Deliveries Strip (last 6 balls)
  const recentEvents = currentInnings?.events.slice(-6) ?? [];

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case 'SIX':
        return 'bg-[#2D545E] text-[#FBF8F2] font-black border border-[#E1B382]';
      case 'FOUR':
        return 'bg-[#E1B382] text-[#12343B] font-black shadow-sm';
      case 'WICKET':
        return 'bg-[#B33232] text-[#FBF8F2] font-black';
      case 'WIDE':
      case 'NO_BALL':
        return 'bg-[#C89666]/30 text-[#E1B382] border border-[#C89666]/50 font-bold';
      case 'DOT':
        return 'bg-[#12343B] text-[#D8C9B5] border border-[#2D545E]';
      default:
        return 'bg-[#2D545E] text-[#FBF8F2] border border-[#2D545E] font-bold';
    }
  };

  const currentRunRate =
    currentInnings &&
    (currentInnings.completedOvers > 0 || currentInnings.legalBallsInCurrentOver > 0)
      ? (
          (currentInnings.totalRuns /
            (currentInnings.completedOvers * 6 +
              currentInnings.legalBallsInCurrentOver)) *
          6
        ).toFixed(2)
      : '0.00';

  const requiredRunRate =
    currentInnings?.targetRuns && currentInnings.completedOvers < 20
      ? (
          (Math.max(0, currentInnings.targetRuns - currentInnings.totalRuns) /
            Math.max(
              1,
              120 -
                (currentInnings.completedOvers * 6 +
                  currentInnings.legalBallsInCurrentOver),
            )) *
          6
        ).toFixed(2)
      : undefined;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[600px] bg-[#0c1f24] rounded-xl overflow-hidden border border-[#2D545E] shadow-2xl flex flex-col justify-between select-none"
    >
      {/* 1. PixiJS WebGL 2D Render Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block"
        style={{ touchAction: 'none' }}
      />

      {/* 2. Top-Bar Broadcast HUD (Match Context & Environmental Metadata) */}
      <div className="relative z-10 flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-b from-[#12343B]/95 via-[#12343B]/60 to-transparent pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto flex-wrap">
          {/* Live broadcast status badge */}
          <div className="px-2.5 py-1 bg-[#12343B]/90 backdrop-blur-md border border-[#2D545E] rounded-md text-[#FBF8F2] font-mono text-[11px] uppercase tracking-wider font-bold flex items-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#E1B382] inline-block animate-pulse" />
            <span>LIVE MATCH</span>
          </div>

          {/* Match format badge */}
          <span className="px-2 py-1 rounded-md text-[11px] font-mono font-bold bg-[#2D545E] text-[#E1B382] border border-[#C89666]/40">
            {matchState.config.format === 'TEST_PINK_BALL'
              ? `PINK BALL D/N • DAY ${matchState.currentDayNumber ?? 1} S${matchState.currentSessionNumber ?? 1}`
              : matchState.config.format === 'TEST_RED_BALL'
                ? `TEST • DAY ${matchState.currentDayNumber ?? 1} S${matchState.currentSessionNumber ?? 1}`
                : matchState.config.format}
          </span>

          {/* Stadium and pitch */}
          <div className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[#D8C9B5] font-medium bg-[#12343B]/80 backdrop-blur-sm px-2.5 py-1 rounded-md border border-[#2D545E]">
            <span className="text-[#FBF8F2] font-semibold">{getStadiumName(matchState.config.stadiumId)}</span>
            <span className="text-[#C89666]">•</span>
            <span className="uppercase text-[11px] text-[#E1B382] font-mono">{matchState.config.pitchType} PITCH</span>
          </div>
        </div>

        {/* Right HUD: Free Hit + Speed Controls */}
        <div className="flex items-center gap-2 pointer-events-auto shrink-0">
          {/* Free Hit Alert Banner */}
          {currentInnings?.isFreeHit && (
            <div className="px-3 py-1 bg-[#E1B382]/20 backdrop-blur-md border border-[#E1B382] rounded-full text-[#E1B382] font-bold text-[11px] uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-[#E1B382]/20 animate-pulse">
              <Zap className="w-3.5 h-3.5 text-[#E1B382] fill-[#E1B382]" />
              <span>FREE HIT</span>
            </div>
          )}

          {/* Playback Speed Controls */}
          <div className="flex items-center gap-0.5 bg-[#12343B]/90 backdrop-blur-md border border-[#2D545E] rounded-md p-0.5 shadow-sm">
            {[
              { label: '0.5x', speed: 600 },
              { label: '1.0x', speed: 300 },
              { label: '2.0x', speed: 150 },
              { label: '4.0x', speed: 60 },
            ].map((s) => (
              <button
                key={s.label}
                onClick={() => onSpeedChange(s.speed)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition ${
                  playSpeed === s.speed
                    ? 'bg-[#E1B382] text-[#12343B] font-bold shadow-sm'
                    : 'text-[#D8C9B5] hover:text-[#FBF8F2]'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Bottom Television Broadcast Ribbon */}
      <div className="relative z-10 px-3 pb-3 pt-4 bg-gradient-to-t from-[#12343B] via-[#12343B]/80 to-transparent">
        <div className="bg-[#12343B]/95 backdrop-blur-md border border-[#2D545E] rounded-xl p-2.5 shadow-2xl flex flex-col gap-2 text-[#FBF8F2]">
          {/* Main Broadcast Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
            {/* Team & Score (Col 1-4) */}
            <div className="md:col-span-4 flex items-center gap-3 border-b md:border-b-0 md:border-r border-[#2D545E] pb-2 md:pb-0 pr-2">
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-[#E1B382] uppercase tracking-widest truncate font-editorial-title">
                  {currentInnings?.battingTeamId === matchState.config.team1.id
                    ? matchState.config.team1.name
                    : matchState.config.team2.name}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-[#FBF8F2] font-mono tracking-tight">
                    {currentInnings?.totalRuns ?? 0}/{currentInnings?.totalWickets ?? 0}
                  </span>
                  <span className="text-xs font-mono text-[#D8C9B5]">
                    ({currentInnings?.completedOvers ?? 0}.{currentInnings?.legalBallsInCurrentOver ?? 0} ov)
                  </span>
                </div>
              </div>
              <div className="text-[10px] text-[#D8C9B5] font-mono flex flex-col justify-center ml-auto border-l border-[#2D545E] pl-2 shrink-0">
                <span>CRR: <strong className="text-[#E1B382]">{currentRunRate}</strong></span>
                {currentInnings?.targetRuns && (
                  <span>
                    TGT: <strong className="text-[#FBF8F2]">{currentInnings.targetRuns}</strong>
                    {requiredRunRate && (
                      <span className="ml-1 text-[#C89666]">({requiredRunRate})</span>
                    )}
                  </span>
                )}
              </div>
            </div>

            {/* Active Batters (Col 5-7) */}
            <div className="md:col-span-4 flex flex-col justify-center gap-1 border-b md:border-b-0 md:border-r border-[#2D545E] pb-2 md:pb-0 px-2 min-w-0">
              <div className="flex items-center justify-between text-xs min-w-0">
                <div className="flex items-center gap-1 font-semibold text-[#FBF8F2] truncate min-w-0">
                  <span className="text-[#E1B382] text-[10px] font-bold">▶</span>
                  <span className="truncate">{strikerProfile?.displayName ?? 'Striker'}*</span>
                </div>
                <span className="font-mono text-[#D8C9B5] shrink-0 ml-1.5 text-[11px]">
                  <strong className="text-[#FBF8F2]">{strikerScore?.runs ?? 0}</strong>
                  <span className="text-[#D8C9B5]/80 text-[10px]"> ({strikerScore?.ballsFaced ?? 0}b{strikerScore?.fours ? ` ${strikerScore.fours}x4` : ''}{strikerScore?.sixes ? ` ${strikerScore.sixes}x6` : ''})</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#D8C9B5] min-w-0">
                <span className="truncate">{nonStrikerProfile?.displayName ?? 'Non-Striker'}</span>
                <span className="font-mono text-[10px] shrink-0 ml-1.5 text-[#D8C9B5]">
                  {nonStrikerScore?.runs ?? 0} ({nonStrikerScore?.ballsFaced ?? 0}b)
                </span>
              </div>
            </div>

            {/* Active Bowler (Col 8-10) */}
            <div className="md:col-span-3 flex flex-col justify-center border-b md:border-b-0 md:border-r border-[#2D545E] pb-2 md:pb-0 px-2 min-w-0">
              <div className="flex items-center justify-between text-xs font-semibold text-[#FBF8F2] min-w-0">
                <span className="truncate text-[#E1B382] font-bold">
                  {bowlerProfile?.displayName ?? 'Bowler'}
                </span>
                <span className="font-mono text-[#E1B382] font-bold shrink-0 ml-1.5">
                  {bowlerScore?.wickets ?? 0}-{bowlerScore?.runsConceded ?? 0}
                </span>
              </div>
              <div className="text-[10px] text-[#D8C9B5] font-mono mt-0.5">
                {bowlerScore?.oversBowledFormatted ?? '0.0'} ov • Econ: {bowlerScore?.economyRate.toFixed(2) ?? '0.00'}
              </div>
            </div>

            {/* Playback Actions (Col 11-12) */}
            <div className="md:col-span-1 flex items-center justify-end gap-1 pl-1">
              <button
                onClick={onPlayPauseToggle}
                className={`p-2 rounded-lg font-bold transition flex items-center justify-center ${
                  isPlaying
                    ? 'bg-[#C89666] hover:bg-[#E1B382] text-[#12343B] shadow-md'
                    : 'bg-[#E1B382] hover:bg-[#C89666] text-[#12343B] shadow-md shadow-[#E1B382]/20'
                }`}
                title={isPlaying ? 'Pause Simulation' : 'Play Live Simulation'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 fill-[#12343B]" /> : <Play className="w-3.5 h-3.5 fill-[#12343B] ml-0.5" />}
              </button>
              <button
                onClick={onStepNextBall}
                disabled={isPlaying}
                className="p-2 bg-[#2D545E] hover:bg-[#12343B] disabled:opacity-30 text-[#FBF8F2] rounded-lg border border-[#2D545E] transition"
                title="Step Next Ball"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onSkipOver}
                className="p-2 bg-[#2D545E] hover:bg-[#12343B] text-[#FBF8F2] rounded-lg border border-[#2D545E] transition"
                title="Fast Forward to End of Over"
              >
                <FastForward className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Sub-strip: Ball-by-ball Over Sequence & Full Commentary */}
          <div className="flex items-center justify-between gap-3 pt-1.5 border-t border-[#2D545E]/60 px-0.5 text-xs">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-bold text-[#D8C9B5] uppercase tracking-widest mr-0.5">
                THIS OVER:
              </span>
              {recentEvents.length === 0 ? (
                <span className="text-[11px] text-[#D8C9B5] italic font-mono">Over starting...</span>
              ) : (
                recentEvents.map((ev, i) => (
                  <span
                    key={`${ev.sequenceNumber}-${i}`}
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold shadow-sm ${getOutcomeBadge(
                      ev.dismissal ? 'WICKET' : ev.outcome,
                    )}`}
                  >
                    {ev.dismissal
                      ? 'W'
                      : ev.outcome === 'FOUR'
                        ? '4'
                        : ev.outcome === 'SIX'
                          ? '6'
                          : ev.outcome === 'DOT'
                            ? '•'
                            : ev.outcome === 'WIDE'
                              ? 'Wd'
                              : ev.outcome === 'NO_BALL'
                                ? 'Nb'
                                : ev.runsBat}
                  </span>
                ))
              )}
            </div>

            {activeEvent && (
              <div className="text-[11px] text-[#FBF8F2] font-mono truncate flex-1 min-w-0 text-right md:text-left md:pl-2" title={activeEvent.commentary}>
                <span className="text-[#E1B382] font-bold mr-1.5">[{activeEvent.outcome}]</span>
                <span>{activeEvent.commentary}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
