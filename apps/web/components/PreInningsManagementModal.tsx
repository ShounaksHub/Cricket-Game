'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { MatchFormat, PlayerSquadContext } from '@cricket/shared-types';
import type { FormattedSquadSlot } from '@/lib/national-teams';
import { getAuthoritativePlayerImage } from '@/lib/player-image-resolver';

export interface PreInningsManagementModalProps {
  isOpen: boolean;
  type: 'BATTING' | 'BOWLING';
  format: MatchFormat;
  teamName: string;
  lineup: FormattedSquadSlot[];
  profiles: Map<string, PlayerSquadContext>;
  onConfirmBattingOrder: (updatedLineup: FormattedSquadSlot[]) => void;
  onConfirmOpeningBowler: (bowlerId: string) => void;
  onDelegateToAI: () => void;
}

export function PreInningsManagementModal({
  isOpen,
  type,
  format,
  teamName,
  lineup,
  profiles,
  onConfirmBattingOrder,
  onConfirmOpeningBowler,
  onDelegateToAI,
}: PreInningsManagementModalProps) {
  const [currentLineup, setCurrentLineup] = useState<FormattedSquadSlot[]>(lineup);
  const [selectedBowlerId, setSelectedBowlerId] = useState<string>('');
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentLineup(lineup);
    // Find highest priority strike bowler as default selection
    const sortedBowlers = [...lineup]
      .filter((slot) => {
        const p = profiles.get(slot.playerId);
        return p && p.bowlingStyle !== 'NONE';
      })
      .sort((a, b) => (a.bowlingPriority ?? 99) - (b.bowlingPriority ?? 99));

    if (sortedBowlers.length > 0) {
      setSelectedBowlerId(sortedBowlers[0].playerId);
    } else if (lineup.length > 0) {
      setSelectedBowlerId(lineup[lineup.length - 1].playerId);
    }
  }, [lineup, profiles, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onDelegateToAI();
      }
      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), [href], [tabindex="0"]'));
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); previous?.focus(); };
  }, [isOpen, onDelegateToAI]);

  if (!isOpen) return null;

  const isBatting = type === 'BATTING';

  function moveSlot(fromIndex: number, toIndex: number) {
    if (toIndex < 0 || toIndex >= currentLineup.length) return;
    const next = [...currentLineup];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);

    // Re-index batting orders sequentially 1..11
    const reindexed = next.map((slot, idx) => ({
      ...slot,
      battingOrder: idx + 1,
    }));
    setCurrentLineup(reindexed);
  }

  const getRatingNumber = (val: any): number => {
    if (typeof val === 'number') return Math.round(val);
    if (typeof val === 'object' && val !== null && 'overallRating' in val) {
      return Math.round(val.overallRating);
    }
    return 75;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isBatting ? 'Pre-Innings Batting Strategy' : 'Pre-Innings Bowling Attack'}
      tabIndex={-1}
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#12343B]/80 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-[#FBF8F2] border border-[#D8C9B5] rounded-xl max-w-3xl w-full p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4 border-b border-[#D8C9B5] pb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border bg-[#F5EBDD] text-[#2D545E] border-[#2D545E]/30 font-mono">
                {isBatting ? '🏏 PRE-INNINGS BATTING STRATEGY' : '⚾ PRE-INNINGS BOWLING ATTACK'}
              </span>
              <span className="text-xs text-[#687477] font-mono">
                {format.replace(/_/g, ' ')} • {teamName}
              </span>
            </div>
            <h3 className="text-2xl font-editorial-title font-bold text-[#12343B] tracking-tight">
              {isBatting ? 'Choose your opening pair' : 'Choose your opening bowler'}
            </h3>
            <p className="text-xs text-[#687477] mt-0.5">
              {isBatting
                ? 'Choose who starts at the striker’s end and who starts at the non-striker’s end. You can still adjust the rest of the order.'
                : 'Choose who bowls the first over.'}
            </p>
          </div>

          <button
            onClick={onDelegateToAI}
            className="text-xs text-[#687477] hover:text-[#12343B] flex items-center gap-1.5 font-mono uppercase bg-[#F5EBDD] px-3 py-1.5 rounded-lg border border-[#D8C9B5] hover:border-[#C89666] transition-all shrink-0 cursor-pointer"
            title="Accept computer recommended strategy"
          >
            <span>Delegate to AI</span>
          </button>
        </div>

        {/* Content Area */}
        {isBatting ? (
          /* BATTING ORDER MANAGEMENT */
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-2">
            <div className="text-[11px] font-mono text-[#687477] uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>POSITION &amp; PLAYER DETAILS</span>
              <span>BAT ORDER</span>
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
                      ? 'bg-[#F5EBDD] border-2 border-[#C89666] shadow-sm'
                      : 'bg-[#F5EBDD] border-[#D8C9B5] hover:bg-[#FBF8F2]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-scoreboard-md text-xs font-bold shrink-0 ${
                        isOpener
                          ? 'bg-[#2D545E] text-[#FBF8F2] shadow-sm'
                          : 'bg-[#EDE3D2] text-[#12343B]'
                      }`}
                    >
                      {idx + 1}
                    </span>

                    <img
                      src={portrait}
                      alt={player.displayName}
                      className="w-10 h-10 rounded-lg object-cover bg-[#F5EBDD] border border-[#D8C9B5] shrink-0"
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-[#12343B] truncate">
                          {player.displayName}
                        </span>
                        {isOpener && (
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-[#C89666]/20 text-[#C89666] border border-[#C89666]/40 font-bold">
                            Opener #{idx + 1}
                          </span>
                        )}
                        {slot.isCaptain && (
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-[#2D545E]/10 text-[#2D545E] border border-[#2D545E]/30 font-bold">
                            (C) Captain
                          </span>
                        )}
                        {slot.isDesignatedWicketkeeper && (
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-[#2D545E]/10 text-[#2D545E] border border-[#2D545E]/30 font-bold">
                            (WK) Keeper
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-[#687477] mt-0.5 flex items-center gap-2">
                        <span>{player.primaryRole.replace(/_/g, ' ')}</span>
                        <span>•</span>
                        <span>{player.battingHand.replace(/_/g, ' ')}</span>
                        <span>•</span>
                        <span className="font-mono text-[#2D545E] font-semibold">
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
                      className="p-1.5 rounded-lg bg-[#FBF8F2] hover:bg-[#EDE3D2] disabled:opacity-20 text-[#12343B] transition-colors cursor-pointer disabled:cursor-not-allowed border border-[#D8C9B5]"
                      title="Promote Batting Position"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      disabled={idx === currentLineup.length - 1}
                      onClick={() => moveSlot(idx, idx + 1)}
                      className="p-1.5 rounded-lg bg-[#FBF8F2] hover:bg-[#EDE3D2] disabled:opacity-20 text-[#12343B] transition-colors cursor-pointer disabled:cursor-not-allowed border border-[#D8C9B5]"
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
            <div className="text-[11px] font-mono text-[#687477] uppercase tracking-wider mb-2">
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
                      ? 'bg-[#F5EBDD] border-2 border-[#C89666] shadow-sm cursor-pointer'
                      : 'bg-[#F5EBDD] border-[#D8C9B5] hover:border-[#C89666] hover:bg-[#FBF8F2] cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={portrait}
                      alt={player.displayName}
                      className="w-12 h-12 rounded-xl object-cover bg-[#F5EBDD] border border-[#D8C9B5] shrink-0"
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-[#12343B] truncate">
                          {player.displayName}
                        </span>
                        {slot.bowlingPriority === 1 && (
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-[#C89666]/20 text-[#C89666] border border-[#C89666]/40 font-bold">
                            Primary Strike Bowler
                          </span>
                        )}
                        {slot.isDesignatedWicketkeeper && (
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-[#EDE3D2] text-[#687477] border border-[#D8C9B5]">
                            Keeper (Part-time)
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-[#687477] mt-1 flex items-center gap-2">
                        <span>{player.bowlingStyle.replace(/_/g, ' ')}</span>
                        <span>•</span>
                        <span>{player.primaryRole.replace(/_/g, ' ')}</span>
                        <span>•</span>
                        <span className="font-mono text-[#2D545E] font-semibold">
                          OVR {getRatingNumber(player.formatRating)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? 'border-[#C89666] bg-[#E1B382] text-[#12343B]'
                          : 'border-[#D8C9B5] bg-transparent'
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
        <div className="mt-4 pt-3 border-t border-[#D8C9B5] flex items-center justify-between gap-3">
          <div className="text-[11px] text-[#687477] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C89666]" />
            <span>Tactical readiness verified</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onDelegateToAI}
              className="px-4 py-2 bg-[#F5EBDD] hover:bg-[#EDE3D2] text-[#12343B] text-xs font-semibold uppercase tracking-wider rounded-xl transition-all border border-[#D8C9B5] cursor-pointer"
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
              className="px-5 py-2.5 bg-[#2D545E] hover:bg-[#12343B] text-[#FBF8F2] font-editorial-title text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer"
            >
              Confirm &amp; Start Match →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
