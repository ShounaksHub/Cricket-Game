'use client';

import React from 'react';
import {
  resolvePlayerImage,
  generateDeterministicCricketAvatar,
  type PlayerImageInput,
  type ImageClassificationStatus,
} from '@/lib/player-image-resolver';

export interface PlayerAvatarProps extends PlayerImageInput {
  className?: string;
  size?: number | string;
  showBadge?: boolean;
}

export function PlayerAvatar({
  id,
  fullName,
  displayName,
  primaryRole,
  primaryNationality,
  battingHand,
  bowlingStyle,
  className = '',
  size = 48,
  showBadge = true,
}: PlayerAvatarProps) {
  const meta = resolvePlayerImage({
    id,
    fullName,
    displayName,
    primaryRole,
    primaryNationality,
    battingHand,
    bowlingStyle,
  });

  const widthStyle = typeof size === 'number' ? `${size}px` : size;
  const heightStyle = typeof size === 'number' ? `${size}px` : size;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 rounded-lg overflow-hidden bg-surface-recessed select-none ${className}`}
      style={{ width: widthStyle, height: heightStyle }}
    >
      <img
        src={meta.src}
        alt={meta.altText}
        className="w-full h-full object-cover"
        loading="lazy"
        decoding="async"
      />
      {showBadge && (
        <span
          className="absolute bottom-0 right-0 px-1 py-0.2 bg-surface-elevated/90 text-[8px] font-mono text-primary font-bold rounded-tl"
          title={`Status: ${meta.classification}`}
        >
          {meta.classification === 'VERIFIED_AUTHENTIC' ? '✓' : 'XI'}
        </span>
      )}
    </div>
  );
}

export default PlayerAvatar;
