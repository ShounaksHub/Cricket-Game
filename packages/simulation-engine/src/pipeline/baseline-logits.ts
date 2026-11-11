import type { MatchFormat } from '@cricket/shared-types';
import type { OutcomeLogits } from './types.js';

export const T20_BASELINE_LOGITS: OutcomeLogits = {
  // Calibrated against the engine's situational batting intents and matchup
  // modifiers. The old neutral baseline produced 5.13 RPO / 54.1% dots in
  // the 15-match calibration seed, below the declared T20 target band.
  DOT: -1.494,
  RUN_1: -0.736,
  RUN_2: -2.413,
  RUN_3: -4.962, // ~0.7%
  FOUR: -1.965,
  SIX: -2.601,
  WIDE: -3.689, // ~2.5%
  NO_BALL: -5.521, // ~0.4%
  LEG_BYE: -4.605, // ~1.0%
  BYE: -5.809, // ~0.3%
  WICKET: -3.824,
};

export const T10_BASELINE_LOGITS: OutcomeLogits = {
  DOT: -1.139, // ~32.0%
  RUN_1: -1.079, // ~34.0%
  RUN_2: -2.813, // ~6.0%
  RUN_3: -5.298, // ~0.5%
  FOUR: -2.163, // ~11.5%
  SIX: -2.659, // ~7.0%
  WIDE: -3.507, // ~3.0%
  NO_BALL: -5.298, // ~0.5%
  LEG_BYE: -4.828, // ~0.8%
  BYE: -6.215, // ~0.2%
  WICKET: -3.101, // ~4.5%
};

export const ODI_BASELINE_LOGITS: OutcomeLogits = {
  DOT: -0.734, // ~48.0%
  RUN_1: -1.05, // ~35.0%
  RUN_2: -2.733, // ~6.5%
  RUN_3: -4.828, // ~0.8%
  FOUR: -3.037, // ~4.8%
  SIX: -4.423, // ~1.2%
  WIDE: -4.017, // ~1.8%
  NO_BALL: -6.215, // ~0.2%
  LEG_BYE: -4.962, // ~0.7%
  BYE: -6.215, // ~0.2%
  WICKET: -3.576, // ~2.8%
};

export const TEST_BASELINE_LOGITS: OutcomeLogits = {
  DOT: -0.329, // ~72.0%
  RUN_1: -1.743, // ~17.5%
  RUN_2: -3.352, // ~3.5%
  RUN_3: -5.298, // ~0.5%
  FOUR: -3.352, // ~3.5%
  SIX: -5.809, // ~0.3%
  WIDE: -5.116, // ~0.6%
  NO_BALL: -6.215, // ~0.2%
  LEG_BYE: -5.116, // ~0.6%
  BYE: -6.215, // ~0.2%
  WICKET: -3.963, // ~1.9%
};

export function getFormatBaselineLogits(format: MatchFormat): OutcomeLogits {
  switch (format) {
    case 'T10':
      return { ...T10_BASELINE_LOGITS };
    case 'T20':
      return { ...T20_BASELINE_LOGITS };
    case 'ODI':
      return { ...ODI_BASELINE_LOGITS };
    case 'TEST_RED_BALL':
    case 'TEST_PINK_BALL':
      return { ...TEST_BASELINE_LOGITS };
    default:
      return { ...T20_BASELINE_LOGITS };
  }
}
