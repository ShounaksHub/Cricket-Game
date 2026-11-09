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
  readonly onPlayPauseToggle: () => void;
  readonly onStepNextBall: () => void;
  readonly onSkipOver: () => void;
  readonly onSpeedChange: (speedMs: number) => void;
}

export function CricketVisualizerCanvas({
  matchState,
  activeEvent,
  isPlaying,
  playSpeed,
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

  // Compute Recent Deliveries Strip (last 6 balls)
  const recentEvents = currentInnings?.events.slice(-6) ?? [];

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case 'SIX':
        return 'bg-purple-600 text-white font-black';
      case 'FOUR':
        return 'bg-emerald-600 text-white font-bold';
      case 'WICKET':
        return 'bg-red-600 text-white font-black animate-pulse';
      case 'WIDE':
      case 'NO_BALL':
        return 'bg-amber-600 text-white font-semibold';
      case 'DOT':
        return 'bg-gray-800 text-gray-400';
      default:
        return 'bg-blue-600 text-white font-semibold';
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
      className="relative w-full h-[580px] bg-[#030d07] rounded-xl overflow-hidden border border-emerald-950/60 shadow-2xl flex flex-col justify-between"
    >
      {/* 1. PixiJS WebGL 2D Render Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block"
        style={{ touchAction: 'none' }}
      />

      {/* 2. Top-Bar Broadcast HUD (Match Context & Environmental Metadata) */}
      <div className="relative z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-none">
        <div className="flex items-center space-x-3 pointer-events-auto">
          <div className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/40 rounded text-emerald-400 font-mono text-xs uppercase tracking-wider font-semibold flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span>LIVE PIXI 2D BROADCAST</span>
          </div>
          <div className="text-xs text-gray-400 font-medium">
            {matchState.config.stadiumId.replace('stadium-', '').toUpperCase()} •{' '}
            {matchState.config.pitchType} PITCH
          </div>
        </div>

        {/* Free Hit Alert Banner */}
        {currentInnings?.isFreeHit && (
          <div className="px-3 py-1 bg-amber-500/30 border border-amber-400 rounded-full text-amber-300 font-bold text-xs uppercase tracking-widest flex items-center space-x-1.5 animate-bounce">
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>FREE HIT IN PLAY</span>
          </div>
        )}

        {/* Playback Speed Controls */}
        <div className="flex items-center space-x-1 bg-gray-900/80 backdrop-blur border border-gray-800 rounded-lg p-1 pointer-events-auto">
          {[
            { label: '0.5x', speed: 600 },
            { label: '1.0x', speed: 300 },
            { label: '2.0x', speed: 150 },
            { label: '4.0x', speed: 60 },
          ].map((s) => (
            <button
              key={s.label}
              onClick={() => onSpeedChange(s.speed)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold transition ${
                playSpeed === s.speed
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Bottom Broadcast Lower-Third Banner (Television Grade Overlay) */}
      <div className="relative z-10 p-4 bg-gradient-to-t from-black/95 via-black/80 to-transparent">
        {/* Main Scorecard Lower-Third Bar */}
        <div className="bg-gray-950/90 backdrop-blur-md border border-gray-800/80 rounded-lg p-3 shadow-xl grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Batting Team Total & Over */}
          <div className="md:col-span-3 border-r border-gray-800/80 pr-3">
            <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">
              {currentInnings?.inningsNumber === 1
                ? matchState.config.team1.name
                : matchState.config.team2.name}
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-black text-white font-mono tracking-tight">
                {currentInnings?.totalRuns ?? 0}/{currentInnings?.totalWickets ?? 0}
              </span>
              <span className="text-sm font-mono text-gray-400">
                ({currentInnings?.completedOvers ?? 0}.
                {currentInnings?.legalBallsInCurrentOver ?? 0} ov)
              </span>
            </div>
            <div className="text-[11px] text-gray-400 font-mono mt-0.5">
              CRR: <span className="text-emerald-400 font-bold">{currentRunRate}</span>
              {currentInnings?.targetRuns && (
                <span className="ml-2">
                  Target: <span className="text-white font-bold">{currentInnings.targetRuns}</span>
                  {requiredRunRate && (
                    <span className="ml-2">
                      RRR: <span className="text-amber-400 font-bold">{requiredRunRate}</span>
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Active Batters Figures */}
          <div className="md:col-span-4 border-r border-gray-800/80 px-2 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-1.5 font-semibold text-white">
                <span className="text-emerald-400 font-bold">▶</span>
                <span className="truncate max-w-[130px]">
                  {strikerProfile?.displayName ?? 'Striker'}*
                </span>
              </div>
              <div className="font-mono text-gray-300">
                <span className="font-bold text-white">{strikerScore?.runs ?? 0}</span>
                <span className="text-gray-500 text-[11px]">
                  ({strikerScore?.ballsFaced ?? 0}b, {strikerScore?.fours ?? 0}x4,{' '}
                  {strikerScore?.sixes ?? 0}x6)
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <div className="truncate max-w-[130px]">
                {nonStrikerProfile?.displayName ?? 'Non-Striker'}
              </div>
              <div className="font-mono text-gray-400">
                <span>{nonStrikerScore?.runs ?? 0}</span>
                <span className="text-gray-500 text-[11px]">
                  ({nonStrikerScore?.ballsFaced ?? 0}b)
                </span>
              </div>
            </div>
          </div>

          {/* Active Bowler Figures */}
          <div className="md:col-span-3 border-r border-gray-800/80 px-2">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              BOWLING
            </div>
            <div className="flex items-center justify-between text-xs font-semibold text-white mt-0.5">
              <span className="truncate max-w-[120px]">
                {bowlerProfile?.displayName ?? 'Bowler'}
              </span>
              <span className="font-mono text-amber-400 font-bold">
                {bowlerScore?.wickets ?? 0}-{bowlerScore?.runsConceded ?? 0}
              </span>
            </div>
            <div className="text-[11px] text-gray-400 font-mono mt-0.5">
              Overs: {bowlerScore?.oversBowledFormatted ?? '0.0'} • Econ:{' '}
              {bowlerScore?.economyRate.toFixed(2) ?? '0.00'}
            </div>
          </div>

          {/* Playback Action Buttons */}
          <div className="md:col-span-2 flex items-center justify-end space-x-1.5 pl-2">
            <button
              onClick={onPlayPauseToggle}
              className={`p-2 rounded-lg font-bold transition flex items-center justify-center ${
                isPlaying
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
              }`}
              title={isPlaying ? 'Pause Simulation' : 'Play Live Simulation'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <button
              onClick={onStepNextBall}
              disabled={isPlaying}
              className="p-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-200 rounded-lg transition"
              title="Step Next Ball"
            >
              <SkipForward className="w-4 h-4" />
            </button>
            <button
              onClick={onSkipOver}
              className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg transition"
              title="Fast Forward to End of Over"
            >
              <FastForward className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Recent Deliveries Ball-by-Ball Strip */}
        <div className="flex items-center justify-between mt-2 px-1">
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mr-1">
              THIS OVER:
            </span>
            {recentEvents.length === 0 ? (
              <span className="text-xs text-gray-600 italic">Over starting...</span>
            ) : (
              recentEvents.map((ev, i) => (
                <span
                  key={`${ev.sequenceNumber}-${i}`}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono shadow ${getOutcomeBadge(
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
            <div className="text-xs text-gray-300 font-mono truncate max-w-md">
              {activeEvent.commentary}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
