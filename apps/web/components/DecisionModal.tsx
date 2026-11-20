'use client';

import React, { useEffect, useRef } from 'react';
import type { PlayerSquadContext } from '@cricket/shared-types';
import { getAuthoritativePlayerImage, getRealisticFallback } from '@/lib/player-image-resolver';

export interface DecisionModalProps {
  isOpen: boolean;
  type: 'NEXT_BATTER' | 'NEXT_BOWLER';
  title: string;
  subtitle: string;
  options: {
    player: PlayerSquadContext;
    secondaryInfo: string;
    badge?: string;
    isRecommended?: boolean;
    disabled?: boolean;
    disabledReason?: string;
  }[];
  onSelectPlayer: (playerId: string) => void;
  onDelegateToAI: () => void;
  aiButtonLabel?: string;
}

export function DecisionModal({
  isOpen,
  type,
  title,
  subtitle,
  options,
  onSelectPlayer,
  onDelegateToAI,
  aiButtonLabel = 'Let AI Choose (Auto-Manage)',
}: DecisionModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
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

  const isBatting = type === 'NEXT_BATTER';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="decision-modal-title"
      tabIndex={-1}
      ref={dialogRef}
      className="modal modal-open z-50 bg-black/80 backdrop-blur-xs"
    >
      <div className="modal-box max-w-2xl w-full p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] bg-base-100 border border-base-300 rounded-2xl">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 mb-4 border-b border-base-300 pb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge badge-primary badge-outline text-[10px] uppercase font-bold tracking-wider font-mono">
                {isBatting ? '🏏 TACTICAL BATTING DECISION' : '⚾ BOWLING CHANGE REQUIRED'}
              </span>
              <span className="text-xs opacity-70 font-mono">
                {isBatting ? 'Wicket Fallen' : 'Over Completed'}
              </span>
            </div>
            <h3 id="decision-modal-title" className="text-xl font-editorial-title font-bold text-base-content tracking-tight">{title}</h3>
            <p className="text-xs opacity-75 mt-0.5">{subtitle}</p>
          </div>
          <button
            onClick={onDelegateToAI}
            className="btn btn-neutral btn-xs gap-1 font-mono uppercase"
            title="Delegate this decision to CPU Captain"
          >
            <span>Auto (AI)</span>
          </button>
        </div>

        {/* Options List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-2">
          {options.length === 0 ? (
            <div className="p-8 text-center text-xs opacity-60">
              No eligible players remaining.
            </div>
          ) : (
            options.map(({ player, secondaryInfo, badge, isRecommended, disabled, disabledReason }) => {
              const portrait = getAuthoritativePlayerImage(
                player.id,
                player.fullName || player.displayName,
                player.primaryRole,
                player.primaryNationality,
              );

              return (
                <button
                  key={player.id}
                  disabled={disabled}
                  onClick={() => onSelectPlayer(player.id)}
                  className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-3 ${
                    disabled
                      ? 'opacity-40 bg-base-200 border-base-300 cursor-not-allowed'
                      : isRecommended
                        ? 'bg-base-200 border-2 border-primary hover:bg-base-300/50 cursor-pointer shadow-sm'
                        : 'bg-base-200/50 border-base-300 hover:border-primary/50 hover:bg-base-200 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
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
                        {isRecommended && (
                          <span className="badge badge-primary badge-xs font-mono uppercase font-bold">
                            Recommended
                          </span>
                        )}
                        {badge && (
                          <span className="badge badge-secondary badge-outline badge-xs font-mono uppercase font-bold">
                            {badge}
                          </span>
                        )}
                      </div>
                      <div className="text-xs opacity-75 mt-0.5 truncate">
                        {secondaryInfo}
                      </div>
                      {disabledReason && (
                        <div className="text-[10px] text-error font-mono mt-0.5">
                          {disabledReason}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <span className="btn btn-primary btn-xs text-xs font-mono font-semibold">
                      {isBatting ? 'Send In →' : 'Bowl Over →'}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-action m-0 mt-4 pt-3 border-t border-base-300 flex items-center justify-between gap-3">
          <div className="text-[11px] opacity-70 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
            <span>Simulation paused until selection</span>
          </div>

          <button
            onClick={onDelegateToAI}
            className="btn btn-primary btn-sm text-xs font-semibold uppercase tracking-wider"
          >
            {aiButtonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
