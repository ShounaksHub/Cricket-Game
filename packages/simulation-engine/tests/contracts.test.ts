import { describe, expect, it } from 'vitest';
import type {
  MatchState,
  InningsState,
  DeliveryOutcome,
  DismissalMode,
  SimulationVersionTriad,
  TacticalDeliveryAction,
  MatchSimulationConfig,
} from '../src/contracts/types.js';

describe('Match Simulation Engine Domain Contracts (P4.0)', () => {
  it('enforces the complete versioning triad (sim, rules, rate)', () => {
    const versions: SimulationVersionTriad = {
      simulationVersion: 'sim-1.0.0',
      rulesetVersion: 'rules-t20-icc-2026.1',
      ratingVersion: 'rate-1.0.0',
    };

    expect(versions.simulationVersion).toBe('sim-1.0.0');
    expect(versions.rulesetVersion).toBe('rules-t20-icc-2026.1');
    expect(versions.ratingVersion).toBe('rate-1.0.0');
  });

  it('validates tactical delivery action schema types', () => {
    const action: TacticalDeliveryAction = {
      batterIntent: 'AGGRESSIVE',
      bowlerLine: 'OUTSIDE_OFF',
      bowlerLength: 'GOOD_LENGTH',
      bowlerVariation: 'STOCK',
      fieldPreset: 'BALANCED_RING',
    };

    expect(action.batterIntent).toBe('AGGRESSIVE');
    expect(action.bowlerLine).toBe('OUTSIDE_OFF');
    expect(action.bowlerLength).toBe('GOOD_LENGTH');
    expect(action.fieldPreset).toBe('BALANCED_RING');
  });

  it('validates delivery outcomes and dismissal modes according to cricket laws', () => {
    const outcomes: DeliveryOutcome[] = [
      'DOT',
      'RUN_1',
      'RUN_2',
      'RUN_3',
      'FOUR',
      'SIX',
      'WIDE',
      'NO_BALL',
      'LEG_BYE',
      'BYE',
      'WICKET',
    ];
    expect(outcomes.length).toBe(11);

    const dismissals: DismissalMode[] = [
      'BOWLED',
      'CAUGHT',
      'CAUGHT_BEHIND',
      'LBW',
      'RUN_OUT',
      'STUMPED',
      'HIT_WICKET',
    ];
    expect(dismissals.length).toBe(7);
  });
});
