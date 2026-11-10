'use client';

import React, { useState } from 'react';
import type {
  DreamTeamPlayerSlotInput,
  PlayerSquadContext,
  MatchFormat,
} from '@cricket/shared-types';
import { getAuthoritativePlayerImage } from '@/lib/player-image-resolver';

export interface PreInningsManagementModalProps {
  isOpen: boolean;
  type: 'BATTING_ORDER' | 'OPENING_BOWLER';
  teamName: string;
  format: MatchFormat;
  lineup: DreamTeamPlayerSlotInput[];
  profiles: Map<string, PlayerSquadContext>;
  onConfirmBattingOrder: (updatedLineup: DreamTeamPlayerSlotInput[]) => void;
  onConfirmOpeningBowler: (openingBowlerPlayerId: string) => void;
  onDelegateToAI: () => void;
}

export function PreInningsManagementModal({
  isOpen,
  type,
  teamName,
  format,
  lineup,
  profiles,
  onConfirmBattingOrder,
  onConfirmOpeningBowler,
  onDelegateToAI,
}: PreInningsManagementModalProps) {
  if (!isOpen) return null;

  const isBatting = type === 'BATTING_ORDER';

  // Local state for batting order reordering
  const [currentLineup, setCurrentLineup] = useState<DreamTeamPlayerSlotInput[]>(lineup);

  // Local state for selected opening bowler
  const defaultBowler =
    lineup.find((s) => s.bowlingPriority === 1)?.playerId ||
    lineup.slice(-5)[0]?.playerId ||
    lineup[0]?.playerId;
  const [selectedBowlerId, setSelectedBowlerId] = useState<string>(defaultBowler);

  function moveSlot(currentIndex: number, targetIndex: number) {
    if (targetIndex < 0 || targetIndex >= currentLineup.length) return;
    const next = [...currentLineup];
    const item = next.splice(currentIndex, 1)[0];
    next.splice(targetIndex, 0, item);
    // Re-index batting order 1..11
    const reindexed = next.map((slot, idx) => ({
      ...slot,
      battingOrder: idx + 1,
    }));
    setCurrentLineup(reindexed);
  }

  function getRatingNumber(formatRating: any): number {
    if (!formatRating) return 85;
    if (typeof formatRating === 'number') return formatRating;
    if (typeof formatRating === 'object' && typeof formatRating.overallRating === 'number') {
      return formatRating.overallRating;
    }
    return 85;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in"
    >
      <div className="bg-[#0b1410] border border-emerald-500/30 rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh]">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4 border-b border-emerald-950/60 pb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                {isBatting ? '🏏 PRE-INNINGS BATTING STRATEGY' : '⚾ PRE-INNINGS BOWLING ATTACK'}
              </span>
              <span className="text-xs text-neutral-400 font-mono">
                {format.replace(/_/g, ' ')} • {teamName}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-white tracking-tight">
              {isBatting ? 'Configure Batting Order & Openers' : 'Select Opening Bowler'}
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              {isBatting
                ? 'Set your opening pair (#1 and #2) and adjust the batting sequence before the first ball is bowled.'
                : 'Nominate which frontline bowler will deliver the inaugural over of the match.'}
            </p>
          </div>

          <button
            onClick={onDelegateToAI}
            className="text-xs text-neutral-400 hover:text-emerald-400 flex items-center gap-1.5 font-mono uppercase bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 hover:border-emerald-500/30 transition-all shrink-0 cursor-pointer"
            title="Accept computer recommended strategy"
          >
            <span>🤖 Delegate to AI</span>
          </button>
        </div>

        {/* Content Area */}
        {isBatting ? (
          /* BATTING ORDER MANAGEMENT */
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-2">
            <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>POSITION & PLAYER DETAILS</span>
              <span>REORDER CONTROLS</span>
            </div>

            {currentLineup.map((slot, idx) => {
              const player = profiles.get(slot.playerId);
              if (!player) return null;

              const isOpener = idx < 2;
              const portrait = getAuthoritativePlayerImage(
                player.id,
                player.fullName || player.displayName,
                player.primaryRole,
                player.primaryNationality,
              );

              return (
                <div
                  key={player.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                    isOpener
                      ? 'bg-emerald-950/25 border-emerald-500/40 shadow-md'
                      : 'bg-black/30 border-white/5 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-scoreboard-md text-xs font-bold shrink-0 ${
                        isOpener
                          ? 'bg-emerald-500 text-black shadow-sm'
                          : 'bg-neutral-800 text-neutral-300'
                      }`}
                    >
                      {idx + 1}
                    </span>

                    <img
                      src={portrait}
                      alt={player.displayName}
                      className="w-10 h-10 rounded-lg object-cover bg-neutral-800 border border-white/10 shrink-0"
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white truncate">
                          {player.displayName}
                        </span>
                        {isOpener && (
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            Opener #{idx + 1}
                          </span>
                        )}
                        {slot.isCaptain && (
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            (C) Captain
                          </span>
                        )}
                        {slot.isDesignatedWicketkeeper && (
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
                            (WK) Keeper
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-neutral-400 mt-0.5 flex items-center gap-2">
                        <span>{player.primaryRole.replace(/_/g, ' ')}</span>
                        <span>•</span>
                        <span>{player.battingHand.replace(/_/g, ' ')}</span>
                        <span>•</span>
                        <span className="font-mono text-emerald-400 font-semibold">
                          OVR {getRatingNumber(player.formatRating)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Move Up / Down Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveSlot(idx, idx - 1)}
                      className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-20 text-neutral-300 hover:text-white transition-colors cursor-pointer disabled:cursor-not-allowed"
                      title="Promote Batting Position"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      disabled={idx === currentLineup.length - 1}
                      onClick={() => moveSlot(idx, idx + 1)}
                      className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-20 text-neutral-300 hover:text-white transition-colors cursor-pointer disabled:cursor-not-allowed"
                      title="Demote Batting Position"
                    >
                      ▼
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* OPENING BOWLER SELECTION */
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-2">
            <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider mb-2">
              SELECT STARTING BOWLER FOR OVER 1
            </div>

            {lineup.map((slot) => {
              const player = profiles.get(slot.playerId);
              if (!player) return null;

              const isSelected = selectedBowlerId === player.id;
              const portrait = getAuthoritativePlayerImage(
                player.id,
                player.fullName || player.displayName,
                player.primaryRole,
                player.primaryNationality,
              );

              return (
                <button
                  key={player.id}
                  onClick={() => setSelectedBowlerId(player.id)}
                  className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-emerald-950/40 border-emerald-400 shadow-xl ring-1 ring-emerald-400/50 cursor-pointer'
                      : 'bg-black/30 border-white/5 hover:border-emerald-500/30 hover:bg-white/5 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={portrait}
                      alt={player.displayName}
                      className="w-12 h-12 rounded-xl object-cover bg-neutral-800 border border-white/10 shrink-0"
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white truncate">
                          {player.displayName}
                        </span>
                        {slot.bowlingPriority === 1 && (
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            Primary Strike Bowler
                          </span>
                        )}
                        {slot.isDesignatedWicketkeeper && (
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-neutral-700 text-neutral-300 border border-neutral-600">
                            Keeper (Part-time)
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-neutral-400 mt-1 flex items-center gap-2">
                        <span>{player.bowlingStyle.replace(/_/g, ' ')}</span>
                        <span>•</span>
                        <span>{player.primaryRole.replace(/_/g, ' ')}</span>
                        <span>•</span>
                        <span className="font-mono text-emerald-400 font-semibold">
                          OVR {getRatingNumber(player.formatRating)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? 'border-emerald-400 bg-emerald-500 text-black'
                          : 'border-neutral-600 bg-transparent'
                      }`}
                    >
                      {isSelected && <span className="text-xs font-black">✓</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-emerald-950/60 flex items-center justify-between gap-3">
          <div className="text-[11px] text-neutral-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Tactical readiness verified</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onDelegateToAI}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold uppercase tracking-wider rounded-xl transition-all border border-neutral-700 hover:text-white cursor-pointer"
            >
              Use AI Suggestion
            </button>
            <button
              onClick={() => {
                if (isBatting) {
                  onConfirmBattingOrder(currentLineup);
                } else {
                  onConfirmOpeningBowler(selectedBowlerId);
                }
              }}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-headline-md text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              Confirm & Start Match →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
