import { Container, Graphics } from 'pixi.js';
import type { DeliveryEvent, Trajectory2D } from '@cricket/simulation-engine';

export interface BallAnimatorOptions {
  readonly scale: number; // Pixels per meter
}

/**
 * Handles realistic ball physics, parabolic flight, bounce restitution,
 * ground shadows, and motion blur trails in PixiJS v8.
 */
export class BallAnimator {
  readonly container: Container;
  private readonly scale: number;

  private ballGraphic: Graphics;
  private shadowGraphic: Graphics;
  private trailGraphic: Graphics;

  private trailHistory: { x: number; y: number }[] = [];

  constructor(options: BallAnimatorOptions) {
    this.container = new Container();
    this.scale = options.scale;

    this.shadowGraphic = new Graphics();
    this.trailGraphic = new Graphics();
    this.ballGraphic = new Graphics();

    this.container.addChild(this.shadowGraphic);
    this.container.addChild(this.trailGraphic);
    this.container.addChild(this.ballGraphic);
  }

  reset(): void {
    this.ballGraphic.clear();
    this.shadowGraphic.clear();
    this.trailGraphic.clear();
    this.trailHistory = [];
  }

  /**
   * Updates ball position in PixiJS world coordinates during delivery flight (Bowler -> Pitch -> Batter).
   * progress: 0.0 (release) to 1.0 (bat contact).
   */
  updateDeliveryFlight(
    progress: number,
    pitchLengthMeters = 5.0, // distance from stumps where ball pitches
    lateralLineOffsetMeters = 0.2,
  ): { x: number; y: number } {
    const p = Math.max(0, Math.min(1, progress));
    const startY = -10.06 * this.scale;
    const strikerY = 8.84 * this.scale;
    const pitchY = (8.84 - pitchLengthMeters) * this.scale;
    const pitchX = lateralLineOffsetMeters * this.scale;

    let x = 0;
    let y = 0;
    let height = 0;

    if (p <= 0.6) {
      // Phase A: Bowler release to pitch bounce point (0 -> 0.6)
      const subP = p / 0.6;
      x = pitchX * subP;
      y = startY + (pitchY - startY) * subP;
      // Parabolic drop from bowler release height (~2.2m) down to ground (0m)
      height = (1 - subP) * 16 * (1 - subP * 0.4);
    } else {
      // Phase B: Pitch bounce up towards bat contact (0.6 -> 1.0)
      const subP = (p - 0.6) / 0.4;
      x = pitchX + (0 - pitchX) * subP;
      y = pitchY + (strikerY - pitchY) * subP;
      // Rebound bounce arc up to stump/waist height
      height = 4 * 10 * subP * (1 - subP * 0.5);
    }

    this.renderBallAt(x, y, height);
    return { x, y };
  }

  /**
   * Updates ball position during exit stroke (Batter -> Field / Boundary).
   * progress: 0.0 (bat contact) to 1.0 (ball collected or crossed boundary).
   */
  updateExitStroke(
    progress: number,
    trajectory?: Trajectory2D,
    outcome?: string,
  ): { x: number; y: number } {
    const p = Math.max(0, Math.min(1, progress));
    const strikerX = 0;
    const strikerY = 8.84 * this.scale;

    // Default angle & distance if trajectory not explicitly provided
    let angleDeg = trajectory?.angleDegrees ?? 45;
    let distMeters = trajectory?.distanceMeters ?? 40;

    if (outcome === 'SIX') {
      distMeters = Math.max(72, distMeters);
    } else if (outcome === 'FOUR') {
      distMeters = Math.max(68, distMeters);
    } else if (outcome === 'DOT') {
      distMeters = Math.min(18, distMeters);
    }

    // Convert polar coordinates to Cartesian
    // In our coordinate space: 0 deg = down ground (-y), 90 deg = Point (+x), 270 deg = Square Leg (-x)
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    const targetX = Math.cos(rad) * distMeters * this.scale;
    const targetY = strikerY - Math.sin(rad) * distMeters * this.scale;

    const currentX = strikerX + targetX * p;
    const currentY = strikerY + (targetY - strikerY) * p;

    // Height calculation:
    // Airborne shots (SIX or high catches) have high parabolic loft
    // Ground strokes have minimal height with rapid dampening bounces
    let height = 0;
    if (outcome === 'SIX') {
      height = 4 * 28 * p * (1 - p); // High majestic arc
    } else if (trajectory?.isAirborne) {
      height = 4 * 18 * p * (1 - p); // Catchable loft
    } else {
      // Ground stroke: small decaying bounces
      height = Math.max(0, Math.sin(p * Math.PI * 4) * 4 * (1 - p));
    }

    this.renderBallAt(currentX, currentY, height);
    return { x: currentX, y: currentY };
  }

  private renderBallAt(groundX: number, groundY: number, heightPx: number): void {
    // 1. Ball Shadow (ground projection)
    const shadowScale = Math.max(0.4, 1.0 - heightPx / 40);
    this.shadowGraphic.clear();
    this.shadowGraphic.ellipse(groundX, groundY, 4 * shadowScale, 2.5 * shadowScale);
    this.shadowGraphic.fill({ color: 0x000000, alpha: 0.35 * shadowScale });

    // 2. Ball Sphere (lifted vertically by height)
    const ballY = groundY - heightPx;
    this.ballGraphic.clear();
    // Red / White Leather Ball with shine
    this.ballGraphic.circle(groundX, ballY, 4);
    this.ballGraphic.fill({ color: 0xdc2626 }); // Crimson Red Leather
    this.ballGraphic.stroke({ color: 0xffffff, width: 0.8 }); // White seam
    // Specular highlight
    this.ballGraphic.circle(groundX - 1.2, ballY - 1.2, 1.2);
    this.ballGraphic.fill({ color: 0xffffff, alpha: 0.8 });

    // 3. Motion Blur Trail
    this.trailHistory.push({ x: groundX, y: ballY });
    if (this.trailHistory.length > 8) {
      this.trailHistory.shift();
    }

    this.trailGraphic.clear();
    if (this.trailHistory.length > 2) {
      for (let i = 1; i < this.trailHistory.length; i++) {
        const ptA = this.trailHistory[i - 1];
        const ptB = this.trailHistory[i];
        const alpha = (i / this.trailHistory.length) * 0.45;
        this.trailGraphic.moveTo(ptA.x, ptA.y);
        this.trailGraphic.lineTo(ptB.x, ptB.y);
        this.trailGraphic.stroke({ color: 0xffffff, width: 2, alpha });
      }
    }
  }
}
