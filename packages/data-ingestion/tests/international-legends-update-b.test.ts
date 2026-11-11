import { describe, expect, it } from 'vitest';
import { COHORT_INTERNATIONAL_LEGENDS } from '../src/index.js';

describe('International Legends cohort update B', () => {
  it('preserves Shane Warne identity and uses the authoritative ODI wicket total', () => {
    const warne = COHORT_INTERNATIONAL_LEGENDS.find((player) => player.fullName === 'Shane Warne');

    expect(warne).toBeDefined();
    expect(warne?.id).toBe('f1e20000-0003-4000-8000-000000000003');
    expect(warne?.rawStatsByFormat.ODI?.matchesPlayed).toBe(194);
    expect(warne?.rawStatsByFormat.ODI?.wicketsTaken).toBe(293);
    expect(warne?.rawStatsByFormat.TEST_RED_BALL?.matchesPlayed).toBe(145);
    expect(warne?.rawStatsByFormat.TEST_RED_BALL?.wicketsTaken).toBe(708);
  });
});
