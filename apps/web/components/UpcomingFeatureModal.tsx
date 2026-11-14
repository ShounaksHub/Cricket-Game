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
    ? 'bg-[#F5EBDD] text-[#C89666] border-[#C89666]/40'
    : 'bg-[#2D545E] text-[#FBF8F2] border-[#2D545E] font-bold';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upcoming-feature-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#12343B]/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#FBF8F2] border border-[#D8C9B5] rounded-2xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${badgeClasses}`}
              >
                {badgeText}
              </span>
              <span className="text-xs text-[#687477] font-mono">
                {feature.releaseTarget}
              </span>
            </div>
            <h3 id="upcoming-feature-title" className="text-xl font-editorial-title font-bold text-[#12343B] tracking-tight">
              {feature.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-[#687477] hover:text-[#12343B] p-1 rounded-lg hover:bg-[#F5EBDD] transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 text-sm text-[#243238]">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#687477] mb-1 font-mono">
              Overview
            </div>
            <p className="leading-relaxed bg-[#F5EBDD] p-3 rounded-lg border border-[#D8C9B5] text-[#12343B]">
              {feature.shortDescription}
            </p>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#2D545E] mb-1 font-mono">
              Implementation Roadmap
            </div>
            <p className="leading-relaxed text-xs text-[#687477] bg-[#F5EBDD] p-3 rounded-lg border border-[#D8C9B5]">
              {feature.detailedRoadmap}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-[#F5EBDD] border border-[#D8C9B5] text-xs text-[#687477] flex items-center gap-2">
            <span className="text-base">🔒</span>
            <span>
              All current match, player, and team builder systems remain 100% playable offline right now.
            </span>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-[#2D545E] hover:bg-[#12343B] text-[#FBF8F2] font-semibold text-xs tracking-wider uppercase rounded-xl transition-all shadow-sm cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
