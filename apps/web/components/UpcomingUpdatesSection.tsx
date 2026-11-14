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
    <section id="upcoming-roadmap" className="w-full py-12 border-t border-[#D8C9B5] bg-warm-paper relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F5EBDD] border border-[#D8C9B5] text-[#2D545E] text-xs font-mono uppercase tracking-wider mb-2">
              <span className="w-2 h-2 rounded-full bg-[#C89666] animate-pulse" />
              Public Engineering Roadmap
            </div>
            <h2 className="text-2xl sm:text-3xl font-editorial-title font-bold text-[#12343B] tracking-tight">
              Upcoming Features &amp; Updates
            </h2>
            <p className="text-sm text-[#687477] mt-1 max-w-2xl">
              We value complete transparency. Below is our verified feature status: core simulation and local Dream XI builder are fully operational offline today, while these major enhancements are actively planned or in development.
            </p>
          </div>
          <div className="text-xs font-mono text-[#687477] flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#C89666]" /> In Development
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#2D545E]" /> Coming Soon
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
                className="bg-[#FBF8F2] rounded-xl border border-[#D8C9B5] p-6 flex flex-col justify-between hover:border-[#C89666]/70 transition-all shadow-sm"
              >
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl p-2 rounded-xl bg-[#F5EBDD] border border-[#D8C9B5]">
                      {meta.icon}
                    </span>
                    <div>
                      <h3 className="text-base font-editorial-title font-bold text-[#12343B] tracking-tight">
                        {meta.label}
                      </h3>
                      <p className="text-xs text-[#687477]">
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
                          className="w-full text-left p-3.5 rounded-xl bg-[#F5EBDD] border border-[#D8C9B5] hover:border-[#C89666] hover:bg-[#FBF8F2] transition-all group flex items-start justify-between gap-3 cursor-pointer"
                        >
                          <div className="space-y-1 pr-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-[#12343B] group-hover:text-[#2D545E] transition-colors">
                                {feature.name}
                              </span>
                            </div>
                            <p className="text-xs text-[#687477] line-clamp-2 leading-relaxed">
                              {feature.shortDescription}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0 pt-0.5">
                            <span
                              className={`text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border whitespace-nowrap ${
                                isDev
                                  ? 'bg-[#FBF8F2] text-[#C89666] border-[#C89666]/40'
                                  : 'bg-[#FBF8F2] text-[#2D545E] border-[#2D545E]/40 font-bold'
                              }`}
                            >
                              {isDev ? 'In Dev' : 'Coming Soon'}
                            </span>
                            <span className="text-[10px] text-[#C89666] group-hover:text-[#2D545E] transition-colors font-medium">
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
