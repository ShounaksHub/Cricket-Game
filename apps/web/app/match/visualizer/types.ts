import type {
  DeliveryEvent,
  Trajectory2D,
  FieldPreset,
} from '@cricket/simulation-engine';
import type { BattingHand, BowlingStyle } from '@cricket/shared-types';

export interface VisualizerDimensions {
  readonly width: number;
  readonly height: number;
  readonly centerX: number;
  readonly centerY: number;
  readonly scale: number;
}

export interface FielderPosition {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly x: number; // meters from pitch center
  readonly y: number; // meters from pitch center
  readonly isBoundary: boolean;
}

export type AnimationPhase =
  | 'IDLE'
  | 'RUN_UP'
  | 'DELIVERY_FLIGHT'
  | 'BAT_CONTACT'
  | 'OUTFIELD_TRAJECTORY'
  | 'CELEBRATION'
  | 'RESOLVED';

export interface VisualizerConfig {
  readonly stadiumId: string;
  readonly boundaryRadiusMeters: number;
  readonly pitchType: 'FLAT' | 'HARD' | 'TURNING' | 'GREEN' | 'DUSTY';
  readonly playbackSpeed: number; // 0.5x, 1x, 2x, 4x
  readonly isDayNight: boolean;
}
