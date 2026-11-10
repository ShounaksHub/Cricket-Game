import type { LicenseType } from './enums.js';

/**
 * Data Source Provenance & Licensing Metadata (Safeguard 4)
 * Strict per-record provenance prevents blanket licensing assumptions.
 */
export interface DataSourceProvenance {
  readonly id: string;
  readonly sourceName: 'CRICSHEET' | 'WIKIDATA' | 'DBPEDIA' | 'COMMONS' | 'MANUAL_CURATION';
  readonly sourceUri: string;
  readonly licenseType: LicenseType;
  readonly datasetVersion: string;
  readonly ingestionTimestamp: string;
  readonly attributionNotice: string;
  readonly verificationStatus: 'AUTOMATED_IMPORT' | 'COMMUNITY_VERIFIED' | 'EXPERT_AUDITED' | 'STATSGURU_RECONCILED';
  readonly notes?: string;
}

/**
 * Visual Asset Licensing & Attribution
 */
export interface PlayerVisualAsset {
  readonly id: string;
  readonly imageUrl: string;
  readonly thumbnailUrl: string;
  readonly licenseType: LicenseType;
  readonly attributionText: string;
  readonly originalSourceUrl: string;
  readonly isVerified: boolean;
  readonly isPrimary: boolean;
}
