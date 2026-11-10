'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAudio, SOUNDTRACK_PLAYLIST } from '../context/AudioContext';

export function HeaderAudioControls() {
  const {
    isPlaying,
    isMuted,
    currentTrack,
    currentTrackIndex,
    volume,
    togglePlay,
    toggleMute,
    nextTrack,
    prevTrack,
    selectTrack,
    setVolume,
  } = useAudio();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center bg-surface-card border border-border-hairline rounded-lg p-0.5 shadow-sm">
        {/* Play / Pause Toggle Button */}
        <button
          onClick={togglePlay}
          type="button"
          aria-label={isPlaying ? 'Pause Stadium Music' : 'Play Stadium Music'}
          title={isPlaying ? 'Pause Stadium Music' : 'Play Stadium Music'}
          className={`p-1.5 rounded-md transition-all flex items-center justify-center cursor-pointer ${
            isPlaying
              ? 'text-primary bg-primary/10 shadow-[0_0_10px_rgba(0,230,118,0.25)]'
              : 'text-text-slate hover:text-text-chalk hover:bg-surface-elevated'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {isPlaying ? 'pause' : 'play_arrow'}
          </span>
        </button>

        {/* Track Title Indicator & Dropdown Trigger */}
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          type="button"
          aria-label="Open Stadium Audio Track Menu"
          title={`Playing: ${currentTrack.title} (Click for tracklist & volume)`}
          className="hidden md:flex items-center gap-1.5 px-2 py-1 max-w-[130px] lg:max-w-[160px] truncate hover:bg-surface-elevated rounded transition-colors text-left"
        >
          {isPlaying && !isMuted && (
            <span className="flex items-end gap-[2px] h-3 w-2.5 flex-shrink-0">
              <span className="w-[2px] bg-primary rounded-full animate-bounce [animation-delay:-0.3s] h-full" />
              <span className="w-[2px] bg-primary rounded-full animate-bounce [animation-delay:-0.15s] h-2/3" />
              <span className="w-[2px] bg-primary rounded-full animate-bounce h-4/5" />
            </span>
          )}
          <span className="font-mono text-[11px] text-text-chalk truncate">
            {currentTrack.title}
          </span>
          <span className="material-symbols-outlined text-[14px] text-text-subdued flex-shrink-0">
            expand_more
          </span>
        </button>

        {/* Quick Mute / Unmute Button */}
        <button
          onClick={toggleMute}
          type="button"
          aria-label={isMuted ? 'Unmute Stadium Audio' : 'Mute Stadium Audio'}
          title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          className={`p-1.5 rounded-md transition-all flex items-center justify-center cursor-pointer ${
            isMuted
              ? 'text-wicket-red bg-wicket-red/10'
              : 'text-text-slate hover:text-text-chalk hover:bg-surface-elevated'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {isMuted ? 'volume_off' : volume > 0.5 ? 'volume_up' : 'volume_down'}
          </span>
        </button>
      </div>

      {/* Expanded Audio Controller Popover */}
      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-xl bg-surface-container-high border border-border-hairline shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border-hairline mb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">
                graphic_eq
              </span>
              <span className="font-label-caps text-xs text-text-chalk uppercase tracking-wider font-bold">
                STADIUM SOUNDTRACK
              </span>
            </div>
            <span className="font-mono text-[10px] text-primary px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20">
              LOOP
            </span>
          </div>

          {/* Current Track Info */}
          <div className="p-2.5 rounded-lg bg-surface-card border border-border-hairline mb-3">
            <div className="text-[10px] font-mono uppercase tracking-widest text-secondary mb-0.5">
              NOW PLAYING
            </div>
            <div className="text-xs font-bold text-text-chalk truncate">
              {currentTrack.title}
            </div>
            <div className="text-[11px] text-text-subdued truncate">
              {currentTrack.subtitle}
            </div>

            {/* Playback Progress / Skip Controls */}
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-border-hairline/60">
              <button
                onClick={prevTrack}
                type="button"
                className="p-1 rounded text-text-slate hover:text-text-chalk hover:bg-surface-elevated transition-colors"
                title="Previous Track"
              >
                <span className="material-symbols-outlined text-[18px]">skip_previous</span>
              </button>
              <button
                onClick={togglePlay}
                type="button"
                className="px-3 py-1 rounded bg-primary text-on-primary font-bold text-xs flex items-center gap-1 shadow-[0_0_12px_rgba(0,230,118,0.3)] hover:scale-105 transition-transform"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {isPlaying ? 'pause' : 'play_arrow'}
                </span>
                <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
              </button>
              <button
                onClick={nextTrack}
                type="button"
                className="p-1 rounded text-text-slate hover:text-text-chalk hover:bg-surface-elevated transition-colors"
                title="Next Track"
              >
                <span className="material-symbols-outlined text-[18px]">skip_next</span>
              </button>
            </div>
          </div>

          {/* Volume Slider */}
          <div className="mb-3 px-1">
            <div className="flex items-center justify-between text-[11px] font-mono text-text-slate mb-1">
              <span>ARENA VOLUME</span>
              <span className="text-primary font-bold">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full accent-primary h-1.5 bg-surface-recessed rounded-lg cursor-pointer"
            />
          </div>

          {/* Tracklist selection */}
          <div className="space-y-1">
            <div className="text-[10px] font-mono text-text-subdued uppercase tracking-widest px-1">
              TRACKLIST
            </div>
            {SOUNDTRACK_PLAYLIST.map((track, idx) => {
              const isSelected = idx === currentTrackIndex;
              return (
                <button
                  key={track.id}
                  onClick={() => selectTrack(idx)}
                  type="button"
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition-colors ${
                    isSelected
                      ? 'bg-surface-elevated text-primary font-bold border border-primary/30'
                      : 'text-text-slate hover:bg-surface-card hover:text-text-chalk'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="truncate">{track.title}</div>
                    <div className="text-[10px] text-text-subdued truncate font-normal">
                      {track.subtitle}
                    </div>
                  </div>
                  {isSelected && (
                    <span className="material-symbols-outlined text-[16px] text-primary flex-shrink-0">
                      equalizer
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

