import { describe, it, expect } from 'vitest';
import {
  FEATURE_REGISTRY,
  getUpcomingFeatures,
  getFeaturesByCategory,
  FeatureStatus,
} from '../lib/feature-registry';

describe('Phase 9.3.3: Transparency & Upcoming Features Registry', () => {
  it('registers all mandatory upcoming and planned features with explicit statuses', () => {
    const requiredFeatureIds = [
      'drs-hawk-eye',
      'rain-dls',
      'super-over',
      'stop-clock',
      'gabba-heist-scenario',
      'replay-viewer',
      'tournament-mode',
      'career-progression',
      'cloud-sync',
      'multiplayer-pvp',
      'commentary-audio',
    ];

    for (const id of requiredFeatureIds) {
      const feat = FEATURE_REGISTRY[id];
      expect(feat, `Feature ${id} must exist in registry`).toBeDefined();
      expect(['COMING_SOON', 'IN_DEVELOPMENT']).toContain(feat.status);
      expect(feat.shortDescription.length).toBeGreaterThan(15);
      expect(feat.detailedRoadmap.length).toBeGreaterThan(20);
      expect(feat.releaseTarget).toBeDefined();
    }
  });

  it('classifies features into proper engineering categories', () => {
    const categories = getFeaturesByCategory();
    expect(categories.GAMEPLAY_SIMULATION.length).toBeGreaterThanOrEqual(4);
    expect(categories.CAREER_TOURNAMENT.length).toBeGreaterThanOrEqual(2);
    expect(categories.ONLINE_IDENTITY.length).toBeGreaterThanOrEqual(2);
    expect(categories.BROADCAST_AUDIO.length).toBeGreaterThanOrEqual(1);
  });

  it('contains no placeholder features marked AVAILABLE prematurely', () => {
    const upcoming = getUpcomingFeatures();
    for (const feat of upcoming) {
      expect(feat.status).not.toBe('AVAILABLE');
    }
  });

  it('cloud-sync and commentary-audio provide honest offline status context', () => {
    const cloudSync = FEATURE_REGISTRY['cloud-sync'];
    expect(cloudSync.detailedRoadmap.toLowerCase()).toContain('offline');
    
    const audio = FEATURE_REGISTRY['commentary-audio'];
    expect(audio.status).toBe('COMING_SOON');
  });
});
