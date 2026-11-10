'use client';

import React, { useState, useEffect } from 'react';
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

interface WelcomeModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export function WelcomeModal({ forceOpen, onClose }: WelcomeModalProps) {
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
      if (!dismissed) {
        setIsOpen(true);
      }
    }
  }, [forceOpen]);

  // Listen for custom trigger event from Navbar or anywhere in the app
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
    if (dontShowAgain && typeof window !== 'undefined') {
      localStorage.setItem('cricket_welcome_dismissed', 'true');
    }
    setIsOpen(false);
    if (onClose) onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#0B0E14] border border-[#1E2530] rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Top Banner */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-[#07241A] via-[#0B0E14] to-[#121A24] border-b border-[#1E2530] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0D4A38] border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37] shadow-lg">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#F8F9FA] tracking-tight">
                  Welcome to Cricket Dream Simulator
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#18202A] text-[#D4AF37] border border-[#D4AF37]/30">
                  T20 Pro Engine
                </span>
              </div>
              <p className="text-xs text-[#8A94A6]">
                Authoritative • Deterministic SplitMix64 PRNG • Full MCC Law Compliance
              </p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="p-2 rounded-lg text-[#8A94A6] hover:text-[#F8F9FA] hover:bg-[#1C2230] transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#1E2530] bg-[#0E121A] px-6 gap-2 overflow-x-auto">
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
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-3.5 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
                  active
                    ? 'border-[#D4AF37] text-[#D4AF37] bg-[#161D27]'
                    : 'border-transparent text-[#8A94A6] hover:text-[#F8F9FA] hover:bg-[#121620]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${tab.highlight ? 'text-emerald-400' : ''}`} />
                <span>{tab.label}</span>
                {tab.highlight && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                    NEW
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-[#D1D5DB] flex-1">
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-[#121824] border border-[#1E2530]">
                <h3 className="text-sm font-bold text-[#F8F9FA] mb-1 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-emerald-400" />
                  What is the Global Cricket Dream Game?
                </h3>
                <p className="text-xs text-[#8A94A6] leading-relaxed">
                  A high-fidelity cricket management and tactical simulation engine combining Football Manager depth with live 2D top-down broadcast rendering. You can craft dream playing XIs from over 1,140 authentic cricketers spanning 7 historical eras, or play authentic international rivalries!
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-[#0D131C] border border-[#1E2530]">
                  <div className="w-8 h-8 rounded-lg bg-blue-950/60 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-2">
                    <Shield className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-[#F8F9FA] mb-1">1. Squad Selection</h4>
                  <p className="text-[11px] text-[#8A94A6] leading-normal">
                    Assemble 11 players in the Squad Builder. Choose custom dream teams, All-Time National XIs, or the new One-Player-Per-Nation World XI!
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#0D131C] border border-[#1E2530]">
                  <div className="w-8 h-8 rounded-lg bg-amber-950/60 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-2">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-[#F8F9FA] mb-1">2. Venue & Toss</h4>
                  <p className="text-[11px] text-[#8A94A6] leading-normal">
                    Select authentic stadium dimensions (MCG, Lord&apos;s, Wankhede) and pitch conditions (Green, Turning, Flat). Call the coin toss to choose Bat or Bowl.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#0D131C] border border-[#1E2530]">
                  <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2">
                    <Activity className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-[#F8F9FA] mb-1">3. Live Match Loop</h4>
                  <p className="text-[11px] text-[#8A94A6] leading-normal">
                    Command every ball with live tactical adjustments, watch ballistic flight arcs on the 2D PixiJS radar, and view reconciled scorecards.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'RULES' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#121824] border border-[#1E2530] space-y-2">
                  <h3 className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    T20 Innings & Over Quotas
                  </h3>
                  <ul className="text-xs space-y-1.5 text-[#A0AEC0]">
                    <li>• <strong>20 Overs per side:</strong> Both teams bat for a maximum of 20 legal overs.</li>
                    <li>• <strong>Powerplay (Overs 1–6):</strong> Maximum 2 fielders outside the 30-yard circle.</li>
                    <li>• <strong>Bowler Quota:</strong> Maximum <strong>4 overs</strong> per bowler.</li>
                    <li>• <strong>MCC Law 21.7:</strong> No bowler can bowl two consecutive overs from both ends.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-[#121824] border border-[#1E2530] space-y-2">
                  <h3 className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Extras & Dismissals (MCC Laws)
                  </h3>
                  <ul className="text-xs space-y-1.5 text-[#A0AEC0]">
                    <li>• <strong>No-Ball (Law 21):</strong> 1 penalty run + mandatory <strong>Free Hit</strong> on next legal ball. Dismissal on Free Hit is <em>only</em> possible via Run Out!</li>
                    <li>• <strong>Wide (Law 22):</strong> 1 penalty run + delivery must be re-bowled.</li>
                    <li>• <strong>Legal Wickets:</strong> Bowled, Caught, LBW, Run Out, Stumped, and Hit Wicket.</li>
                  </ul>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#0D131C] border border-[#1E2530]">
                <h4 className="text-xs font-bold text-[#F8F9FA] mb-1">Squad Eligibility Requirements:</h4>
                <p className="text-xs text-[#8A94A6]">
                  A match-ready playing XI requires exactly <strong>11 players</strong>, exactly <strong>1 designated wicketkeeper</strong>, unique batting positions (1–11), and a minimum of <strong>5 bowling options</strong> to complete the 20-over quota legally.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'TACTICS' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <p className="text-xs text-[#8A94A6]">
                During live ball-by-ball micro-stepping, you can adjust tactical parameters before every delivery:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-[#121824] border border-[#1E2530] space-y-1.5">
                  <h4 className="text-xs font-bold text-[#D4AF37]">🏏 Batter Aggression</h4>
                  <ul className="text-[11px] text-[#A0AEC0] space-y-1">
                    <li>• <strong>Defend:</strong> Low boundary probability, high survival rate.</li>
                    <li>• <strong>Rotate Strike:</strong> Prioritizes 1s and 2s into gaps.</li>
                    <li>• <strong>Balanced:</strong> Natural batting rhythm.</li>
                    <li>• <strong>Aggressive:</strong> Higher boundary odds (+50%) with increased risk.</li>
                    <li>• <strong>Maximum Power:</strong> All-out boundary hitting (+100% boundary, +90% wicket risk).</li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl bg-[#121824] border border-[#1E2530] space-y-1.5">
                  <h4 className="text-xs font-bold text-[#D4AF37]">🎯 Bowler Tactics</h4>
                  <ul className="text-[11px] text-[#A0AEC0] space-y-1">
                    <li>• <strong>Length:</strong> Yorker, Full, Good Length, Back of Length, Short.</li>
                    <li>• <strong>Line:</strong> Stumps, Outside Off, Down Leg.</li>
                    <li>• <strong>Variations:</strong> Stock ball, Slower ball, Bouncer, Googly / Arm ball.</li>
                    <li>• Matchups against left-hand and right-hand batters alter deviation and bounce probabilities!</li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl bg-[#121824] border border-[#1E2530] space-y-1.5">
                  <h4 className="text-xs font-bold text-[#D4AF37]">🛡️ Field Presets</h4>
                  <ul className="text-[11px] text-[#A0AEC0] space-y-1">
                    <li>• <strong>Attacking Close:</strong> Slips & gully in place to force edges.</li>
                    <li>• <strong>Balanced Ring:</strong> Standard 30-yard ring protection.</li>
                    <li>• <strong>Death Boundary:</strong> Deep boundary riders saving boundaries.</li>
                    <li>• <strong>Spin Choke:</strong> Deep midwicket and long-off cut off lofted shots.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'NATION_RULE' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/40 via-[#101826] to-[#121E2C] border border-emerald-500/40">
                <div className="flex items-center gap-2 mb-1.5">
                  <Globe className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-bold text-[#F8F9FA]">
                    Brand New Feature: One Team / One Player Per Nation!
                  </h3>
                </div>
                <p className="text-xs text-[#A0AEC0] leading-relaxed">
                  To eliminate repetitive squads and test true cricket knowledge, the game introduces two exciting international balance modes:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#121824] border border-[#1E2530] space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                      1
                    </span>
                    <h4 className="text-xs font-bold text-[#F8F9FA]">
                      World XI: One Player Per Nation
                    </h4>
                  </div>
                  <p className="text-xs text-[#8A94A6] leading-relaxed">
                    Build a legendary 11-player squad where <strong>every single cricketer must come from a different country</strong> (e.g. 1 from India, 1 from Australia, 1 from England, 1 from West Indies, 1 from Pakistan, 1 from South Africa, 1 from New Zealand, 1 from Sri Lanka, 1 from Afghanistan, 1 from Bangladesh, 1 from Ireland/Zimbabwe)!
                  </p>
                  <p className="text-[11px] text-emerald-400 font-mono">
                    ✓ Both User and AI obey zero national duplicates!
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#121824] border border-[#1E2530] space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                      2
                    </span>
                    <h4 className="text-xs font-bold text-[#F8F9FA]">
                      National Duel: One Team Per Nation
                    </h4>
                  </div>
                  <p className="text-xs text-[#8A94A6] leading-relaxed">
                    Select an authentic All-Time National Team (e.g. <em>India All-Time XI</em>). The AI opponent will automatically select a <strong>different nation</strong> (e.g. <em>Australia All-Time XI</em> or <em>West Indies All-Time XI</em>), guaranteeing no duplicate nations on the field!
                  </p>
                  <p className="text-[11px] text-blue-400 font-mono">
                    ✓ Authentic country vs country battles!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Bar */}
        <div className="px-6 py-4 bg-[#0E121A] border-t border-[#1E2530] flex flex-col sm:flex-row items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-[#8A94A6] cursor-pointer hover:text-[#D1D5DB] select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded bg-[#18202A] border-[#2A3444] text-emerald-500 focus:ring-0 focus:ring-offset-0"
            />
            <span>Don&apos;t show this popup automatically on startup</span>
          </label>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {activeTab !== 'NATION_RULE' ? (
              <button
                onClick={() => {
                  if (activeTab === 'OVERVIEW') setActiveTab('RULES');
                  else if (activeTab === 'RULES') setActiveTab('TACTICS');
                  else if (activeTab === 'TACTICS') setActiveTab('NATION_RULE');
                }}
                className="flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-semibold bg-[#1C2230] hover:bg-[#252E3E] text-[#D1D5DB] transition flex items-center justify-center gap-1.5"
              >
                <span>Next Section</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : null}

            <button
              onClick={handleDismiss}
              className="flex-1 sm:flex-none px-5 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg transition flex items-center justify-center gap-1.5"
            >
              <span>Got It, Let&apos;s Play!</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

