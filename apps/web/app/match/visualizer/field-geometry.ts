import { Container, Graphics } from 'pixi.js';

export interface FieldGeometryOptions {
  readonly boundaryRadiusMeters: number;
  readonly pitchType: 'FLAT' | 'HARD' | 'TURNING' | 'GREEN' | 'DUSTY';
  readonly scale: number; // Pixels per meter (e.g. 5.5 px/m for 1000px canvas)
}

/**
 * Returns hexadecimal color codes corresponding to the pitch type.
 */
function getPitchColor(pitchType: string): { base: number; lines: number; wear: number } {
  switch (pitchType) {
    case 'GREEN':
      return { base: 0x5a7d36, lines: 0xffffff, wear: 0x4a6b2c };
    case 'TURNING':
      return { base: 0xb5894b, lines: 0xffffff, wear: 0x9e733b };
    case 'DUSTY':
      return { base: 0xc4af81, lines: 0xffffff, wear: 0xa89367 };
    case 'HARD':
      return { base: 0xc89862, lines: 0xffffff, wear: 0xab7e4c };
    case 'FLAT':
    default:
      return { base: 0xd9b382, lines: 0xffffff, wear: 0xbf9868 };
  }
}

/**
 * Procedurally draws the complete broadcast cricket field geometry in PixiJS v8:
 * - Concentric mowing turf patterns
 * - Boundary rope with textured markers
 * - 30-yard fielding restriction circle
 * - 22-yard pitch rectangle with realistic turf wear
 * - Regulation MCC crease markings (popping, bowling, return)
 * - Three stumps and bails at striker and bowler ends
 */
export function createFieldGeometry(options: FieldGeometryOptions): Container {
  const container = new Container();
  const g = new Graphics();
  container.addChild(g);

  const { boundaryRadiusMeters, pitchType, scale } = options;
  const boundaryRadiusPx = boundaryRadiusMeters * scale;

  // 0. Outer apron / perimeter track grass beyond the boundary rope
  g.circle(0, 0, boundaryRadiusPx + 10);
  g.fill({ color: 0x072214 });

  // 1. Outfield Base and Alternating Concentric Mowing Bands
  const ringCount = 14;
  const ringWidth = boundaryRadiusPx / ringCount;

  for (let i = ringCount; i >= 1; i--) {
    const r = i * ringWidth;
    const isEven = i % 2 === 0;
    const turfColor = isEven ? 0x0f3b23 : 0x13482b;
    g.circle(0, 0, r);
    g.fill({ color: turfColor });
  }

  // 2. Boundary Rope (White braided line + outer warning track)
  g.circle(0, 0, boundaryRadiusPx + 3);
  g.stroke({ color: 0x081f13, width: 6 });

  g.circle(0, 0, boundaryRadiusPx);
  g.stroke({ color: 0xffffff, width: 3.5 });

  // Boundary sponge markers every 15 degrees
  for (let deg = 0; deg < 360; deg += 15) {
    const rad = (deg * Math.PI) / 180;
    const mx = Math.cos(rad) * boundaryRadiusPx;
    const my = Math.sin(rad) * boundaryRadiusPx;
    g.circle(mx, my, 3);
    g.fill({ color: deg % 30 === 0 ? 0xff4444 : 0xffffff });
  }

  // 3. 30-Yard Fielding Restriction Circle (27.43m radius from each wicket)
  // Two semicircles centered at each wicket connected by straight tangents
  const wicketDistPx = 10.06 * scale; // Half pitch length (stumps at +10.06m and -10.06m)
  const circleRadiusPx = 27.43 * scale;

  g.circle(0, -wicketDistPx, circleRadiusPx);
  g.stroke({ color: 0xffffff, width: 1.5, alpha: 0.45 });

  g.circle(0, wicketDistPx, circleRadiusPx);
  g.stroke({ color: 0xffffff, width: 1.5, alpha: 0.45 });

  // 4. Pitch Turf Rectangle (20.12m long between stumps, 3.05m wide)
  const pitchLengthPx = 22.0 * scale; // Full pitch strip extending beyond stumps
  const pitchWidthPx = 3.2 * scale;
  const colors = getPitchColor(pitchType);

  // Pitch Base
  g.rect(-pitchWidthPx / 2, -pitchLengthPx / 2, pitchWidthPx, pitchLengthPx);
  g.fill({ color: colors.base });
  g.stroke({ color: 0x1a452a, width: 1.5 });

  // Center wear strip
  g.rect(-pitchWidthPx / 4, -pitchLengthPx / 2 + 10, pitchWidthPx / 2, pitchLengthPx - 20);
  g.fill({ color: colors.wear, alpha: 0.4 });

  // 5. Regulation Crease Markings (White Lines)
  // Regulation:
  // Bowling crease: across stumps (2.64m wide, through stumps at y = +/-10.06m)
  // Popping crease: 1.22m in front of bowling crease (y = +/-8.84m)
  // Return creases: perpendicular from bowling crease through popping crease (1.32m from center)
  const bowlingCreaseWidthPx = 2.64 * scale;
  const returnCreaseDistPx = 1.32 * scale;
  const poppingCreaseDistPx = 1.22 * scale;

  const ends = [-wicketDistPx, wicketDistPx]; // Bowler end (-y), Striker end (+y)

  for (const endY of ends) {
    const isStrikerEnd = endY > 0;
    const poppingY = isStrikerEnd ? endY - poppingCreaseDistPx : endY + poppingCreaseDistPx;

    // Bowling crease through stumps
    g.moveTo(-bowlingCreaseWidthPx / 2, endY);
    g.lineTo(bowlingCreaseWidthPx / 2, endY);
    g.stroke({ color: 0xffffff, width: 1.5 });

    // Popping crease (wider, extends across return creases)
    g.moveTo(-pitchWidthPx / 2, poppingY);
    g.lineTo(pitchWidthPx / 2, poppingY);
    g.stroke({ color: 0xffffff, width: 2.0 });

    // Return creases (perpendicular on both sides)
    const returnBackY = isStrikerEnd ? endY + 1.5 * scale : endY - 1.5 * scale;
    // Left return crease
    g.moveTo(-returnCreaseDistPx, poppingY);
    g.lineTo(-returnCreaseDistPx, returnBackY);
    g.stroke({ color: 0xffffff, width: 1.5 });

    // Right return crease
    g.moveTo(returnCreaseDistPx, poppingY);
    g.lineTo(returnCreaseDistPx, returnBackY);
    g.stroke({ color: 0xffffff, width: 1.5 });

    // Stumps (3 wooden stumps + 2 bails)
    const stumpSpacing = 0.11 * scale;
    for (let s = -1; s <= 1; s++) {
      g.circle(s * stumpSpacing, endY, 2.5);
      g.fill({ color: 0xefd8a1 });
      g.stroke({ color: 0x3d2714, width: 0.8 });
    }
  }

  return container;
}
