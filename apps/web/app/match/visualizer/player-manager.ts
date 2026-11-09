import { Container, Graphics } from 'pixi.js';
import type { FieldPreset } from '@cricket/simulation-engine';
import type { BattingHand, BowlingStyle } from '@cricket/shared-types';
import type { FielderPosition } from './types';

export interface PlayerManagerOptions {
  readonly scale: number; // Pixels per meter
  readonly fieldPreset: FieldPreset;
  readonly battingHand: BattingHand;
  readonly bowlingStyle: BowlingStyle;
  readonly battingTeamColor?: number;
  readonly bowlingTeamColor?: number;
}

export function getFieldPresetPositions(
  preset: FieldPreset,
  isLeftHand: boolean,
  isSpin: boolean,
): FielderPosition[] {
  // Base polar coordinates (angle in degrees from striker, distance in meters)
  // Striker is at (0, 8.84m). Angles: 0 = straight down ground (long-off/on), 90 = Point (off-side), 270 = Square Leg (leg-side)
  let rawPositions: { role: string; angleDeg: number; distM: number; isBoundary: boolean }[] = [];

  switch (preset) {
    case 'ATTACKING_CLOSE_CATCHERS':
      rawPositions = [
        { role: 'Slip 1', angleDeg: 160, distM: 14, isBoundary: false },
        { role: 'Slip 2', angleDeg: 150, distM: 16, isBoundary: false },
        { role: 'Gully', angleDeg: 130, distM: 18, isBoundary: false },
        { role: 'Cover', angleDeg: 60, distM: 25, isBoundary: false },
        { role: 'Mid Off', angleDeg: 25, distM: 26, isBoundary: false },
        { role: 'Mid On', angleDeg: 335, distM: 26, isBoundary: false },
        { role: 'Short Leg', angleDeg: 215, distM: 12, isBoundary: false },
        { role: 'Deep Fine Leg', angleDeg: 225, distM: 65, isBoundary: true },
        { role: 'Deep Mid Wicket', angleDeg: 300, distM: 65, isBoundary: true },
      ];
      break;

    case 'DEATH_BOUNDARY_DEFENSE':
      rawPositions = [
        { role: 'Deep Backward Point', angleDeg: 120, distM: 64, isBoundary: true },
        { role: 'Deep Cover', angleDeg: 65, distM: 65, isBoundary: true },
        { role: 'Long Off', angleDeg: 20, distM: 68, isBoundary: true },
        { role: 'Long On', angleDeg: 340, distM: 68, isBoundary: true },
        { role: 'Deep Mid Wicket', angleDeg: 295, distM: 66, isBoundary: true },
        { role: 'Short Third', angleDeg: 145, distM: 24, isBoundary: false },
        { role: 'Extra Cover', angleDeg: 45, distM: 26, isBoundary: false },
        { role: 'Mid Wicket', angleDeg: 315, distM: 25, isBoundary: false },
        { role: 'Short Fine Leg', angleDeg: 215, distM: 22, isBoundary: false },
      ];
      break;

    case 'SPIN_CHOKE':
      rawPositions = [
        { role: 'Slip', angleDeg: 155, distM: 14, isBoundary: false },
        { role: 'Backward Point', angleDeg: 105, distM: 22, isBoundary: false },
        { role: 'Cover Point', angleDeg: 75, distM: 24, isBoundary: false },
        { role: 'Extra Cover', angleDeg: 40, distM: 25, isBoundary: false },
        { role: 'Mid On', angleDeg: 335, distM: 26, isBoundary: false },
        { role: 'Short Mid Wicket', angleDeg: 310, distM: 20, isBoundary: false },
        { role: 'Square Leg', angleDeg: 265, distM: 24, isBoundary: false },
        { role: 'Long Off', angleDeg: 20, distM: 66, isBoundary: true },
        { role: 'Deep Mid Wicket', angleDeg: 295, distM: 66, isBoundary: true },
      ];
      break;

    case 'BALANCED_RING':
    default:
      rawPositions = [
        { role: 'Point', angleDeg: 90, distM: 25, isBoundary: false },
        { role: 'Cover', angleDeg: 55, distM: 26, isBoundary: false },
        { role: 'Mid Off', angleDeg: 20, distM: 27, isBoundary: false },
        { role: 'Mid On', angleDeg: 340, distM: 27, isBoundary: false },
        { role: 'Mid Wicket', angleDeg: 305, distM: 25, isBoundary: false },
        { role: 'Square Leg', angleDeg: 270, distM: 24, isBoundary: false },
        { role: 'Deep Cover', angleDeg: 65, distM: 65, isBoundary: true },
        { role: 'Long On', angleDeg: 345, distM: 68, isBoundary: true },
        { role: 'Deep Square Leg', angleDeg: 255, distM: 64, isBoundary: true },
      ];
      break;
  }

  const strikerY = 8.84; // Strikers popping crease

  return rawPositions.map((pos, idx) => {
    let angle = pos.angleDeg;
    if (isLeftHand) {
      // Mirror across pitch axis for left-handed batter
      angle = (360 - angle) % 360;
    }
    const rad = ((angle - 90) * Math.PI) / 180;
    const x = Math.cos(rad) * pos.distM;
    const y = strikerY - Math.sin(rad) * pos.distM;

    return {
      id: `fielder-${idx + 1}`,
      name: pos.role,
      role: pos.role,
      x,
      y,
      isBoundary: pos.isBoundary,
    };
  });
}

