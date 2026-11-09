import type { DeliveryOutcome, Trajectory2D } from '../contracts/types.js';
import type { DeterministicPRNG } from '../prng/splitmix64.js';

/**
 * Generates realistic 2D polar trajectory physics coordinates (angle, elevation, distance)
 * for wagon wheel charting, 2D stadium rendering, and fielder tracking.
 */
export function generateTrajectory(
  outcome: DeliveryOutcome,
  prng: DeterministicPRNG,
): Trajectory2D {
  const angleDegrees = Math.round(prng.nextFloat() * 360);

  switch (outcome) {
    case 'DOT':
      return {
        angleDegrees,
        elevationDegrees: 0,
        distanceMeters: Math.round(prng.nextFloat() * 4 * 10) / 10,
        isGroundStroke: true,
        isAirborne: false,
      };

    case 'RUN_1':
      return {
        angleDegrees,
        elevationDegrees: Math.round(prng.nextFloat() * 5),
        distanceMeters: Math.round((15 + prng.nextFloat() * 20) * 10) / 10,
        isGroundStroke: true,
        isAirborne: false,
      };

    case 'RUN_2':
      return {
        angleDegrees,
        elevationDegrees: Math.round(prng.nextFloat() * 10),
        distanceMeters: Math.round((35 + prng.nextFloat() * 20) * 10) / 10,
        isGroundStroke: true,
        isAirborne: false,
      };

    case 'RUN_3':
      return {
        angleDegrees,
        elevationDegrees: Math.round(prng.nextFloat() * 12),
        distanceMeters: Math.round((45 + prng.nextFloat() * 15) * 10) / 10,
        isGroundStroke: true,
        isAirborne: false,
      };

    case 'FOUR':
      return {
        angleDegrees,
        elevationDegrees: Math.round(prng.nextFloat() * 15),
        distanceMeters: Math.round((68 + prng.nextFloat() * 10) * 10) / 10,
        isGroundStroke: prng.nextFloat() > 0.35,
        isAirborne: prng.nextFloat() <= 0.35,
      };

    case 'SIX':
      return {
        angleDegrees,
        elevationDegrees: Math.round(28 + prng.nextFloat() * 20),
        distanceMeters: Math.round((75 + prng.nextFloat() * 30) * 10) / 10,
        isGroundStroke: false,
        isAirborne: true,
      };

    case 'WIDE':
    case 'NO_BALL':
      return {
        angleDegrees: 0,
        elevationDegrees: 0,
        distanceMeters: 0,
        isGroundStroke: false,
        isAirborne: false,
      };

    case 'LEG_BYE':
    case 'BYE':
      return {
        angleDegrees: Math.round(160 + prng.nextFloat() * 40),
        elevationDegrees: 0,
        distanceMeters: Math.round((10 + prng.nextFloat() * 20) * 10) / 10,
        isGroundStroke: true,
        isAirborne: false,
      };

    case 'WICKET':
      return {
        angleDegrees,
        elevationDegrees: Math.round(prng.nextFloat() * 35),
        distanceMeters: Math.round(prng.nextFloat() * 55 * 10) / 10,
        isGroundStroke: false,
        isAirborne: true,
      };
  }
}
