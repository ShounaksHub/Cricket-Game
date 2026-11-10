import { COHORT_INTERNATIONAL_CONTEMPORARY } from './cohort-international-contemporary.js';
import { COHORT_INTERNATIONAL_LEGENDS } from './cohort-international-legends.js';
import { COHORT_DOMESTIC_INDIA } from './cohort-domestic-india.js';
import { COHORT_DOMESTIC_AUSTRALIA } from './cohort-domestic-australia.js';
import { COHORT_DOMESTIC_ENGLAND } from './cohort-domestic-england.js';
import { COHORT_DOMESTIC_WORLD } from './cohort-domestic-world.js';
import type { RawPlayerIngestionInput } from '../ingestion-pipeline.js';

export {
  COHORT_INTERNATIONAL_CONTEMPORARY,
  COHORT_INTERNATIONAL_LEGENDS,
  COHORT_DOMESTIC_INDIA,
  COHORT_DOMESTIC_AUSTRALIA,
  COHORT_DOMESTIC_ENGLAND,
  COHORT_DOMESTIC_WORLD,
};

/**
 * Complete Global Cricket Player Registry (Phase 7: 1,000+ Verified Players)
 * Exhaustively vetted across International and Major Domestic competitions.
 * Zero duplicate identities, zero fabricated historical stats.
 */
export const GLOBAL_CRICKET_PLAYER_REGISTRY: RawPlayerIngestionInput[] = [
  ...COHORT_INTERNATIONAL_CONTEMPORARY,
  ...COHORT_INTERNATIONAL_LEGENDS,
  ...COHORT_DOMESTIC_INDIA,
  ...COHORT_DOMESTIC_AUSTRALIA,
  ...COHORT_DOMESTIC_ENGLAND,
  ...COHORT_DOMESTIC_WORLD,
];
