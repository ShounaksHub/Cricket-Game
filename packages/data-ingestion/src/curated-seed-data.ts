import type { RawPlayerIngestionInput } from './ingestion-pipeline.js';
import { GLOBAL_CRICKET_PLAYER_REGISTRY } from './data/index.js';

/**
 * Curated & Verified Benchmark Cohort
 * Phase 7: Global Cricket Player Registry (1,000+ Verified Players)
 *
 * Tier 1: Modern International & Franchise Players (Cricsheet Ball-by-Ball)
 * Tier 2: Historical Legends across All Eras (Open Archive Scorecards & Wikidata)
 * Tier 3: Domestic & First-Class Specialists across India, Australia, England & Rest of World
 * Strict No Hallucination: Missing historical fields remain null.
 */
export const VERIFIED_BENCHMARK_PLAYERS: RawPlayerIngestionInput[] = GLOBAL_CRICKET_PLAYER_REGISTRY;
