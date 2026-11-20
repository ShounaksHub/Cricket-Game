'use client';

import React from 'react';
import {
  resolvePlayerImage,
  getRealisticFallback,
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
      className={`avatar ${className}`}
      style={{ width: widthStyle, height: heightStyle }}
    >
      <div className="w-full h-full rounded-box overflow-hidden bg-base-300 relative">
        <img
          src={meta.src}
          alt={meta.altText}
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            // Graceful fallback to diverse realistic sports photography archetype from 60-image pool
            e.currentTarget.src = getRealisticFallback(primaryRole, primaryNationality, id);
          }}
        />
        {showBadge && (
          <span
            className="badge badge-xs badge-neutral absolute bottom-0.5 right-0.5 font-mono text-[8px] font-bold shadow-sm"
            title={`Status: ${meta.classification}`}
          >
            {meta.classification === 'VERIFIED_AUTHENTIC' ? '✓' : 'XI'}
          </span>
        )}
      </div>
    </div>
  );
}

export default PlayerAvatar;
