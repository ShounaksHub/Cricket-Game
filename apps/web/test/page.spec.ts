import { describe, expect, it } from 'vitest';
import type { MatchFormat } from '@cricket/shared-types';

describe('Web Application Baseline Verification', () => {
  it('should import and validate core shared types in web context', () => {
    const formats: MatchFormat[] = ['T10', 'T20', 'ODI', 'TEST_RED_BALL', 'TEST_PINK_BALL'];
    expect(formats).toHaveLength(5);
    expect(formats).toContain('T20');
    expect(formats).toContain('TEST_RED_BALL');
  });

  it('should verify standard environment variables defaults', () => {
    const defaultApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    expect(defaultApiUrl).toBe('http://localhost:4000');
  });
});
