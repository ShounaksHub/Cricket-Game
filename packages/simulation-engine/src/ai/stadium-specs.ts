import type { DeliveryOutcome } from '../contracts/types.js';

export interface StadiumSpec {
  readonly id: string;
  readonly name: string;
  readonly city: string;
  readonly country: string;
  readonly averageBoundaryRadiusMeters: number;
  readonly altitudeMeters: number;
  readonly capacity: number;
}

export const VERIFIED_STADIUMS: readonly StadiumSpec[] = [
  {
    id: 'stadium-mcg',
    name: 'Melbourne Cricket Ground',
    city: 'Melbourne',
    country: 'Australia',
    averageBoundaryRadiusMeters: 82, // Giant ground
    altitudeMeters: 20,
    capacity: 100024,
  },
  {
    id: 'stadium-wankhede',
    name: 'Wankhede Stadium',
    city: 'Mumbai',
    country: 'India',
    averageBoundaryRadiusMeters: 64, // Small ground
    altitudeMeters: 10,
    capacity: 33108,
  },
  {
    id: 'stadium-chinnaswamy',
    name: 'M. Chinnaswamy Stadium',
    city: 'Bengaluru',
    country: 'India',
    averageBoundaryRadiusMeters: 62, // Small ground, high altitude
    altitudeMeters: 920,
    capacity: 40000,
  },
  {
    id: 'stadium-lords',
    name: "Lord's Cricket Ground",
    city: 'London',
    country: 'England',
    averageBoundaryRadiusMeters: 72,
    altitudeMeters: 35,
    capacity: 31100,
  },
  {
    id: 'stadium-wanderers',
    name: 'The Wanderers Stadium',
    city: 'Johannesburg',
    country: 'South Africa',
    averageBoundaryRadiusMeters: 70,
    altitudeMeters: 1750, // Extreme high altitude thin air
    capacity: 34000,
  },
  {
    id: 'stadium-eden',
    name: 'Eden Gardens',
    city: 'Kolkata',
    country: 'India',
    averageBoundaryRadiusMeters: 74,
    altitudeMeters: 15,
    capacity: 68000,
  },
];

export function getStadiumById(stadiumId: string): StadiumSpec {
  const found = VERIFIED_STADIUMS.find((s) => s.id === stadiumId);
  if (found) return found;
  // Default to Melbourne Cricket Ground
  return VERIFIED_STADIUMS[0];
}

/**
 * Calculates logit adjustments resulting from stadium boundary dimensions and altitude:
 * - Small grounds (< 66m): Significant boost to FOUR and SIX; reduced long running 2s/3s.
 * - Massive grounds (> 78m): Suppresses SIX; increases RUN_2 and RUN_3 into deep outfields.
 * - High altitude (> 800m): Thin air reduces aerodynamic drag, boosting aerial ball flight.
 */
export function calculateStadiumDeltas(
  stadium: StadiumSpec,
): Partial<Record<DeliveryOutcome, number>> {
  const deltas: Partial<Record<DeliveryOutcome, number>> = {};

  // 1. Boundary Radius Impact
  if (stadium.averageBoundaryRadiusMeters <= 65) {
    deltas.FOUR = 0.35;
    deltas.SIX = 0.45;
    deltas.RUN_2 = -0.2;
    deltas.RUN_3 = -0.3;
    deltas.DOT = -0.2;
  } else if (stadium.averageBoundaryRadiusMeters >= 78) {
    deltas.SIX = -0.4;
    deltas.FOUR = -0.2;
    deltas.RUN_2 = 0.35;
    deltas.RUN_3 = 0.3;
  }

  // 2. Altitude / Thin Air Aerodynamics
  if (stadium.altitudeMeters > 700) {
    const thinAirBonus = Math.min(0.35, (stadium.altitudeMeters / 1750) * 0.3);
    deltas.SIX = (deltas.SIX ?? 0) + thinAirBonus;
  }

  return deltas;
}
