# PHASE 5 VISUALIZER ARCHITECTURE
## Broadcast-Grade 2D PixiJS Cricket Match Engine Visualizer

**Version:** 1.0.0  
**Target Milestone:** Phase 5 (P5.0 to P5.13)  
**Core Technologies:**
- Rendering Engine: **PixiJS v8** (WebGL 2.0 / WebGPU with 2D Canvas fallback)
- Framework Integration: **React 19 / Next.js 15 Client Island**
- Simulation Binding: **@cricket/simulation-engine** (`sim-1.0.0`)
- Styling & Broadcast UI: **Tailwind CSS + Custom Pixi Graphics Overlays**

---

## 1. Architectural Philosophy & Design Principles

The Phase 5 visualizer adheres to three core design principles:

1. **Deterministic Representation Fidelity:**
   The visualizer never invents or simulates outcomes independently. Every ball flight, bounce coordinate, fielder collection, and boundary celebration is an exact, deterministic presentation of the simulation engine's underlying `DeliveryEvent`, `Trajectory2D`, and `InningsState`.

2. **60 FPS Hardware-Accelerated Performance:**
   Utilizing PixiJS v8's scene graph and batched render pipeline, all ground markings, mowing rings, player indicators, ball trails, and particle effects must maintain locked 60 frames per second on standard desktop and mobile hardware without garbage collector stalls.

3. **Television Broadcast Aesthetic:**
   The presentation emulates modern international cricket television graphics (Sky Sports, Star Sports, ICC TV): crisp grass mowing bands, dynamic wagon-wheel trails, accurate 30-yard fielding restrictions, clean TV lower-third scoreboards, and animated umpire signals.

---

## 2. PixiJS v8 Scene Graph Hierarchy

The visualization scene graph is structured into ordered, layered containers within the PixiJS `Application.stage`:

```
Pixi.Application (stage)
├── GroundContainer (z-index: 10)
│   ├── OutfieldBase (Stadium boundary ellipse)
│   ├── OutfieldMowingBands (Concentric alternating rings)
│   ├── BoundaryRope (Textured dashed boundary line)
│   ├── InfieldCircle (30-yard fielding restriction circle)
│   ├── PitchRectangle (Turf rectangle: 20.12m x 3.05m)
│   ├── CreaseMarkings (Bowling crease, popping crease, return creases)
│   └── Wickets (Striker-end & bowler-end stumps + bails)
├── OverlayFieldGeometryContainer (z-index: 20)
│   ├── FieldSectors (Off-side / Leg-side dividing lines)
│   └── PitchLandingMarker (Visual bounce heat-spot)
├── PlayersContainer (z-index: 30)
│   ├── FielderSprites [9 fielders positioned by FieldPreset]
│   ├── WicketkeeperSprite (Positioned by bowling style: up or back)
│   ├── BowlerSprite (Run-up, delivery stride, follow-through)
│   ├── StrikerBatterSprite (Stance, swing, follow-through)
│   └── NonStrikerBatterSprite (Crease backing up)
├── BallContainer (z-index: 40)
│   ├── BallShadow (Ground projection with height scaling)
│   ├── BallSprite (Red / White / Pink leather sphere)
│   └── BallTrajectoryTrail (Motion blur and trajectory trail)
├── VisualEffectsContainer (z-index: 50)
│   ├── DislodgedBailsParticles (Stumps cartwheeling on bowled/run out)
│   ├── BoundaryCelebrationRipples (Shockwaves on four/six impact)
│   └── FreeHitIndicatorGlow (Yellow warning glow around crease)
└── BroadcastOverlaysContainer (z-index: 60)
    ├── LowerThirdBanner (Batters, bowler, team total, RPO, target)
    ├── EventToastOverlay (Animated "FOUR", "SIX", "OUT", "FREE HIT")
    └── WagonWheelRadar (Directional trajectory polar vector)
```

---

## 3. Ground & Stadium Geometry Modeling

The cricket ground coordinate system is centered at $(0, 0)$ corresponding to the center of the pitch.

### 3.1 Dimensions & Coordinate Normalization
- **Pitch Length:** $20.12\text{ meters}$ ($22\text{ yards}$) from stump to stump.
- **Pitch Width:** $3.05\text{ meters}$ ($10\text{ feet}$).
- **Creases:**
  - Popping crease: $1.22\text{ meters}$ ($4\text{ feet}$) in front of stumps.
  - Bowling crease: through stumps ($2.64\text{ meters}$ width).
  - Return creases: perpendicular to popping crease, $1.32\text{ meters}$ from pitch centerline.
- **Inner Circle (30-yard restriction):**
  - Two semicircles of radius $27.43\text{ meters}$ ($30\text{ yards}$) centered on the middle stump of each wicket, joined by parallel lines $27.43\text{ meters}$ from the pitch centerline.
- **Boundary Ellipse:**
  - Dynamically scaled to `stadium.averageBoundaryRadiusMeters` (e.g. Melbourne Cricket Ground: $82\text{m}$, Chinnaswamy: $62\text{m}$).

