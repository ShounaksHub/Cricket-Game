import { COHORT_INTERNATIONAL_CONTEMPORARY } from './cohort-international-contemporary.js';
import { COHORT_INTERNATIONAL_LEGENDS } from './cohort-international-legends.js';
import type { RawPlayerIngestionInput } from '../ingestion-pipeline.js';

export { COHORT_INTERNATIONAL_CONTEMPORARY, COHORT_INTERNATIONAL_LEGENDS };

export const GLOBAL_CRICKET_PLAYER_REGISTRY: RawPlayerIngestionInput[] = [
  ...COHORT_INTERNATIONAL_CONTEMPORARY,
  ...COHORT_INTERNATIONAL_LEGENDS,
];
