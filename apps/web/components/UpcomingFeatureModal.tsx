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
  const badgeClasses = isDev ? 'badge-warning' : 'badge-primary';
  const badgeText = isDev ? 'IN DEVELOPMENT' : 'COMING SOON';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upcoming-feature-title"
      className="modal modal-open z-50 bg-black/80 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="modal-box max-w-lg w-full p-6 shadow-2xl relative overflow-hidden bg-base-100 border border-base-300 rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-4 border-b border-base-300 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`badge badge-sm uppercase font-mono font-bold ${badgeClasses}`}>
                {badgeText}
              </span>
              <span className="text-xs opacity-70 font-mono">
                {feature.releaseTarget}
              </span>
            </div>
            <h3 id="upcoming-feature-title" className="text-xl font-editorial-title font-bold text-base-content tracking-tight">
              {feature.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="btn btn-ghost btn-circle btn-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 text-sm text-base-content/85">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1 font-mono">
              Overview
            </div>
            <p className="leading-relaxed bg-base-200/60 p-3 rounded-lg border border-base-300 text-base-content">
              {feature.shortDescription}
            </p>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-1 font-mono">
              Implementation Roadmap
            </div>
            <p className="leading-relaxed text-xs opacity-80 bg-base-200/40 p-3 rounded-lg border border-base-300">
              {feature.detailedRoadmap}
            </p>
          </div>

          <div className="alert alert-info text-xs flex items-center gap-2">
            <span className="text-base">🔒</span>
            <span>
              All current match, player, and team builder systems remain 100% playable offline right now.
            </span>
          </div>
        </div>

        <div className="modal-action mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="btn btn-primary btn-sm text-xs tracking-wider uppercase"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
