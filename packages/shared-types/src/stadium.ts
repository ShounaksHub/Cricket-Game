import type { PitchType } from './enums.js';

export interface StadiumProfile {
  readonly id: string;
  readonly officialName: string;
  readonly commonName: string;
  readonly country: string;
  readonly city: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly altitudeMeters: number;
  readonly capacity?: number;
  readonly straightBoundaryMeters: number;
  readonly squareBoundaryMeters: number;
  readonly hasFloodlights: boolean;
  readonly typicalPaceModifier: number;
  readonly typicalSpinModifier: number;
}

export interface PitchProfile {
  readonly id: string;
  readonly stadiumId: string;
  readonly pitchType: PitchType;
  readonly name: string;
  readonly baseBounceRating: number; // 0-100
  readonly baseSeamRating: number; // 0-100
  readonly baseSpinRating: number; // 0-100
  readonly basePaceRating: number; // 0-100
  readonly deteriorationRate: number; // 0.5 to 2.0
  readonly crackingTendency: number; // 0.5 to 2.0
}
