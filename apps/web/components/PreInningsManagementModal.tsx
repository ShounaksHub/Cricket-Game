'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { MatchFormat, PlayerSquadContext } from '@cricket/shared-types';
import type { FormattedSquadSlot } from '@/lib/national-teams';
import { getAuthoritativePlayerImage, getRealisticFallback } from '@/lib/player-image-resolver';

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
      className="modal modal-open z-50 bg-black/80 backdrop-blur-xs"
    >
      <div className="modal-box max-w-3xl w-full p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh] bg-base-100 border border-base-300 rounded-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4 border-b border-base-300 pb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge badge-primary badge-outline text-[10px] uppercase font-bold tracking-wider font-mono">
                {isBatting ? '🏏 PRE-INNINGS BATTING STRATEGY' : '⚾ PRE-INNINGS BOWLING ATTACK'}
              </span>
              <span className="text-xs opacity-70 font-mono">
                {format.replace(/_/g, ' ')} • {teamName}
              </span>
            </div>
            <h3 className="text-2xl font-editorial-title font-bold text-base-content tracking-tight">
              {isBatting ? 'Choose your opening pair' : 'Choose your opening bowler'}
            </h3>
            <p className="text-xs opacity-75 mt-0.5">
              {isBatting
                ? 'Choose who starts at the striker’s end and who starts at the non-striker’s end. You can still adjust the rest of the order.'
                : 'Choose who bowls the first over.'}
            </p>
          </div>

          <button
            onClick={onDelegateToAI}
            className="btn btn-neutral btn-xs gap-1.5 font-mono uppercase"
            title="Accept computer recommended strategy"
          >
            <span>Delegate to AI</span>
          </button>
        </div>

        {/* Content Area */}
        {isBatting ? (
          /* BATTING ORDER MANAGEMENT */
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-2">
            <div className="text-[11px] font-mono opacity-70 uppercase tracking-wider mb-2 flex items-center justify-between">
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
                      ? 'bg-base-200 border-2 border-primary shadow-xs'
                      : 'bg-base-200/50 border-base-300 hover:bg-base-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-scoreboard-md text-xs font-bold shrink-0 ${
                        isOpener
                          ? 'bg-primary text-primary-content shadow-xs'
                          : 'bg-base-300 text-base-content'
                      }`}
                    >
                      {idx + 1}
                    </span>

                    <div className="avatar">
                      <div className="w-10 h-10 rounded-lg border border-base-300">
                        <img
                          src={portrait}
                          alt={player.displayName}
                          className="object-cover"
                          onError={(e) => {
                            e.currentTarget.src = getRealisticFallback(
                              player.primaryRole,
                              player.primaryNationality,
                              player.id
                            );
                          }}
                        />
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-base-content truncate">
                          {player.displayName}
                        </span>
                        {isOpener && (
                          <span className="badge badge-primary badge-xs font-mono uppercase font-bold">
                            Opener #{idx + 1}
                          </span>
                        )}
                        {slot.isCaptain && (
                          <span className="badge badge-secondary badge-outline badge-xs font-mono uppercase font-bold">
                            (C) Captain
                          </span>
                        )}
                        {slot.isDesignatedWicketkeeper && (
                          <span className="badge badge-neutral badge-xs font-mono uppercase font-bold">
                            (WK) Keeper
                          </span>
                        )}
                      </div>

                      <div className="text-xs opacity-75 mt-0.5 flex items-center gap-2">
                        <span>{player.primaryRole.replace(/_/g, ' ')}</span>
                        <span>•</span>
                        <span>{player.battingHand.replace(/_/g, ' ')}</span>
                        <span>•</span>
                        <span className="font-mono text-primary font-semibold">
                          OVR {getRatingNumber(player.formatRating)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Move Up / Down Buttons */}
                  <div className="join shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveSlot(idx, idx - 1)}
                      className="btn btn-sm btn-outline join-item px-2 disabled:opacity-20"
                      title="Promote Batting Position"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      disabled={idx === currentLineup.length - 1}
                      onClick={() => moveSlot(idx, idx + 1)}
                      className="btn btn-sm btn-outline join-item px-2 disabled:opacity-20"
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
            <div className="text-[11px] font-mono opacity-70 uppercase tracking-wider mb-2">
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
                      ? 'bg-base-200 border-2 border-primary shadow-xs cursor-pointer'
                      : 'bg-base-200/50 border-base-300 hover:border-primary/50 hover:bg-base-200 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="avatar">
                      <div className="w-12 h-12 rounded-xl border border-base-300">
                        <img
                          src={portrait}
                          alt={player.displayName}
                          className="object-cover"
                          onError={(e) => {
                            e.currentTarget.src = getRealisticFallback(
                              player.primaryRole,
                              player.primaryNationality,
                              player.id
                            );
                          }}
                        />
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-base-content truncate">
                          {player.displayName}
                        </span>
                        {slot.bowlingPriority === 1 && (
                          <span className="badge badge-primary badge-xs font-mono uppercase font-bold">
                            Primary Strike Bowler
                          </span>
                        )}
                        {slot.isDesignatedWicketkeeper && (
                          <span className="badge badge-ghost badge-xs font-mono uppercase">
                            Keeper (Part-time)
                          </span>
                        )}
                      </div>

                      <div className="text-xs opacity-75 mt-1 flex items-center gap-2">
                        <span>{player.bowlingStyle.replace(/_/g, ' ')}</span>
                        <span>•</span>
                        <span>{player.primaryRole.replace(/_/g, ' ')}</span>
                        <span>•</span>
                        <span className="font-mono text-primary font-semibold">
                          OVR {getRatingNumber(player.formatRating)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <input
                      type="radio"
                      name="opening-bowler"
                      checked={isSelected}
                      onChange={() => setSelectedBowlerId(player.id)}
                      className="radio radio-primary radio-sm"
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="modal-action m-0 mt-4 pt-3 border-t border-base-300 flex items-center justify-between gap-3">
          <div className="text-[11px] opacity-70 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span>Tactical readiness verified</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onDelegateToAI}
              className="btn btn-neutral btn-sm text-xs uppercase"
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
              className="btn btn-primary btn-sm font-editorial-title text-xs font-extrabold uppercase tracking-wider"
            >
              Confirm &amp; Start Match →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
