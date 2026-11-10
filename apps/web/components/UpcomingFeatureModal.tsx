'use client';

import React from 'react';
import { PlannedFeature } from '@/lib/feature-registry';

interface UpcomingFeatureModalProps {
  feature: PlannedFeature | null;
  isOpen: boolean;
  onClose: () => void;
}

export function UpcomingFeatureModal({ feature, isOpen, onClose }: UpcomingFeatureModalProps) {
  if (!isOpen || !feature) return null;

  const isDev = feature.status === 'IN_DEVELOPMENT';
  const badgeText = isDev ? 'IN DEVELOPMENT' : 'COMING SOON';
  const badgeClasses = isDev
    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upcoming-feature-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#0b1410] border border-emerald-500/20 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${badgeClasses}`}
              >
                {badgeText}
              </span>
              <span className="text-xs text-neutral-400 font-mono">
                {feature.releaseTarget}
              </span>
            </div>
            <h3 id="upcoming-feature-title" className="text-xl font-bold text-white tracking-tight">
              {feature.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 text-sm text-neutral-300">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
              Overview
            </div>
            <p className="leading-relaxed bg-black/30 p-3 rounded-lg border border-white/5">
              {feature.shortDescription}
            </p>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1">
              Implementation Roadmap
            </div>
            <p className="leading-relaxed text-xs text-neutral-400 bg-emerald-950/20 p-3 rounded-lg border border-emerald-500/10">
              {feature.detailedRoadmap}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800 text-xs text-neutral-400 flex items-center gap-2">
            <span className="text-base">🔒</span>
            <span>
              All current match, player, and team builder systems remain 100% playable offline right now.
            </span>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs tracking-wider uppercase rounded-xl transition-all shadow-lg shadow-emerald-500/20"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
