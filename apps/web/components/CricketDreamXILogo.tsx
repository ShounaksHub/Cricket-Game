'use client';

import React from 'react';
import Image from 'next/image';

export type LogoVariant = 'horizontal' | 'stacked' | 'monogram' | 'app-icon' | 'monochrome';
export type LogoTheme = 'dark' | 'light' | 'monochrome';

export interface CricketDreamXILogoProps {
  /** Logo layout variant */
  variant?: LogoVariant;
  /** Color theme: 'dark' (default for dark UI), 'light' (print/light UI), 'monochrome' */
  theme?: LogoTheme;
  /** Explicit width in pixels (or responsive string) */
  width?: number;
  /** Explicit height in pixels */
  height?: number;
  /** Additional CSS classes */
  className?: string;
  /** Custom accessibility label */
  alt?: string;
  /** Priority loading flag */
  priority?: boolean;
}

export function CricketDreamXILogo({
  variant = 'horizontal',
  theme = 'dark',
  width,
  height,
  className = '',
  alt = 'Cricket Dream XI Official Brand Logo',
  priority = false,
}: CricketDreamXILogoProps) {
  // Determine the authoritative SVG asset path
  let src = '/brand/logo-horizontal-dark.svg';
  let defaultWidth = 260;
  let defaultHeight = 45;

  if (variant === 'horizontal') {
    src = theme === 'light' ? '/brand/logo-horizontal-light.svg' : '/brand/logo-horizontal-dark.svg';
    defaultWidth = 260;
    defaultHeight = 45;
  } else if (variant === 'stacked') {
    src = theme === 'light' ? '/brand/logo-stacked-light.svg' : '/brand/logo-stacked-dark.svg';
    defaultWidth = 140;
    defaultHeight = 119;
  } else if (variant === 'monogram') {
    src = theme === 'light' ? '/brand/logo-monogram-light.svg' : '/brand/logo-monogram-dark.svg';
    defaultWidth = 64;
    defaultHeight = 36;
  } else if (variant === 'app-icon') {
    src = '/brand/logo-app-icon.svg';
    defaultWidth = 48;
    defaultHeight = 48;
  } else if (variant === 'monochrome') {
    src = '/brand/logo-monochrome.svg';
    defaultWidth = 260;
    defaultHeight = 45;
  }

  const finalWidth = width ?? defaultWidth;
  const finalHeight = height ?? defaultHeight;

  return (
    <img
      src={src}
      alt={alt}
      width={finalWidth}
      height={finalHeight}
      className={`inline-block select-none object-contain ${className}`}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
    />
  );
}

export default CricketDreamXILogo;

