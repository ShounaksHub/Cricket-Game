'use client';

import React, { useEffect, useRef } from 'react';
import type { PlayerSquadContext } from '@cricket/shared-types';
import { getAuthoritativePlayerImage } from '@/lib/player-image-resolver';

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#12343B]/80 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-[#FBF8F2] border border-[#D8C9B5] rounded-xl max-w-2xl w-full p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 mb-4 border-b border-[#D8C9B5] pb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border bg-[#F5EBDD] text-[#2D545E] border-[#2D545E]/30 font-mono">
                {isBatting ? '🏏 TACTICAL BATTING DECISION' : '⚾ BOWLING CHANGE REQUIRED'}
              </span>
              <span className="text-xs text-[#687477] font-mono">
                {isBatting ? 'Wicket Fallen' : 'Over Completed'}
              </span>
            </div>
            <h3 id="decision-modal-title" className="text-xl font-editorial-title font-bold text-[#12343B] tracking-tight">{title}</h3>
            <p className="text-xs text-[#687477] mt-0.5">{subtitle}</p>
          </div>
          <button
            onClick={onDelegateToAI}
            className="text-xs text-[#687477] hover:text-[#12343B] flex items-center gap-1 font-mono uppercase bg-[#F5EBDD] px-2.5 py-1.5 rounded-lg border border-[#D8C9B5] hover:border-[#C89666] transition-all shrink-0 cursor-pointer"
            title="Delegate this decision to CPU Captain"
          >
            <span>Auto (AI)</span>
          </button>
        </div>

        {/* Options List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-2">
          {options.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#687477]">
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
                      ? 'opacity-40 bg-[#EDE3D2] border-[#D8C9B5] cursor-not-allowed'
                      : isRecommended
                      ? 'bg-[#F5EBDD] border-2 border-[#C89666] hover:bg-[#FBF8F2] cursor-pointer shadow-sm'
                      : 'bg-[#F5EBDD] border-[#D8C9B5] hover:border-[#C89666] hover:bg-[#FBF8F2] cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
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
                        {isRecommended && (
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-[#C89666]/20 text-[#C89666] border border-[#C89666]/40 font-bold">
                            Recommended
                          </span>
                        )}
                        {badge && (
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-[#2D545E]/10 text-[#2D545E] border border-[#2D545E]/30 font-bold">
                            {badge}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#687477] mt-0.5 truncate">
                        {secondaryInfo}
                      </div>
                      {disabledReason && (
                        <div className="text-[10px] text-[#B33232] font-mono mt-0.5">
                          {disabledReason}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-[#FBF8F2] bg-[#2D545E] hover:bg-[#12343B] px-2.5 py-1 rounded border border-[#2D545E] transition-colors">
                      {isBatting ? 'Send In →' : 'Bowl Over →'}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="mt-4 pt-3 border-t border-[#D8C9B5] flex items-center justify-between gap-3">
          <div className="text-[11px] text-[#687477] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C89666] animate-pulse" />
            <span>Simulation paused until selection</span>
          </div>

          <button
            onClick={onDelegateToAI}
            className="px-4 py-2 bg-[#2D545E] hover:bg-[#12343B] text-[#FBF8F2] text-xs font-semibold uppercase tracking-wider rounded-xl transition-all border border-[#2D545E] cursor-pointer"
          >
            {aiButtonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
