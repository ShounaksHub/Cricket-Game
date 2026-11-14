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
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#2D545E] border-b border-[#12343B] text-[#FBF8F2] shadow-sm">
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
        <nav className="hidden lg:flex items-center gap-1.5">
          {navItems.map((item) => {
            const isActive = item.pathMatch(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded font-headline-md text-sm uppercase tracking-wider transition-all ${
                  isActive
                    ? 'bg-[#12343B] text-[#E1B382] font-bold border-b-2 border-[#E1B382]'
                    : 'text-[#FBF8F2]/80 hover:bg-[#12343B]/40 hover:text-[#FBF8F2]'
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
            className="p-space-xs rounded-lg text-[#FBF8F2]/80 hover:text-[#E1B382] hover:bg-[#12343B]/40 transition-all flex items-center justify-center cursor-pointer"
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
            className="relative flex items-center pl-space-xs border-l border-[#12343B] group cursor-pointer"
            title={`${managerName} · Manager profile`}
          >
            <div className="relative">
              <span aria-label={managerName} className="w-9 h-9 rounded-full bg-[#12343B] text-[#E1B382] ring-1 ring-[#C89666]/40 flex items-center justify-center font-bold text-sm">{managerName.slice(0, 1).toUpperCase()}</span>
              <span
                className="absolute -bottom-1 -right-1 bg-[#E1B382] text-[#12343B] font-label-caps text-[9px] px-1 rounded-sm leading-tight font-extrabold shadow-sm"
                title="Captain Rank"
              >
                C
              </span>
            </div>
          </Link>

          {/* Mobile Navigation Trigger */}
          <button
            aria-label="Toggle Navigation"
            className="lg:hidden p-space-xs rounded-lg text-[#FBF8F2] hover:bg-[#12343B]/40 transition-all"
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
        <div className="lg:hidden bg-[#12343B] border-b border-[#C89666]/30 px-4 py-4 flex flex-col gap-2 text-[#FBF8F2]">
          <div className="pb-3 border-b border-[#2D545E] flex items-center justify-between">
            <CricketDreamXILogo variant="horizontal" theme="dark" height={28} className="h-7 w-auto" />
            <span className="font-label-caps text-[10px] text-[#E1B382] bg-[#2D545E] px-2 py-0.5 rounded border border-[#C89666]/30">
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
                className={`px-4 py-3 rounded-lg font-headline-md text-sm tracking-wider transition-all flex items-center justify-between ${
                  isActive
                    ? 'bg-[#2D545E] text-[#E1B382] font-bold border-l-4 border-[#E1B382]'
                    : 'text-[#FBF8F2]/80 hover:bg-[#2D545E]/50 hover:text-[#FBF8F2]'
                }`}
              >
                <span>{item.label}</span>
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </Link>
            );
          })}
          <div className="pt-2 border-t border-[#2D545E] flex items-center justify-between text-body-sm text-[#FBF8F2]/70">
            <span className="font-label-caps text-label-caps text-[#E1B382]">OFFLINE ENGINE v2.4</span>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                openRules();
              }}
              className="font-label-caps text-label-caps text-[#E1B382] underline uppercase cursor-pointer"
            >
              View Game Rules
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
