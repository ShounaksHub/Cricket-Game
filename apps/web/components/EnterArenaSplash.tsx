'use client';

import React, { useState, useEffect } from 'react';
import { useAudio } from '../context/AudioContext';
import { CricketDreamXILogo } from './CricketDreamXILogo';

export function EnterArenaSplash() {
  const { hasEnteredArena, enterArena, currentTrack } = useAudio();
  const [mounted, setMounted] = useState(false);
  const [isEntering, setIsEntering] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || hasEnteredArena) {
    return null;
  }

  async function handleEnter() {
    setIsEntering(true);
    try {
      await enterArena();
    } finally {
      // Allow smooth fade-out animation
      setTimeout(() => {
        // hasEnteredArena will trigger unmount
      }, 500);
    }
  }

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-2xl transition-all duration-700 ${
        isEntering ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Background ambient lighting effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/20 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-[20%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-secondary/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-surface-elevated/40 via-surface/80 to-surface-recessed/95" />
      </div>

      {/* Main Interactive Modal Card */}
      <div className="relative z-10 max-w-lg w-full mx-4 p-8 sm:p-10 rounded-2xl bg-surface-container-high/90 border border-primary/30 shadow-[0_0_60px_rgba(0,230,118,0.15)] text-center flex flex-col items-center">
        {/* Official Brand Logo */}
        <div className="mb-6 flex justify-center transform hover:scale-105 transition-transform">
          <CricketDreamXILogo variant="horizontal" theme="dark" height={52} priority />
        </div>

        {/* Tactical Subtitle & Welcome Heading */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-elevated border border-primary/40 text-primary font-mono text-[11px] tracking-widest uppercase mb-4 shadow-[0_0_15px_rgba(0,230,118,0.2)]">
          <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
          <span>BROADCAST STADIUM READY • 60 FPS</span>
        </div>

        <h1 className="font-headline-lg text-headline-lg text-text-chalk tracking-tight mb-3">
          STEP INTO THE CRICKET ARENA
        </h1>

        <p className="font-body-base text-body-base text-text-slate max-w-sm mb-6 leading-relaxed">
          Experience tactical cricket simulation with 1,144 international legends, deterministic ball physics, and genuine stadium soundtracks.
        </p>

        {/* Live Soundtrack Teaser */}
        <div className="w-full max-w-xs mb-8 p-3 rounded-xl bg-surface-card border border-border-hairline flex items-center justify-between text-left">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary flex-shrink-0">
              <span className="material-symbols-outlined text-[20px] animate-pulse">music_note</span>
            </div>
            <div className="truncate">
              <div className="text-[10px] font-mono uppercase tracking-wider text-primary">STADIUM SCORE</div>
              <div className="text-xs font-bold text-text-chalk truncate">{currentTrack.title}</div>
              <div className="text-[10px] text-text-subdued truncate">{currentTrack.subtitle}</div>
            </div>
          </div>
          <span className="text-[11px] font-mono text-secondary px-2 py-0.5 rounded bg-secondary/10 border border-secondary/20">
            AUTO-LOOP
          </span>
        </div>

        {/* ENTER ARENA Call To Action Button */}
        <button
          onClick={handleEnter}
          disabled={isEntering}
          type="button"
          className="group relative w-full py-4 px-8 rounded-xl font-headline-md text-headline-md text-on-primary bg-primary hover:bg-primary-fixed shadow-[0_0_30px_rgba(0,230,118,0.4)] hover:shadow-[0_0_45px_rgba(0,230,118,0.6)] active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer overflow-hidden font-black tracking-wider uppercase"
        >
          <span className="material-symbols-outlined text-[24px] group-hover:scale-110 transition-transform">
            sports_cricket
          </span>
          <span>{isEntering ? 'INITIALIZING ARENA...' : 'ENTER THE CRICKET ARENA'}</span>
          <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">
            arrow_forward
          </span>

          {/* Shimmer light effect */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        </button>

        <p className="text-[11px] text-text-subdued font-mono mt-4">
          Clicking initializes high-fidelity stadium acoustics &amp; offline simulation cache.
        </p>
      </div>
    </div>
  );
}