/**
 * Creates and manages player sprites (Bowler, Striker, Non-Striker, Wicketkeeper, Fielders).
 */
export class PlayerManager {
  readonly container: Container;
  private readonly scale: number;
  private readonly isLeftHand: boolean;
  private readonly isSpin: boolean;
  private readonly batColor: number;
  private readonly bowlColor: number;

  private fieldersContainer: Container;
  private strikerGraphic: Graphics;
  private nonStrikerGraphic: Graphics;
  private bowlerGraphic: Graphics;
  private keeperGraphic: Graphics;

  constructor(options: PlayerManagerOptions) {
    this.container = new Container();
    this.scale = options.scale;
    this.isLeftHand = options.battingHand === 'LEFT_HAND';
    this.isSpin =
      options.bowlingStyle.includes('BREAK') ||
      options.bowlingStyle.includes('SPIN') ||
      options.bowlingStyle.includes('SLOW');
    this.batColor = options.battingTeamColor ?? 0x2563eb; // Royal Blue
    this.bowlColor = options.bowlingTeamColor ?? 0xd97706; // Amber / Gold

    this.fieldersContainer = new Container();
    this.container.addChild(this.fieldersContainer);

    this.strikerGraphic = new Graphics();
    this.nonStrikerGraphic = new Graphics();
    this.bowlerGraphic = new Graphics();
    this.keeperGraphic = new Graphics();

    this.container.addChild(this.keeperGraphic);
    this.container.addChild(this.nonStrikerGraphic);
    this.container.addChild(this.strikerGraphic);
    this.container.addChild(this.bowlerGraphic);

    this.updateFielders(options.fieldPreset);
    this.renderKeyPlayers();
  }

  updateFielders(preset: FieldPreset): void {
    this.fieldersContainer.removeChildren();
    const positions = getFieldPresetPositions(preset, this.isLeftHand, this.isSpin);

    for (const pos of positions) {
      const fg = new Graphics();
      const px = pos.x * this.scale;
      const py = pos.y * this.scale;

      // Drop shadow
      fg.circle(px + 1.5, py + 2.5, 5);
      fg.fill({ color: 0x000000, alpha: 0.35 });

      // Fielder body (Bowling Team Kit)
      fg.circle(px, py, 5.5);
      fg.fill({ color: this.bowlColor });
      fg.stroke({ color: 0xffffff, width: 1.2 });

      // Cap / Head
      fg.circle(px, py - 1.5, 2.8);
      fg.fill({ color: 0xffffff });

      this.fieldersContainer.addChild(fg);
    }
  }

