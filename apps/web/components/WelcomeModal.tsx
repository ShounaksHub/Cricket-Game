'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  Trophy,
  Shield,
  Zap,
  Globe,
  HelpCircle,
  X,
  CheckCircle2,
  Sliders,
  Flame,
  Activity,
  Award,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { CricketDreamXILogo } from './CricketDreamXILogo';

interface WelcomeModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export function WelcomeModal({ forceOpen, onClose }: WelcomeModalProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'RULES' | 'TACTICS' | 'NATION_RULE'>('OVERVIEW');

  useEffect(() => {
    if (forceOpen !== undefined) {
      setIsOpen(forceOpen);
      return;
    }

    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem('cricket_welcome_dismissed');
      const hasActiveMatch = Boolean(localStorage.getItem('cricket_active_match_session'));
      if (!dismissed && pathname === '/' && !hasActiveMatch) {
        setIsOpen(true);
      }
    }
  }, [forceOpen, pathname]);

  // Listen for custom trigger event from Header or anywhere in the app
  useEffect(() => {
    function handleOpenEvent() {
      setIsOpen(true);
    }
    window.addEventListener('open-cricket-welcome-modal', handleOpenEvent);
    return () => {
      window.removeEventListener('open-cricket-welcome-modal', handleOpenEvent);
    };
  }, []);

  function handleDismiss() {
    if (typeof window !== 'undefined') localStorage.setItem('cricket_welcome_dismissed', 'true');
    setIsOpen(false);
    if (onClose) onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="modal modal-open z-[100] bg-black/80 backdrop-blur-xs">
      <div className="modal-box max-w-4xl max-h-[92vh] flex flex-col p-0 bg-base-100 border border-base-300 shadow-2xl rounded-2xl overflow-hidden">
        {/* Modal Top Banner */}
        <div className="relative px-6 py-5 bg-base-200/80 border-b border-base-300 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CricketDreamXILogo
              variant="app-icon"
              width={44}
              height={44}
              className="w-11 h-11 rounded-xl shadow-md shrink-0 border border-base-300"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-headline-md font-bold tracking-tight text-base-content">
                  Welcome to Cricket Dream XI Championship
                </h2>
                <span className="badge badge-primary badge-outline text-[10px] uppercase font-bold tracking-wider">
                  Tactical Engine
                </span>
              </div>
              <p className="text-xs opacity-70 font-label-caps">
                Authoritative • Deterministic SplitMix64 PRNG • Full MCC Law Compliance
              </p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="btn btn-ghost btn-circle btn-sm text-base-content/70 hover:text-base-content"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-base-300 bg-base-200/50 px-6 py-2 overflow-x-auto">
          <div role="tablist" className="tabs tabs-box bg-base-300/40 w-max">
            {[
              { id: 'OVERVIEW', label: '1. Game Overview', icon: BookOpen },
              { id: 'RULES', label: '2. Match Rules in Brief', icon: Shield },
              { id: 'TACTICS', label: '3. Tactical Controls', icon: Sliders },
              { id: 'NATION_RULE', label: '4. One Team/Player Per Nation', icon: Globe, highlight: true },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`tab gap-2 text-xs font-semibold transition whitespace-nowrap ${
                    active ? 'tab-active font-bold text-primary-content' : 'text-base-content/70'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${tab.highlight ? 'text-secondary' : ''}`} />
                  <span>{tab.label}</span>
                  {tab.highlight && (
                    <span className="badge badge-secondary badge-xs">
                      NEW
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-base-content/80 flex-1">
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="card bg-base-200/60 border border-base-300 shadow-xs">
                <div className="card-body p-4">
                  <h3 className="card-title text-sm font-bold flex items-center gap-2 text-base-content">
                    <Flame className="w-4 h-4 text-primary" />
                    What is the Cricket Dream XI Championship?
                  </h3>
                  <p className="text-xs opacity-80 leading-relaxed">
                    A realistic cricket simulation combining authentic player stats with top-down broadcast ball tracking. Pick your dream playing XI from over 1,140 cricketers across eras, or recreate historic international rivalries.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="card bg-base-200/40 border border-base-300">
                  <div className="card-body p-4">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center text-primary mb-2">
                      <Shield className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-base-content mb-1">1. Squad Selection</h4>
                    <p className="text-[11px] opacity-75 leading-normal">
                      Draft your 11 players in the Squad Builder. Choose custom dream teams, All-Time National XIs, or the 1-Player-Per-Nation World XI.
                    </p>
                  </div>
                </div>

                <div className="card bg-base-200/40 border border-base-300">
                  <div className="card-body p-4">
                    <div className="w-8 h-8 rounded-lg bg-secondary/15 border border-secondary/35 flex items-center justify-center text-secondary mb-2">
                      <Sliders className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-base-content mb-1">2. Venue &amp; Toss</h4>
                    <p className="text-[11px] opacity-75 leading-normal">
                      Select authentic grounds (MCG, Lord&apos;s, Wankhede) and pitch conditions. Call the coin toss to decide Bat or Bowl.
                    </p>
                  </div>
                </div>

                <div className="card bg-base-200/40 border border-base-300">
                  <div className="card-body p-4">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center text-primary mb-2">
                      <Activity className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-base-content mb-1">3. Live Match Simulation</h4>
                    <p className="text-[11px] opacity-75 leading-normal">
                      Control shot aggression when batting, rotate bowlers and set fields when bowling, and follow ball-by-ball broadcast action.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'RULES' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card bg-base-200/50 border border-base-300">
                  <div className="card-body p-4 space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-primary">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Format Over Quotas &amp; Innings
                    </h3>
                    <ul className="text-xs space-y-1.5 opacity-80">
                      <li>• <strong>T10 / T20 / ODI / Test:</strong> Full support for all 5 official cricket formats.</li>
                      <li>• <strong>Powerplay:</strong> Dynamic field restriction circles matching format regulations.</li>
                      <li>• <strong>Bowler Quota:</strong> Strict overs limits enforced (T10: 2, T20: 4, ODI: 10).</li>
                      <li>• <strong>MCC Law 21.7:</strong> No bowler can bowl two consecutive overs from both ends.</li>
                    </ul>
                  </div>
                </div>

                <div className="card bg-base-200/50 border border-base-300">
                  <div className="card-body p-4 space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-primary">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Extras &amp; Dismissals (MCC Laws)
                    </h3>
                    <ul className="text-xs space-y-1.5 opacity-80">
                      <li>• <strong>No-Ball (Law 21):</strong> 1 penalty run + mandatory <strong>Free Hit</strong> in limited overs. Dismissal on Free Hit is only possible via Run Out!</li>
                      <li>• <strong>Wide Ball (Law 22):</strong> 1 penalty run outside guidelines; ball is re-bowled.</li>
                      <li>• <strong>Leg-Side Limit (Law 28.4):</strong> Maximum 2 fielders behind square on the leg side at any time.</li>
                      <li>• <strong>Authentic Dismissals:</strong> Bowled, Caught (Keeper, Slips, Deep Boundary), LBW, Run Out, Stumped, and Hit Wicket.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'TACTICS' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card bg-base-200/50 border border-base-300">
                  <div className="card-body p-4 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-secondary">
                      <Sliders className="w-3.5 h-3.5 text-secondary" />
                      Batting Tactical Intent
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-base-100 border border-base-300">
                        <span className="text-primary font-bold">DEFENSIVE:</span> Low boundary risk, high dot ball rate, solid defense against dangerous swing or spin.
                      </div>
                      <div className="p-2.5 rounded-lg bg-base-100 border border-base-300">
                        <span className="text-base-content font-bold">ROTATE STRIKE:</span> Prioritize 1s and 2s, manipulate field gaps, keep the scoreboard moving without high dismissal risk.
                      </div>
                      <div className="p-2.5 rounded-lg bg-base-100 border border-base-300">
                        <span className="text-warning font-bold">ATTACKING:</span> Target boundaries through the 30-yard ring, higher boundary probability with moderate risk.
                      </div>
                      <div className="p-2.5 rounded-lg bg-base-100 border border-base-300">
                        <span className="text-error font-bold">MAXIMUM / SMASH:</span> High-risk lofted slogging in death overs. Wickets will tumble if mistimed!
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card bg-base-200/50 border border-base-300">
                  <div className="card-body p-4 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-info">
                      <Zap className="w-3.5 h-3.5 text-info" />
                      Bowling Length &amp; Line Strategy
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-base-100 border border-base-300">
                        <span className="text-primary font-bold">YORKER:</span> Aim directly at the base of the stumps. Maximum bowled/LBW danger; risk of full tosses if bowler is tired.
                      </div>
                      <div className="p-2.5 rounded-lg bg-base-100 border border-base-300">
                        <span className="text-base-content font-bold">GOOD LENGTH:</span> The corridor of uncertainty. Induces false shots and slips catches.
                      </div>
                      <div className="p-2.5 rounded-lg bg-base-100 border border-base-300">
                        <span className="text-warning font-bold">BOUNCER / SHORT:</span> Tests batsman courage and timing; pull shot catches or over-the-head sixes.
                      </div>
                      <div className="p-2.5 rounded-lg bg-base-100 border border-base-300">
                        <span className="text-accent font-bold">VARIATIONS:</span> Slower balls, knuckleballs, and arm balls to deceive aggressive strokeplay.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'NATION_RULE' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="card bg-base-200/50 border border-secondary/40">
                <div className="card-body p-4 space-y-2">
                  <div className="flex items-center gap-2 text-secondary font-bold text-sm">
                    <Globe className="w-4 h-4" />
                    <span>One Team Per Nation / One Player Per Nation (Global Synergy)</span>
                  </div>
                  <p className="text-xs opacity-80 leading-relaxed">
                    To heighten competition, managerial balance, and tactical intrigue, the Dream XI system supports the <strong>One Selection Per Nation</strong> constraint. When enabled, your 11-player squad must draw talent across different cricket-playing nations!
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[
                  { flag: '🇮🇳', code: 'IND', name: 'India' },
                  { flag: '🇦🇺', code: 'AUS', name: 'Australia' },
                  { flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', code: 'ENG', name: 'England' },
                  { flag: '🇿🇦', code: 'SA', name: 'South Africa' },
                  { flag: '🇳🇿', code: 'NZ', name: 'New Zealand' },
                  { flag: '🇵🇰', code: 'PAK', name: 'Pakistan' },
                  { flag: '🏝️', code: 'WI', name: 'West Indies' },
                  { flag: '🇱🇰', code: 'SL', name: 'Sri Lanka' },
                ].map((country) => (
                  <div
                    key={country.code}
                    className="p-2.5 rounded-lg bg-base-200/50 border border-base-300 flex items-center gap-2"
                  >
                    <span className="text-lg">{country.flag}</span>
                    <div>
                      <div className="font-bold text-base-content">{country.name}</div>
                      <div className="text-[10px] opacity-60 font-label-caps">{country.code}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="modal-action m-0 px-6 py-4 bg-base-200/70 border-t border-base-300 flex flex-col sm:flex-row items-center justify-between gap-3">
          <label className="label cursor-pointer gap-2 py-0">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="checkbox checkbox-primary checkbox-sm"
            />
            <span className="label-text text-xs opacity-80">Don&apos;t show this popup on launch</span>
          </label>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {activeTab !== 'NATION_RULE' ? (
              <button
                onClick={() => {
                  const tabs: Array<'OVERVIEW' | 'RULES' | 'TACTICS' | 'NATION_RULE'> = [
                    'OVERVIEW',
                    'RULES',
                    'TACTICS',
                    'NATION_RULE',
                  ];
                  const currentIndex = tabs.indexOf(activeTab);
                  if (currentIndex < tabs.length - 1) {
                    setActiveTab(tabs[currentIndex + 1]);
                  }
                }}
                className="btn btn-neutral btn-sm flex-1 sm:flex-none text-xs gap-1.5"
              >
                <span>Next Section</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : null}

            <button
              onClick={handleDismiss}
              className="btn btn-primary btn-sm flex-1 sm:flex-none text-xs font-bold gap-1.5"
            >
              <span>Enter Pavilion</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
