'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function StitchHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

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
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-xl border-b border-border-hairline shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
      <div className="h-20 max-w-[1440px] mx-auto px-4 md:px-margin-desktop flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-space-md">
          <Link className="flex items-center gap-space-sm group focus:outline-none" href="/">
            <img
              alt="Cricket Dream XI Official Logo"
              className="h-8 w-auto object-contain transition-transform group-hover:scale-105"
              src="/assets/stitch/logo.png"
              onError={(e) => {
                // Fallback in case of image load delay
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="flex flex-col">
              <span className="font-headline-md text-title-md text-text-chalk tracking-tight leading-none group-hover:text-primary transition-colors">
                DREAM XI
              </span>
              <span className="font-label-caps text-label-caps text-text-subdued uppercase tracking-widest">
                CHAMPIONSHIP
              </span>
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
                    ? 'bg-surface-elevated text-text-chalk border-b-2 border-primary shadow-[0_0_12px_rgba(76,175,80,0.2)]'
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
          {/* Offline Ready Badge */}
          <div className="hidden sm:flex items-center gap-space-xs px-space-sm py-space-xs bg-surface-container rounded-full border border-border-hairline">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="font-label-caps text-label-caps text-primary tracking-widest uppercase">
              OFFLINE READY
            </span>
          </div>

          {/* Rules & Game Guide Modal Trigger */}
          <button
            aria-label="Rules & Regulations"
            title="Rules & Match Regulations"
            className="p-space-xs rounded-lg text-text-slate hover:text-text-chalk hover:bg-surface-elevated transition-all flex items-center justify-center"
            type="button"
            onClick={openRules}
          >
            <span className="material-symbols-outlined text-[20px]">help</span>
          </button>

          {/* Audio Settings Toggle */}
          <button
            aria-label="Audio Settings"
            title={isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
            className="p-space-xs rounded-lg text-text-slate hover:text-text-chalk hover:bg-surface-elevated transition-all flex items-center justify-center"
            type="button"
            onClick={() => setIsAudioMuted(!isAudioMuted)}
          >
            <span className="material-symbols-outlined text-[20px]">
              {isAudioMuted ? 'volume_off' : 'volume_up'}
            </span>
          </button>

          {/* Captain Profile Pill */}
          <Link
            href="/my-cricket"
            className="relative flex items-center pl-space-xs border-l border-border-hairline group cursor-pointer"
            title="Manager Profile & Locker Room"
          >
            <div className="relative">
              <img
                alt="Profile"
                className="w-9 h-9 rounded-full object-cover ring-2 ring-border-focus group-hover:ring-primary transition-all"
                src="/assets/stitch/asset-002.png"
                onError={(e) => {
                  e.currentTarget.src = '/assets/stitch/asset-003.png';
                }}
              />
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