  private renderKeyPlayers(): void {
    // 1. Striker Batter (at popping crease y = +8.84m)
    const strikerY = 8.84 * this.scale;
    const strikerX = (this.isLeftHand ? 0.6 : -0.6) * this.scale;

    this.strikerGraphic.clear();
    // Shadow
    this.strikerGraphic.circle(strikerX + 1.5, strikerY + 2.5, 6.5);
    this.strikerGraphic.fill({ color: 0x000000, alpha: 0.4 });
    // Batter Pads & Body (Batting Team Kit)
    this.strikerGraphic.circle(strikerX, strikerY, 6.5);
    this.strikerGraphic.fill({ color: this.batColor });
    this.strikerGraphic.stroke({ color: 0xffffff, width: 1.5 });
    // Helmet
    this.strikerGraphic.circle(strikerX, strikerY - 2, 3.2);
    this.strikerGraphic.fill({ color: 0x1e293b });
    // Bat
    this.strikerGraphic.rect(strikerX + (this.isLeftHand ? -8 : 5), strikerY - 6, 2.5, 10);
    this.strikerGraphic.fill({ color: 0xefd8a1 });

    // 2. Non-Striker (at bowler popping crease y = -8.84m)
    const nonStrikerY = -8.84 * this.scale;
    const nonStrikerX = (this.isLeftHand ? -1.2 : 1.2) * this.scale;

    this.nonStrikerGraphic.clear();
    this.nonStrikerGraphic.circle(nonStrikerX + 1.5, nonStrikerY + 2.5, 6);
    this.nonStrikerGraphic.fill({ color: 0x000000, alpha: 0.35 });
    this.nonStrikerGraphic.circle(nonStrikerX, nonStrikerY, 6);
    this.nonStrikerGraphic.fill({ color: this.batColor });
    this.nonStrikerGraphic.stroke({ color: 0xffffff, width: 1.2 });
    this.nonStrikerGraphic.circle(nonStrikerX, nonStrikerY - 1.5, 3);
    this.nonStrikerGraphic.fill({ color: 0x1e293b });

    // 3. Wicketkeeper (behind stumps: 16m for pace, 12m for spin)
    const keeperDist = (this.isSpin ? 11.5 : 16.5) * this.scale;
    const keeperX = (this.isLeftHand ? -0.4 : 0.4) * this.scale;

    this.keeperGraphic.clear();
    this.keeperGraphic.circle(keeperX + 1.5, keeperDist + 2.5, 6);
    this.keeperGraphic.fill({ color: 0x000000, alpha: 0.35 });
    this.keeperGraphic.circle(keeperX, keeperDist, 6);
    this.keeperGraphic.fill({ color: this.bowlColor });
    this.keeperGraphic.stroke({ color: 0xffffff, width: 1.2 });
    // Gloves
    this.keeperGraphic.circle(keeperX - 4, keeperDist - 2, 2.2);
    this.keeperGraphic.circle(keeperX + 4, keeperDist - 2, 2.2);
    this.keeperGraphic.fill({ color: 0xfacc15 });

    // 4. Bowler Initial Position (at delivery crease y = -10.06m)
    this.setBowlerPosition(0, -10.06 * this.scale);
  }

  setBowlerPosition(xPx: number, yPx: number): void {
    this.bowlerGraphic.clear();
    this.bowlerGraphic.circle(xPx + 1.5, yPx + 2.5, 6);
    this.bowlerGraphic.fill({ color: 0x000000, alpha: 0.35 });
    this.bowlerGraphic.circle(xPx, yPx, 6);
    this.bowlerGraphic.fill({ color: this.bowlColor });
    this.bowlerGraphic.stroke({ color: 0xffffff, width: 1.4 });
    this.bowlerGraphic.circle(xPx, yPx - 2, 3);
    this.bowlerGraphic.fill({ color: 0xffffff });
  }
}
