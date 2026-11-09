import type { DataSourceProvenance, LicenseType } from '@cricket/shared-types';

export interface CreateProvenanceInput {
  readonly id?: string;
  readonly sourceName: 'CRICSHEET' | 'WIKIDATA' | 'DBPEDIA' | 'COMMONS' | 'MANUAL_CURATION';
  readonly sourceUri: string;
  readonly datasetVersion: string;
  readonly verificationStatus?: 'AUTOMATED_IMPORT' | 'COMMUNITY_VERIFIED' | 'EXPERT_AUDITED';
  readonly notes?: string;
}

/**
 * Creates an immutable DataSourceProvenance record with strict per-source licensing.
 */
export function createProvenanceRecord(input: CreateProvenanceInput): DataSourceProvenance {
  let licenseType: LicenseType = 'OPEN_DATA';
  let attributionNotice = '';

  switch (input.sourceName) {
    case 'CRICSHEET':
      licenseType = 'CC_BY_4_0';
      attributionNotice =
        'Data provided by Cricsheet.org under Creative Commons Attribution (CC-BY 4.0) International License.';
      break;
    case 'WIKIDATA':
      licenseType = 'PUBLIC_DOMAIN';
      attributionNotice =
        'Biographical data sourced from Wikidata under Creative Commons CC0 1.0 Universal Public Domain Dedication.';
      break;
    case 'COMMONS':
      licenseType = 'CC_BY_SA_4_0';
      attributionNotice =
        'Image asset sourced from Wikimedia Commons under Creative Commons Attribution-ShareAlike.';
      break;
    case 'DBPEDIA':
      licenseType = 'CC_BY_SA_4_0';
      attributionNotice = 'Data sourced from DBpedia under CC-BY-SA 3.0 / GNU Free Documentation License.';
      break;
    case 'MANUAL_CURATION':
      licenseType = 'OPEN_DATA';
      attributionNotice =
        'Expert-audited historical scorecard compilation cross-verified against multiple independent open archives.';
      break;
  }

  return {
    id: input.id ?? `prov-${input.sourceName.toLowerCase()}-${Date.now()}`,
    sourceName: input.sourceName,
    sourceUri: input.sourceUri,
    licenseType,
    datasetVersion: input.datasetVersion,
    ingestionTimestamp: new Date().toISOString(),
    attributionNotice,
    verificationStatus: input.verificationStatus ?? 'AUTOMATED_IMPORT',
    notes: input.notes,
  };
}