### 3.2 Pitch Surface Shading by Pitch Type
- **FLAT:** Golden tan (`#D8B485`), smooth surface, minimal crack rendering.
- **HARD:** Ochre buff (`#C99B6D`), high bounce reflection, light chalking.
- **GREEN:** Sage tint (`#6B8E23`), visible grass thatch, seaming trajectory flare.
- **TURNING:** Dusty brown (`#B8860B`), high surface wear cracks, pronounced spin deflection.
- **DUSTY:** Pale fawn (`#C2B280`), puff of dust particle at bounce point.

---

## 4. Player Positioning & Field Preset Engine

Fielders are procedurally placed based on:
1. **Batter Handedness:** `RIGHT_HAND` vs `LEFT_HAND` (polar coordinates mirrored across $y$-axis).
2. **Bowler Style:** Pace vs Spin (Wicketkeeper stands back $18\text{m}$ for pace; stands up to stumps for spin).
3. **Field Preset Configuration:**

| Field Preset | Inner Ring Fielders | Boundary Fielders | Key Positions |
|---|---|---|---|
| **ATTACKING_CLOSE_CATCHERS** | 7–8 | 1–2 | Slip 1, Slip 2, Gully, Silly Point, Short Leg |
| **BALANCED_RING** | 5 | 4 | Mid-off, Mid-on, Cover, Point, Square Leg, Deep Midwicket, Deep Cover |
| **DEATH_BOUNDARY_DEFENSE** | 4 | 5 | Deep Backward Point, Deep Cover, Long-off, Long-on, Deep Square Leg |
| **SPIN_CHOKE** | 6 | 3 | Backward Point, Extra Cover, Mid-wicket, Mid-on, Short Fine Leg, Long-off |

---

## 5. Ball Physics & Animation Phases

Each delivery sequence executes through 4 distinct animation keyframe phases:

```
[Phase 1: Run-up]   --> [Phase 2: Flight & Bounce] --> [Phase 3: Shot Contact & Path] --> [Phase 4: Resolution]
(0ms - 400ms)           (400ms - 900ms)                (900ms - 1800ms)                   (1800ms - 2200ms)
Bowler approaches       Ball leaves hand, lands        Bat swing animation,               Fielders gather ball,
crease at delivery      on pitch, bounces with         ball travels along trajectory      score increments,
stride.                 pitch-modified restitution.     angle and distance to field.       commentary reveals.
```

### 5.1 Trajectory Equation
The ball position $(x(t), y(t))$ and height $z(t)$ are evaluated parametrically:
$$\mathbf{P}_{\text{ground}}(t) = (1 - t)\mathbf{P}_{\text{release}} + t \mathbf{P}_{\text{landing}}$$
$$z(t) = 4 h_{\max} t (1 - t)$$
Following bounce at landing point $\mathbf{P}_{\text{landing}}$:
$$\mathbf{P}_{\text{exit}}(t') = \mathbf{P}_{\text{crease}} + v_0 t' \begin{bmatrix} \cos(\theta) \\ \sin(\theta) \end{bmatrix}$$
where $\theta$ is `event.trajectory.angleDegrees` and $v_0$ is scaled from `event.trajectory.distanceMeters`.

---

## 6. Broadcast Overlay & Interactive Control Suite

1. **Playback Controller:**
   - Play / Pause (Spacebar shortcut).
   - Speed Toggles: $0.5\times$ (Broadcast Slow-Mo), $1.0\times$ (Normal Play), $2.0\times$ (Fast Pace), $4.0\times$ (High-Speed Sim).
   - "Next Ball" stepping mode.
   - "Skip Over" and "Fast-forward Innings".

2. **Television Lower-Third Banner:**
   - Batting side score: `142/3 (16.2 ov) | CRR: 8.70 | Target: 178 | RRR: 9.81`
   - Active Striker: `V. Kohli* 64 (42b, 6x4, 2x6)`
   - Non-Striker: `A. de Villiers 28 (15b, 3x4, 1x6)`
   - Active Bowler: `J. Bumrah 3.2-0-22-2 (Econ: 6.60)`
   - Current Over Ball Tracker: `[1] [0] [4] [Wd] [6] [W]`

3. **Reconciled Scorecard Integration:**
   - Tabs for Innings 1 and Innings 2.
   - Interactive partnerships wagon-wheel and breakdown table.
   - Fall-of-wickets timeline.

---

## 7. Responsive Viewport Scaling & Hi-DPI Support

- **Canvas Aspect Ratio:** Standard 16:9 widescreen ($1920 \times 1080$ virtual coordinate space).
- **Scale Manager:** PixiJS `autoDensity: true`, `resolution: window.devicePixelRatio || 2` for razor-sharp rendering on 4K and Retina displays.
- **Resize Observer:** Automatically adjusts zoom and pan offset so that the complete boundary rope remains visible across all viewport dimensions.
