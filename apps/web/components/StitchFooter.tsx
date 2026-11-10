'use client';

import React from 'react';
import Link from 'next/link';
import { CricketDreamXILogo } from './CricketDreamXILogo';

export function StitchFooter() {
  function handleOpenRules() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-cricket-welcome-modal'));
    }
  }

  return (
    <footer className="w-full bg-surface-recessed border-t border-border-hairline py-space-md mt-auto">
      <div className="max-w-[1440px] mx-auto px-4 md:px-margin-desktop flex flex-col md:flex-row items-center justify-between gap-space-md text-center md:text-left">
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-space-md">
          <Link href="/" className="flex items-center gap-space-xs group">
            <CricketDreamXILogo variant="horizontal" theme="dark" height={28} className="h-7 w-auto opacity-80 group-hover:opacity-100 transition-opacity" />
          </Link>
          <span className="text-border-hairline hidden md:inline">|</span>
          <span className="font-label-caps text-label-caps text-text-subdued uppercase tracking-widest">
            © 2026 CRICKET DREAM XI BROADCAST ENGINE
          </span>
          <span className="text-border-hairline hidden sm:inline">|</span>
          <span className="font-label-caps text-label-caps text-primary tracking-widest">
            BUILD 2.4.0-TACTICAL
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-space-lg">
          <div className="flex items-center gap-space-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-telemetry-blue animate-pulse" />
            <span className="font-label-caps text-label-caps text-text-slate">60 FPS</span>
          </div>
          <div className="flex items-center gap-space-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
            <span className="font-label-caps text-label-caps text-text-slate">SIM READY</span>
          </div>
          <button
            onClick={handleOpenRules}
            type="button"
            className="font-label-caps text-label-caps text-text-subdued hover:text-text-chalk transition-colors cursor-pointer uppercase"
          >
            RULES & TELEMETRY
          </button>
        </div>
      </div>
    </footer>
  );
}
