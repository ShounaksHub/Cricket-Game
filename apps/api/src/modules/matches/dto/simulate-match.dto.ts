import type { MatchFormat } from '@cricket/shared-types';
import type {
  EnvironmentalConditions,
  MatchState,
  BatterIntent,
  BowlingLine,
  BowlingLength,
  BowlingVariation,
  FieldPreset,
} from '@cricket/simulation-engine';

export class SimulateMatchDto {
  team1Id!: string;
  team2Id?: string; // Optional: defaults to AI opponent if omitted or 'ai-opponent'
  format?: MatchFormat; // Defaults to 'T20'
  stadiumId?: string; // Defaults to 'stadium-mcg'
  pitchType?: 'FLAT' | 'GREEN' | 'DUSTY' | 'HARD' | 'TURNING'; // Defaults to 'HARD'
  seed?: string | number; // Optional seed for deterministic reproducibility
  conditions?: EnvironmentalConditions;
}

export class StepDeliveryDto {
  matchId!: string;
  format?: MatchFormat;
  stadiumId?: string;
  pitchType?: 'FLAT' | 'GREEN' | 'DUSTY' | 'HARD' | 'TURNING';
  currentState!: MatchState;
  tactics?: {
    batterIntent?: BatterIntent;
    bowlerLine?: BowlingLine;
    bowlerLength?: BowlingLength;
    bowlerVariation?: BowlingVariation;
    fieldPreset?: FieldPreset;
  };
}
