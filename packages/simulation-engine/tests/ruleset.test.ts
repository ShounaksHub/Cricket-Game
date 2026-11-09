import { describe, expect, it } from 'vitest';
import { T20Ruleset, getRulesetForFormat } from '../src/rulesets/index.js';
import { createInitialInningsState } from '../src/state/index.js';

describe('T20 Ruleset Engine & Playing Conditions (P4.3)', () => {
  const ruleset = new T20Ruleset();

  it('enforces T20 international limits and powerplay boundaries', () => {
    expect(ruleset.format).toBe('T20');
    expect(ruleset.maxOversPerInnings).toBe(20);
    expect(ruleset.maxOversPerBowler).toBe(4);
    expect(ruleset.legalBallsPerOver).toBe(6);
    expect(ruleset.freeHitAfterNoBall).toBe(true);

    // Powerplay (Overs 1-6, i.e., over indices 0 to 5)
    expect(ruleset.isPowerplayActive(0)).toBe(true);
    expect(ruleset.isPowerplayActive(5)).toBe(true);
    expect(ruleset.isPowerplayActive(6)).toBe(false);

    expect(ruleset.maxFieldersOutsideCircle(0)).toBe(2);
    expect(ruleset.maxFieldersOutsideCircle(5)).toBe(2);
    expect(ruleset.maxFieldersOutsideCircle(6)).toBe(5);
    expect(ruleset.maxFieldersOutsideCircle(19)).toBe(5);
  });

  it('prohibits consecutive overs by the same bowler (MCC Law 21.7)', () => {
    const check1 = ruleset.canBowlerBowlOver('bowler-A', 'bowler-A', 1);
    expect(check1.allowed).toBe(false);
    expect(check1.reason).toContain('consecutive');

    const check2 = ruleset.canBowlerBowlOver('bowler-A', 'bowler-B', 1);
    expect(check2.allowed).toBe(true);
  });

  it('enforces maximum bowler quota of 4 overs in T20', () => {
    const check1 = ruleset.canBowlerBowlOver('bowler-A', 'bowler-B', 3);
    expect(check1.allowed).toBe(true);

    const check2 = ruleset.canBowlerBowlOver('bowler-A', 'bowler-B', 4);
    expect(check2.allowed).toBe(false);
    expect(check2.reason).toContain('maximum quota (4 overs)');
  });

  it('evaluates innings completion conditions in T20', () => {
    const inn = createInitialInningsState(
      1,
      'team-1',
      'team-2',
      [{ playerId: 'p1', battingOrder: 1 }, { playerId: 'p2', battingOrder: 2 }],
      [{ playerId: 'b1' }]
    );

    // Not over initially
    expect(ruleset.isInningsOver(inn)).toBe(false);

    // All out at 10 wickets
    const allOutInn = { ...inn, totalWickets: 10 };
    expect(ruleset.isInningsOver(allOutInn)).toBe(true);

    // 20 overs completed
    const oversDoneInn = { ...inn, completedOvers: 20 };
    expect(ruleset.isInningsOver(oversDoneInn)).toBe(true);

    // Target achieved in chasing innings
    const chasingInn = { ...inn, targetRuns: 160, totalRuns: 161 };
    expect(ruleset.isInningsOver(chasingInn)).toBe(true);

    const chasingNotDone = { ...inn, targetRuns: 160, totalRuns: 155 };
    expect(ruleset.isInningsOver(chasingNotDone)).toBe(false);
  });

  it('returns format-specific rulesets for ODI and Test via factory', () => {
    const odi = getRulesetForFormat('ODI');
    expect(odi.format).toBe('ODI');
    expect(odi.maxOversPerInnings).toBe(50);
    expect(odi.maxOversPerBowler).toBe(10);
    expect(odi.maxFieldersOutsideCircle(5)).toBe(2); // P1
    expect(odi.maxFieldersOutsideCircle(25)).toBe(4); // P2
    expect(odi.maxFieldersOutsideCircle(45)).toBe(5); // P3

    const test = getRulesetForFormat('TEST_RED_BALL');
    expect(test.format).toBe('TEST_RED_BALL');
    expect(test.maxOversPerInnings).toBeGreaterThan(100);
    expect(test.freeHitAfterNoBall).toBe(false);
  });
});
