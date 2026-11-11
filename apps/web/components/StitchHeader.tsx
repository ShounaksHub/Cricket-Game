'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CricketDreamXILogo } from './CricketDreamXILogo';
import { HeaderAudioControls } from './HeaderAudioControls';

export function StitchHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [managerName, setManagerName] = useState('Manager');
  useEffect(() => {
    try {
      const profile = JSON.parse(localStorage.getItem('cricket_user_profile') || '{}');
      if (typeof profile.name === 'string' && profile.name.trim()) setManagerName(profile.name.trim());
    } catch { /* Keep a neutral fallback for invalid local profile data. */ }
  }, []);

  const navItems = [
    { label: 'HOME', href: '/', pathMatch: (p: string) => p === '/' },
    { label: 'DREAM XI', href: '/dream-teams', pathMatch: (p: string) => p.startsWith('/dream-teams') },
    { label: 'PLAYERS', href: '/players', pathMatch: (p: string) => p.startsWith('/players') },
    { label: 'MY CRICKET', href: '/my-cricket', pathMatch: (p: string) => p.startsWith('/my-cricket') },
  ];

  function openRules() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-cricket-welcome-modal'));
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface border-b border-border-hairline">
      <div className="h-20 max-w-[1440px] mx-auto px-4 md:px-margin-desktop flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-space-md">
          <Link className="flex items-center group focus:outline-none" href="/" aria-label="Cricket Dream XI Home">
            {/* Desktop / Tablet: Primary Horizontal Logo */}
            <div className="hidden sm:block">
              <CricketDreamXILogo
                variant="horizontal"
                theme="dark"
                height={38}
                className="h-9 w-auto transition-transform group-hover:scale-105"
                priority
              />
            </div>
            {/* Mobile Compact: Stacked Logo */}
            <div className="sm:hidden">
              <CricketDreamXILogo
                variant="stacked"
                theme="dark"
                height={36}
                className="h-9 w-auto transition-transform group-hover:scale-105"
                priority
              />
            </div>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-space-xs">
          {navItems.map((item) => {
            const isActive = item.pathMatch(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-space-md py-space-sm rounded-t-lg font-headline-md text-title-md tracking-wider transition-all ${
                  isActive
                    ? 'bg-surface-elevated text-text-chalk border-b-2 border-primary'
                    : 'text-text-slate hover:bg-surface-elevated hover:text-on-surface'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Status & Controls */}
        <div className="flex items-center gap-space-md">

          {/* Rules & Game Guide Modal Trigger */}
          <button
            aria-label="Rules & Regulations"
            title="Rules & Match Regulations"
            className="p-space-xs rounded-lg text-text-slate hover:text-text-chalk hover:bg-surface-elevated transition-all flex items-center justify-center cursor-pointer"
            type="button"
            onClick={openRules}
          >
            <span className="material-symbols-outlined text-[20px]">help</span>
          </button>

          {/* Interactive Stadium Audio Controls & Track Menu */}
          <HeaderAudioControls />

          {/* Captain Profile Pill */}
          <Link
            href="/my-cricket"
            className="relative flex items-center pl-space-xs border-l border-border-hairline group cursor-pointer"
            title={`${managerName} · Manager profile`}
          >
            <div className="relative">
              <span aria-label={managerName} className="w-9 h-9 rounded-full bg-surface-elevated text-primary ring-1 ring-border-focus flex items-center justify-center font-bold">{managerName.slice(0, 1).toUpperCase()}</span>
              <span
                className="absolute -bottom-1 -right-1 bg-tertiary text-on-tertiary font-label-caps text-[9px] px-1 rounded-sm leading-tight font-extrabold shadow-[0_0_8px_rgba(233,195,73,0.4)]"
                title="Captain Rank"
              >
                C
              </span>
            </div>
          </Link>

          {/* Mobile Navigation Trigger */}
          <button
            aria-label="Toggle Navigation"
            className="lg:hidden p-space-xs rounded-lg text-text-slate hover:text-text-chalk hover:bg-surface-elevated transition-all"
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className="material-symbols-outlined text-[24px]">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-surface-card border-b border-border-hairline px-4 py-4 flex flex-col gap-2">
          <div className="pb-3 border-b border-border-hairline flex items-center justify-between">
            <CricketDreamXILogo variant="horizontal" theme="dark" height={28} className="h-7 w-auto" />
            <span className="font-label-caps text-[10px] text-primary bg-surface-elevated px-2 py-0.5 rounded border border-border-hairline">
              OFFLINE ENGINE
            </span>
          </div>
          {navItems.map((item) => {
            const isActive = item.pathMatch(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-lg font-headline-md text-body-bold tracking-wider transition-all flex items-center justify-between ${
                  isActive
                    ? 'bg-surface-elevated text-primary border-l-4 border-primary'
                    : 'text-text-slate hover:bg-surface-elevated hover:text-text-chalk'
                }`}
              >
                <span>{item.label}</span>
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </Link>
            );
          })}
          <div className="pt-2 border-t border-border-hairline flex items-center justify-between text-body-sm text-text-slate">
            <span className="font-label-caps text-label-caps text-primary">OFFLINE ENGINE v2.4</span>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                openRules();
              }}
              className="font-label-caps text-label-caps text-tertiary underline uppercase"
            >
              View Game Rules
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
