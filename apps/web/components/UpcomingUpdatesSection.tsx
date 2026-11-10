'use client';

import React, { useState } from 'react';
import {
  getFeaturesByCategory,
  CATEGORY_METADATA,
  PlannedFeature,
  FeatureCategory,
} from '@/lib/feature-registry';
import { UpcomingFeatureModal } from './UpcomingFeatureModal';

export function UpcomingUpdatesSection() {
  const [selectedFeature, setSelectedFeature] = useState<PlannedFeature | null>(null);
  const categorized = getFeaturesByCategory();
  const categories = Object.keys(categorized) as FeatureCategory[];

  return (
    <section id="upcoming-roadmap" className="w-full py-12 border-t border-emerald-950/40 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Public Engineering Roadmap
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Upcoming Features & Updates
            </h2>
            <p className="text-sm text-neutral-400 mt-1 max-w-2xl">
              We value complete transparency. Below is our verified feature status: core simulation and local Dream XI builder are fully operational offline today, while these major enhancements are actively planned or in development.
            </p>
          </div>
          <div className="text-xs font-mono text-neutral-500 flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> In Development
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Coming Soon
            </span>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categories.map((catKey) => {
            const meta = CATEGORY_METADATA[catKey];
            const features = categorized[catKey];

            return (
              <div
                key={catKey}
                className="bg-[#0b1410]/80 rounded-2xl border border-emerald-900/30 p-6 flex flex-col justify-between hover:border-emerald-800/50 transition-all shadow-lg"
              >
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl p-2 rounded-xl bg-black/40 border border-white/5">
                      {meta.icon}
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-white tracking-tight">
                        {meta.label}
                      </h3>
                      <p className="text-xs text-neutral-400">
                        {meta.description}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 mt-4">
                    {features.map((feature) => {
                      const isDev = feature.status === 'IN_DEVELOPMENT';
                      return (
                        <button
                          key={feature.id}
                          onClick={() => setSelectedFeature(feature)}
                          className="w-full text-left p-3.5 rounded-xl bg-black/30 border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-950/20 transition-all group flex items-start justify-between gap-3"
                        >
                          <div className="space-y-1 pr-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-neutral-200 group-hover:text-emerald-300 transition-colors">
                                {feature.name}
                              </span>
                            </div>
                            <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                              {feature.shortDescription}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0 pt-0.5">
                            <span
                              className={`text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border whitespace-nowrap ${
                                isDev
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              }`}
                            >
                              {isDev ? 'In Dev' : 'Coming Soon'}
                            </span>
                            <span className="text-[10px] text-neutral-500 group-hover:text-emerald-400 transition-colors">
                              Roadmap &rarr;
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info Modal */}
      <UpcomingFeatureModal
        feature={selectedFeature}
        isOpen={!!selectedFeature}
        onClose={() => setSelectedFeature(null)}
      />
    </section>
  );
}
