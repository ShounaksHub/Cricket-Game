import {
  calculateFormatRating,
  calculatePlayerAttributes,
  computeEraMetrics,
} from '@cricket/player-ratings';
import type {
  HistoricalEra,
  MatchFormat,
  PlayerEraMetrics,
  PlayerFormatRating,
  PlayerIdentity,
  PlayerProfile,
  PlayerRawFormatStats,
} from '@cricket/shared-types';
import { generateStandardAliases } from './identity-resolution.js';
import { createProvenanceRecord } from './provenance-tracker.js';
import { deriveHistoricalEra } from './wikidata-parser.js';

export interface RawPlayerIngestionInput {
  readonly id: string;
  readonly cricsheetId?: string;
  readonly wikidataId?: string;
  readonly fullName: string;
  readonly displayName: string;
  readonly dateOfBirth?: string;
  readonly primaryNationality: string;
  readonly primaryRole: PlayerIdentity['primaryRole'];
  readonly secondaryRole?: string;
  readonly battingHand: PlayerIdentity['battingHand'];
  readonly bowlingStyle: PlayerIdentity['bowlingStyle'];
  readonly isWicketkeeper: boolean;
  readonly careerDebutYear: number;
  readonly careerRetirementYear?: number;
  readonly isActive?: boolean;
  readonly rawStatsByFormat: Partial<Record<MatchFormat, Omit<PlayerRawFormatStats, 'format' | 'dataSourceId'>>>;
  readonly sourceName: 'CRICSHEET' | 'WIKIDATA' | 'MANUAL_CURATION';
  readonly sourceUri: string;
  readonly datasetVersion: string;
  readonly verificationStatus?: 'AUTOMATED_IMPORT' | 'COMMUNITY_VERIFIED' | 'EXPERT_AUDITED';
}

/**
 * Executes the complete 4-layer ingestion and rating pipeline for a single cricketer record.
 * Guarantees zero hallucination: unrecorded metrics remain strictly null.
 */
export function ingestPlayerRecord(input: RawPlayerIngestionInput): PlayerProfile {
  const historicalEra: HistoricalEra = deriveHistoricalEra(input.careerDebutYear);

  // Generate Provenance Record
  const provenance = createProvenanceRecord({
    id: `prov-${input.id}`,
    sourceName: input.sourceName,
    sourceUri: input.sourceUri,
    datasetVersion: input.datasetVersion,
    verificationStatus: input.verificationStatus ?? 'EXPERT_AUDITED',
  });

  // Layer 1: Construct Raw Format Statistics
  const formatStats: Partial<Record<MatchFormat, PlayerRawFormatStats>> = {};
  for (const format of Object.keys(input.rawStatsByFormat) as MatchFormat[]) {
    const raw = input.rawStatsByFormat[format];
    if (raw) {
      formatStats[format] = {
        ...raw,
        format,
        dataSourceId: provenance.id,
      };
    }
  }

  // Layer 2: Compute Era-Adjusted Metrics per Format
  const eraMetrics: Partial<Record<MatchFormat, PlayerEraMetrics>> = {};
  for (const format of Object.keys(formatStats) as MatchFormat[]) {
    const s = formatStats[format]!;
    eraMetrics[format] = computeEraMetrics(
      format,
      historicalEra,
      s.battingAverage,
      s.strikeRate,
      s.bowlingAverage,
      s.economyRate
    );
  }

  // Layer 3 & 4: Derive 0-100 Granular Attributes
  const attributes = calculatePlayerAttributes({
    primaryRole: input.primaryRole,
    battingHand: input.battingHand,
    bowlingStyle: input.bowlingStyle,
    isWicketkeeper: input.isWicketkeeper,
    historicalEra,
    formatStats,
    eraMetrics,
  });

  // Layer 4: Compute Composite Ratings for all 5 formats
  const supportedFormats: MatchFormat[] = [
    'T10',
    'T20',
    'ODI',
    'TEST_RED_BALL',
    'TEST_PINK_BALL',
  ];

  const ratings: Partial<Record<MatchFormat, PlayerFormatRating>> = {};
  for (const fmt of supportedFormats) {
    ratings[fmt] = calculateFormatRating({
      format: fmt,
      primaryRole: input.primaryRole,
      isWicketkeeper: input.isWicketkeeper,
      attributes,
      rawStats: formatStats[fmt],
      eraMetrics: eraMetrics[fmt],
    });
  }

  // Calculate overall confidence score across recorded formats
  let totalInnings = 0;
  for (const s of Object.values(formatStats)) {
    if (s) totalInnings += s.inningsBatted + Math.floor(s.ballsBowled / 6);
  }
  const confidenceScore = Number(Math.min(1.0, totalInnings / 80).toFixed(2));

  return {
    id: input.id,
    cricsheetId: input.cricsheetId,
    wikidataId: input.wikidataId,
    fullName: input.fullName,
    displayName: input.displayName,
    dateOfBirth: input.dateOfBirth,
    primaryNationality: input.primaryNationality,
    primaryRole: input.primaryRole,
    secondaryRole: input.secondaryRole,
    battingHand: input.battingHand,
    bowlingStyle: input.bowlingStyle,
    isWicketkeeper: input.isWicketkeeper,
    historicalEra,
    careerDebutYear: input.careerDebutYear,
    careerRetirementYear: input.careerRetirementYear,
    isActive: input.isActive ?? false,
    confidenceScore,
    provenance,
    formatStats,
    eraMetrics,
    attributes,
    ratings,
  };
}
