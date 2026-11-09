import { describe, it, expect } from 'vitest';
import {
  calculateEnvironmentalDeltas,
  calculateWearIncrement,
  type EnvironmentalImpactInput,
} from '../src/index.js';
import type { EnvironmentalConditions } from '../src/contracts/types.js';

const dryConditions: EnvironmentalConditions = {
  ambientTemperatureC: 28,
  humidityPercentage: 40,
  cloudCoverPercentage: 10,
  dewFactor: 0.0,
};

const heavyDewConditions: EnvironmentalConditions = {
  ambientTemperatureC: 22,
  humidityPercentage: 85,
  cloudCoverPercentage: 20,
  dewFactor: 0.85,
};

const overcastSwingConditions: EnvironmentalConditions = {
  ambientTemperatureC: 20,
  humidityPercentage: 80,
  cloudCoverPercentage: 90,
  dewFactor: 0.0,
};

describe('Environment Feature P4.8: Pitch Deterioration and Weather/Dew Modifiers', () => {
  it('should model heavy dew neutralizing spinners and boosting boundary scoring', () => {
    const drySpinnerInput: EnvironmentalImpactInput = {
      pitchType: 'TURNING',
      conditions: dryConditions,
      pitchWearIndex: 0.3,
      ballWearIndex: 0.3,
      bowlerStyle: 'RIGHT_ARM_LEG_BREAK',
      isPowerplay: false,
    };

    const wetSpinnerInput: EnvironmentalImpactInput = {
      ...drySpinnerInput,
      conditions: heavyDewConditions,
    };

    const dryDeltas = calculateEnvironmentalDeltas(drySpinnerInput);
    const wetDeltas = calculateEnvironmentalDeltas(wetSpinnerInput);

    // Dew makes spinners unable to grip the wet ball: wicket threat drops
    expect((wetDeltas.WICKET ?? 0)).toBeLessThan((dryDeltas.WICKET ?? 0));

    // Wet conditions skid on: boundaries elevated
    expect(wetDeltas.FOUR).toBeGreaterThan(0.3);
    expect(wetDeltas.SIX).toBeGreaterThan(0.15);
  });

  it('should increase pace bowler wide and no-ball error rates under heavy dew', () => {
    const wetPaceInput: EnvironmentalImpactInput = {
      pitchType: 'HARD',
      conditions: heavyDewConditions,
      pitchWearIndex: 0.1,
      ballWearIndex: 0.2,
      bowlerStyle: 'RIGHT_ARM_FAST',
      isPowerplay: false,
    };

    const deltas = calculateEnvironmentalDeltas(wetPaceInput);

    expect(deltas.WIDE).toBeGreaterThan(0.2);
    expect(deltas.NO_BALL).toBeGreaterThan(0.1);
  });

  it('should enhance new-ball pacer swing in overcast, humid conditions', () => {
    const overcastPaceInput: EnvironmentalImpactInput = {
      pitchType: 'HARD',
      conditions: overcastSwingConditions,
      pitchWearIndex: 0.05,
      ballWearIndex: 0.1, // Brand new ball
      bowlerStyle: 'RIGHT_ARM_FAST',
      isPowerplay: true,
    };

    const clearPaceInput: EnvironmentalImpactInput = {
      ...overcastPaceInput,
      conditions: dryConditions,
    };

    const overcastDeltas = calculateEnvironmentalDeltas(overcastPaceInput);
    const clearDeltas = calculateEnvironmentalDeltas(clearPaceInput);

    expect(overcastDeltas.WICKET ?? 0).toBeGreaterThan(clearDeltas.WICKET ?? 0);
    expect(overcastDeltas.DOT ?? 0).toBeGreaterThan(clearDeltas.DOT ?? 0);
  });

  it('should compound spin threat on turning pitches as pitch wear index advances', () => {
    const freshPitchInput: EnvironmentalImpactInput = {
      pitchType: 'TURNING',
      conditions: dryConditions,
      pitchWearIndex: 0.2,
      ballWearIndex: 0.3,
      bowlerStyle: 'RIGHT_ARM_OFF_BREAK',
      isPowerplay: false,
    };

    const deterioratedPitchInput: EnvironmentalImpactInput = {
      ...freshPitchInput,
      pitchWearIndex: 0.85, // Heavily worn, abrasive surface
    };

    const freshDeltas = calculateEnvironmentalDeltas(freshPitchInput);
    const wornDeltas = calculateEnvironmentalDeltas(deterioratedPitchInput);

    expect(wornDeltas.WICKET ?? 0).toBeGreaterThan(freshDeltas.WICKET ?? 0);
    expect(wornDeltas.DOT ?? 0).toBeGreaterThan(freshDeltas.DOT ?? 0);
    expect((wornDeltas.FOUR ?? 0)).toBeLessThan((freshDeltas.FOUR ?? 0));
  });

  it('should produce batting paradise boosts on flat pitches', () => {
    const flatPitchInput: EnvironmentalImpactInput = {
      pitchType: 'FLAT',
      conditions: dryConditions,
      pitchWearIndex: 0.1,
      ballWearIndex: 0.2,
      bowlerStyle: 'RIGHT_ARM_MEDIUM',
      isPowerplay: false,
    };

    const deltas = calculateEnvironmentalDeltas(flatPitchInput);

    expect(deltas.FOUR).toBeGreaterThan(0.3);
    expect(deltas.SIX).toBeGreaterThan(0.2);
    expect(deltas.WICKET).toBeLessThan(0);
    expect(deltas.DOT).toBeLessThan(0);
  });

  it('should increment pitch and ball wear on legal deliveries only', () => {
    const legalT20Wear = calculateWearIncrement('T20', true);
    expect(legalT20Wear.pitchWearDelta).toBeGreaterThan(0);
    expect(legalT20Wear.ballWearDelta).toBeGreaterThan(0);

    const illegalWear = calculateWearIncrement('T20', false);
    expect(illegalWear.pitchWearDelta).toBe(0);
    expect(illegalWear.ballWearDelta).toBe(0);

    const testWear = calculateWearIncrement('TEST_RED_BALL', true);
    // Test ball wear per delivery is slower than T20
    expect(testWear.ballWearDelta).toBeLessThan(legalT20Wear.ballWearDelta);
  });
});
