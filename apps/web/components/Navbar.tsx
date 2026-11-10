'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Trophy,
  Users,
  Shield,
  PlayCircle,
  Menu,
  X,
  Server,
  Activity,
  Sparkles,
  HelpCircle,
  BookOpen,
} from 'lucide-react';
import { WelcomeModal } from './WelcomeModal';
import { CricketDreamXILogo } from './CricketDreamXILogo';

interface ApiHealthResponse {
  status: string;
  service: string;
  version: string;
  uptimeSeconds: number;
  database: {
    status: string;
    latencyMs?: number;
    error?: string;
  };
}

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [welcomeModalOpen, setWelcomeModalOpen] = useState(false);
  const [apiHealth, setApiHealth] = useState<ApiHealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    let isMounted = true;
    async function checkHealth() {
      try {
        const res = await fetch(`${apiUrl}/health`);
        if (!res.ok) throw new Error('API offline');
        const data: ApiHealthResponse = await res.json();
        if (isMounted) setApiHealth(data);
      } catch {
        if (isMounted) setApiHealth(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    checkHealth();
    return () => {
      isMounted = false;
    };
  }, [apiUrl]);

  const navLinks = [
    { href: '/', label: 'Overview', icon: Trophy },
    { href: '/players', label: 'Player Registry', icon: Users },
    { href: '/dream-teams', label: 'Squad Builder', icon: Shield },
    { href: '/match', label: 'Match Simulator', icon: PlayCircle },
  ];

  return (
    <nav className="w-full bg-[#0B0E13] border-b border-[#1E2530] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <Link href="/" className="flex items-center gap-3 group" aria-label="Cricket Dream XI Home">
            <CricketDreamXILogo
              variant="horizontal"
              theme="dark"
              height={36}
              className="h-8 w-auto group-hover:scale-105 transition-transform"
            />
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
                    isActive
                      ? 'bg-[#0D4A38] text-[#D4AF37] border border-[#D4AF37]/40 shadow-sm'
                      : 'text-[#8A94A6] hover:text-[#F8F9FA] hover:bg-[#161D27]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Action Buttons, Telemetry & Mobile Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Rules & Guide Button */}
            <button
              onClick={() => setWelcomeModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141A22] hover:bg-[#1C2533] border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-semibold shadow-sm transition group"
              title="View Cricket Simulator Rules & Guide"
            >
              <BookOpen className="w-3.5 h-3.5 group-hover:scale-110 transition" />
              <span className="hidden sm:inline">Rules & Guide</span>
            </button>

            <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-[#141A22] border border-[#222A36] text-[11px] font-mono">
              <Server className="w-3.5 h-3.5 text-[#8A94A6]" />
              {loading ? (
                <span className="text-yellow-400 animate-pulse">CONNECTING</span>
              ) : apiHealth ? (
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                  ONLINE {apiHealth.database.status === 'up' ? `(${apiHealth.database.latencyMs}ms)` : '(STANDALONE)'}
                </span>
              ) : (
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  STANDALONE V1.0
                </span>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg bg-[#141A22] border border-[#222A36] text-[#8A94A6] hover:text-[#F8F9FA] transition"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0E1218] border-b border-[#222A36] px-4 py-3 space-y-2 animate-fade-in">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-[#0D4A38] text-[#D4AF37] border border-[#D4AF37]/40'
                    : 'text-[#8A94A6] hover:text-[#F8F9FA] hover:bg-[#161D27]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              setWelcomeModalOpen(true);
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-[#141A22] text-[#D4AF37] border border-[#D4AF37]/30 transition"
          >
            <BookOpen className="w-4 h-4" />
            <span>Rules & Game Guide</span>
          </button>
        </div>
      )}

      {/* Global Welcome & Rules Modal */}
      <WelcomeModal
        forceOpen={welcomeModalOpen}
        onClose={() => setWelcomeModalOpen(false)}
      />
    </nav>
  );
}
