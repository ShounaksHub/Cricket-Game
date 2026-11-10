'use client';

import React, { useState } from 'react';
import { Shield, RotateCcw, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import type { FieldPreset, CustomFielderPosition } from '@cricket/simulation-engine';

export interface InteractiveFielder {
  id: string;
  name: string;
  role: string;
  angleDeg: number; // 0 to 360 relative to striker (0 = straight down ground, 90 = point/off-side, 180 = fine-leg/third-man, 270 = square-leg/on-side)
  distM: number;    // distance in meters from striker (0 to 75m)
  isBoundary: boolean;
}

export interface InteractiveFieldEditorProps {
  currentPreset: FieldPreset;
  fielders: InteractiveFielder[];
  isUserBowling: boolean;
  onPresetSelect: (preset: FieldPreset) => void;
  onFielderMove: (fielderId: string, newAngleDeg: number, newDistM: number) => void;
  onResetPreset: () => void;
}

export const CANONICAL_FIELD_PRESETS: Record<FieldPreset, { label: string; desc: string; positions: { role: string; angleDeg: number; distM: number; isBoundary: boolean }[] }> = {
  ATTACKING_CLOSE_CATCHERS: {
    label: 'Attacking Catchers',
    desc: '3 slips, gully, short leg. High wicket-taking probability with slip carry.',
    positions: [
      { role: 'Slip 1', angleDeg: 160, distM: 14, isBoundary: false },
      { role: 'Slip 2', angleDeg: 150, distM: 16, isBoundary: false },
      { role: 'Gully', angleDeg: 130, distM: 18, isBoundary: false },
      { role: 'Cover', angleDeg: 60, distM: 25, isBoundary: false },
      { role: 'Mid Off', angleDeg: 25, distM: 26, isBoundary: false },
      { role: 'Mid On', angleDeg: 335, distM: 26, isBoundary: false },
      { role: 'Short Leg', angleDeg: 215, distM: 12, isBoundary: false },
      { role: 'Deep Fine Leg', angleDeg: 225, distM: 65, isBoundary: true },
      { role: 'Deep Mid Wicket', angleDeg: 300, distM: 65, isBoundary: true },
    ],
  },
  BALANCED_RING: {
    label: 'Balanced Ring',
    desc: 'Ring field choking singles with 3 outfield sweepers protecting boundaries.',
    positions: [
      { role: 'Point', angleDeg: 90, distM: 25, isBoundary: false },
      { role: 'Cover', angleDeg: 55, distM: 26, isBoundary: false },
      { role: 'Mid Off', angleDeg: 20, distM: 27, isBoundary: false },
      { role: 'Mid On', angleDeg: 340, distM: 27, isBoundary: false },
      { role: 'Mid Wicket', angleDeg: 305, distM: 25, isBoundary: false },
      { role: 'Square Leg', angleDeg: 270, distM: 24, isBoundary: false },
      { role: 'Deep Cover', angleDeg: 65, distM: 65, isBoundary: true },
      { role: 'Long On', angleDeg: 345, distM: 68, isBoundary: true },
      { role: 'Deep Square Leg', angleDeg: 255, distM: 64, isBoundary: true },
    ],
  },
  DEATH_BOUNDARY_DEFENSE: {
    label: 'Boundary Defense',
    desc: '5 boundary riders covering yorkers and lofted shots in death overs.',
    positions: [
      { role: 'Deep Point', angleDeg: 120, distM: 64, isBoundary: true },
      { role: 'Deep Cover', angleDeg: 65, distM: 65, isBoundary: true },
      { role: 'Long Off', angleDeg: 20, distM: 68, isBoundary: true },
      { role: 'Long On', angleDeg: 340, distM: 68, isBoundary: true },
      { role: 'Deep Mid Wicket', angleDeg: 295, distM: 66, isBoundary: true },
      { role: 'Short Third', angleDeg: 145, distM: 24, isBoundary: false },
      { role: 'Extra Cover', angleDeg: 45, distM: 26, isBoundary: false },
      { role: 'Mid Wicket', angleDeg: 315, distM: 25, isBoundary: false },
      { role: 'Short Fine Leg', angleDeg: 215, distM: 22, isBoundary: false },
    ],
  },
  SPIN_CHOKE: {
    label: 'Spin Choke',
    desc: 'Tight inner ring suffocating strike rotation with slip and bat-pad pressure.',
    positions: [
      { role: 'Slip', angleDeg: 155, distM: 14, isBoundary: false },
      { role: 'Backward Point', angleDeg: 105, distM: 22, isBoundary: false },
      { role: 'Cover Point', angleDeg: 75, distM: 24, isBoundary: false },
      { role: 'Extra Cover', angleDeg: 40, distM: 25, isBoundary: false },
      { role: 'Mid On', angleDeg: 335, distM: 26, isBoundary: false },
      { role: 'Short Mid Wicket', angleDeg: 310, distM: 20, isBoundary: false },
      { role: 'Square Leg', angleDeg: 265, distM: 24, isBoundary: false },
      { role: 'Long Off', angleDeg: 20, distM: 66, isBoundary: true },
      { role: 'Deep Mid Wicket', angleDeg: 295, distM: 66, isBoundary: true },
    ],
  },
  CUSTOM: {
    label: 'Custom Arrangement',
    desc: 'Bespoke tactical field arrangement tailored to bowler and batter matchup.',
    positions: [],
  },
};

export function InteractiveFieldEditor({
  currentPreset,
  fielders,
  isUserBowling,
  onPresetSelect,
  onFielderMove,
  onResetPreset,
}: InteractiveFieldEditorProps) {
  const [selectedFielderId, setSelectedFielderId] = useState<string | null>(null);

  // MCC Law 28.4 Validation: Maximum 5 leg-side fielders; maximum 2 behind popping crease
  const legSideFielders = fielders.filter((f) => f.angleDeg > 180 && f.angleDeg < 360).length;
  const behindSquareLegFielders = fielders.filter((f) => f.angleDeg >= 180 && f.angleDeg <= 270).length;
  const isLaw28Valid = legSideFielders <= 5 && behindSquareLegFielders <= 2;

  const selectedFielder = fielders.find((f) => f.id === selectedFielderId);

  return (
    <div className="bg-surface-card rounded-xl p-3 border border-border-hairline shadow-md flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-primary" />
          <span className="font-label-caps text-xs font-bold text-text-chalk uppercase">
            TACTICAL FIELD EDITOR
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/20 text-primary font-mono font-bold">
            {currentPreset}
          </span>
        </div>
        {isUserBowling && (
          <button
            onClick={onResetPreset}
            className="flex items-center gap-1 text-[10px] font-label-caps text-text-subdued hover:text-text-chalk px-2 py-0.5 rounded bg-surface-recessed border border-border-hairline transition cursor-pointer"
            type="button"
          >
            <RotateCcw className="w-3 h-3" />
            <span>RESET PRESET</span>
          </button>
        )}
      </div>

      {/* Preset Selector */}
      {isUserBowling && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {(['BALANCED_RING', 'ATTACKING_CLOSE_CATCHERS', 'DEATH_BOUNDARY_DEFENSE', 'SPIN_CHOKE'] as FieldPreset[]).map(
            (p) => {
              const info = CANONICAL_FIELD_PRESETS[p];
              const active = currentPreset === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPresetSelect(p)}
                  className={`p-1.5 rounded-lg text-left transition border cursor-pointer ${
                    active
                      ? 'bg-primary/20 border-primary text-text-chalk font-bold shadow-sm'
                      : 'bg-surface-recessed border-border-hairline text-text-slate hover:bg-surface-elevated'
                  }`}
                >
                  <div className="text-[10px] font-label-caps uppercase truncate">{info.label}</div>
                  <div className="text-[8px] text-text-subdued truncate">{info.desc.slice(0, 24)}...</div>
                </button>
              );
            },
          )}
        </div>
      )}

      {/* Interactive 2D Field Radar Canvas */}
      <div className="relative w-full aspect-square max-w-[340px] mx-auto bg-surface-recessed rounded-xl border border-border-hairline overflow-hidden p-2 flex items-center justify-center">
        {/* SVG Field Representation */}
        <svg
          viewBox="-80 -80 160 160"
          className="w-full h-full"
          onClick={(e) => {
            if (!isUserBowling || !selectedFielderId) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;
            const normX = (clickX / rect.width) * 160 - 80;
            const normY = (clickY / rect.height) * 160 - 80;

            // Convert Cartesian (x, y) relative to pitch to polar (angleDeg, distM)
            const distM = Math.min(74, Math.max(10, Math.sqrt(normX * normX + normY * normY)));
            let angleRad = Math.atan2(normX, -normY); // 0 at top (straight)
            if (angleRad < 0) angleRad += 2 * Math.PI;
            const angleDeg = Math.round((angleRad * 180) / Math.PI);

            onFielderMove(selectedFielderId, angleDeg, Math.round(distM));
          }}
        >
          {/* Boundary Rope */}
          <circle cx="0" cy="0" r="74" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.4" />
          {/* 30-Yard Circle */}
          <circle cx="0" cy="0" r="28" fill="none" stroke="#ffffff" strokeWidth="1" strokeDasharray="2 2" opacity="0.3" />
          {/* Pitch Strip */}
          <rect x="-3" y="-10" width="6" height="20" fill="#d9b382" rx="1" opacity="0.8" />
          {/* Striker Point */}
          <circle cx="0" cy="8" r="2" fill="#ef4444" />
          {/* Bowler Point */}
          <circle cx="0" cy="-8" r="2" fill="#3b82f6" />

          {/* 9 Fielders */}
          {fielders.map((f) => {
            const rad = ((f.angleDeg - 90) * Math.PI) / 180;
            const cx = Math.cos(rad) * f.distM;
            const cy = 8 - Math.sin(rad) * f.distM;
            const isSelected = f.id === selectedFielderId;

            return (
              <g
                key={f.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isUserBowling) {
                    setSelectedFielderId(isSelected ? null : f.id);
                  }
                }}
                className={isUserBowling ? 'cursor-pointer hover:opacity-100' : ''}
              >
                {/* Glow ring if selected */}
                {isSelected && (
                  <circle cx={cx} cy={cy} r="6.5" fill="none" stroke="#00e676" strokeWidth="1.8" className="animate-pulse" />
                )}
                <circle cx={cx} cy={cy} r="3.8" fill={isSelected ? '#00e676' : '#f59e0b'} stroke="#ffffff" strokeWidth="0.8" />
                <text
                  x={cx}
                  y={cy - 5}
                  fontSize="4.5"
                  fill="#ffffff"
                  textAnchor="middle"
                  className="font-mono select-none pointer-events-none"
                  fontWeight="bold"
                >
                  {f.role.slice(0, 6)}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Selected Fielder Status Badge */}
        {selectedFielder && isUserBowling && (
          <div className="absolute top-2 left-2 right-2 bg-surface-card/90 backdrop-blur-sm p-1.5 rounded-lg border border-primary/40 flex items-center justify-between text-[10px] font-mono text-text-chalk">
            <div>
              <span className="text-primary font-bold">{selectedFielder.role}:</span>{' '}
              <span>{selectedFielder.distM}m • {selectedFielder.angleDeg}°</span>
            </div>
            <span className="text-[9px] text-primary underline animate-pulse">
              CLICK PITCH TO REPOSITION
            </span>
          </div>
        )}
      </div>

      {/* MCC Law 28.4 Compliance Indicator */}
      <div className={`p-2 rounded-lg border flex items-center justify-between text-[10px] font-label-caps ${
        isLaw28Valid ? 'bg-primary/10 border-primary/30 text-text-chalk' : 'bg-destructive/20 border-destructive text-destructive font-bold'
      }`}>
        <div className="flex items-center gap-1.5">
          {isLaw28Valid ? (
            <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />
          )}
          <span>
            MCC LAW 28.4: {legSideFielders}/5 ON-SIDE • {behindSquareLegFielders}/2 BEHIND POPPING CREASE
          </span>
        </div>
        <span className="text-[9px] font-mono uppercase">
          {isLaw28Valid ? 'LEGAL FIELD' : 'ILLEGAL FIELD'}
        </span>
      </div>
    </div>
  );
}
