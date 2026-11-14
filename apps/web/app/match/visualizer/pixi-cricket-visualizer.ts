import { Application, Container } from 'pixi.js';
import type { DeliveryEvent, FieldPreset } from '@cricket/simulation-engine';
import type { BattingHand, BowlingStyle } from '@cricket/shared-types';
import { createFieldGeometry } from './field-geometry';
import { PlayerManager } from './player-manager';
import { BallAnimator } from './ball-animator';
import { EffectsManager } from './effects-manager';
import type { AnimationPhase, VisualizerConfig } from './types';

export interface VisualizerInitOptions {
  readonly canvas: HTMLCanvasElement;
  readonly stadiumId: string;
  readonly boundaryRadiusMeters: number;
  readonly pitchType: 'FLAT' | 'HARD' | 'TURNING' | 'GREEN' | 'DUSTY';
  readonly battingHand: BattingHand;
  readonly bowlingStyle: BowlingStyle;
  readonly fieldPreset: FieldPreset;
  readonly onPhaseChange?: (phase: AnimationPhase) => void;
}

export class PixiCricketVisualizer {
  private app: Application | null = null;
  private rootContainer: Container | null = null;
  private playerManager: PlayerManager | null = null;
  private ballAnimator: BallAnimator | null = null;
  private effectsManager: EffectsManager | null = null;

  private scale = 5.2; // Pixels per meter
  private baseScale = 5.2;
  private boundaryRadiusMeters = 75;
  private animationPhase: AnimationPhase = 'IDLE';
  private playbackSpeed = 1.0;
  private onPhaseChangeCallback?: (phase: AnimationPhase) => void;

  // Active delivery animation state
  private activeEvent: DeliveryEvent | null = null;
  private animationElapsedMs = 0;
  private currentDeliveryDurationMs = 1800;
  private onCompleteCallback: (() => void) | null = null;

  async init(options: VisualizerInitOptions): Promise<void> {
    this.onPhaseChangeCallback = options.onPhaseChange;
    this.boundaryRadiusMeters = options.boundaryRadiusMeters || 75;

    const width = options.canvas.clientWidth || 960;
    const height = options.canvas.clientHeight || 600;

    // Available ground area accounting for top HUD (54px) and bottom broadcast ribbon (88px)
    const topMargin = 54;
    const bottomMargin = 88;
    const availableHeight = Math.max(280, height - topMargin - bottomMargin);
    const availableWidth = Math.max(280, width - 40);

    // Dynamic scale so full boundary circle (plus 12px outer turf buffer) fits with zero overlap
    const maxBoundaryDiameterPx = Math.min(availableWidth, availableHeight) * 0.90;
    this.scale = (maxBoundaryDiameterPx / 2) / this.boundaryRadiusMeters;
    this.baseScale = this.scale;

    this.app = new Application();
    await this.app.init({
      canvas: options.canvas,
      width,
      height,
      resolution: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
      autoDensity: true,
      antialias: true,
      backgroundColor: 0x06180e, // Deep stadium dark green
    });

    this.rootContainer = new Container();
    this.rootContainer.x = width / 2;
    this.rootContainer.y = topMargin + (availableHeight / 2);
    this.app.stage.addChild(this.rootContainer);

    // 1. Ground Geometry
    const ground = createFieldGeometry({
      boundaryRadiusMeters: options.boundaryRadiusMeters,
      pitchType: options.pitchType,
      scale: this.scale,
    });
    this.rootContainer.addChild(ground);

    // 2. Players
    this.playerManager = new PlayerManager({
      scale: this.scale,
      fieldPreset: options.fieldPreset,
      battingHand: options.battingHand,
      bowlingStyle: options.bowlingStyle,
    });
    this.rootContainer.addChild(this.playerManager.container);

    // 3. Ball
    this.ballAnimator = new BallAnimator({ scale: this.scale });
    this.rootContainer.addChild(this.ballAnimator.container);

    // 4. Effects
    this.effectsManager = new EffectsManager({ scale: this.scale });
    this.rootContainer.addChild(this.effectsManager.container);

    // 5. 60 FPS Ticker
    this.app.ticker.add((ticker) => {
      this.tick(ticker.deltaMS);
    });

    this.setPhase('IDLE');
  }

  setPlaybackSpeed(multiplier: number): void {
    this.playbackSpeed = Math.max(0.25, Math.min(4.0, multiplier));
  }

  setFieldPreset(preset: FieldPreset, customPositions?: any[]): void {
    if (this.playerManager) {
      this.playerManager.updateFielders(preset, customPositions);
    }
  }

  resize(width: number, height: number): void {
    if (!this.app || !this.rootContainer) return;
    this.app.renderer.resize(width, height);

    const topMargin = 52;
    const bottomMargin = 135;
    const availableHeight = Math.max(260, height - topMargin - bottomMargin);
    const availableWidth = Math.max(260, width - 40);
    const maxBoundaryDiameterPx = Math.min(availableWidth, availableHeight) * 0.94;
    const targetScale = (maxBoundaryDiameterPx / 2) / this.boundaryRadiusMeters;

    const scaleFactor = targetScale / this.baseScale;
    this.rootContainer.scale.set(scaleFactor);
    this.rootContainer.x = width / 2;
    this.rootContainer.y = topMargin + (availableHeight / 2);
  }

  /**
   * Triggers animated execution of a simulated DeliveryEvent.
   */
  playDelivery(event: DeliveryEvent, onComplete?: () => void): void {
    this.activeEvent = event;
    this.animationElapsedMs = 0;
    this.onCompleteCallback = onComplete ?? null;

    // Set duration scaled by playback speed
    this.currentDeliveryDurationMs = 1800 / this.playbackSpeed;

    if (this.ballAnimator) {
      this.ballAnimator.reset();
    }
    if (this.effectsManager) {
      this.effectsManager.reset();
    }

    this.setPhase('RUN_UP');
  }

  private setPhase(phase: AnimationPhase): void {
    this.animationPhase = phase;
    if (this.onPhaseChangeCallback) {
      this.onPhaseChangeCallback(phase);
    }
  }

  private tick(deltaMs: number): void {
    if (this.effectsManager) {
      this.effectsManager.update();
    }

    if (!this.activeEvent || this.animationPhase === 'IDLE' || this.animationPhase === 'RESOLVED') {
      return;
    }

    this.animationElapsedMs += deltaMs * this.playbackSpeed;
    const progress = Math.min(1.0, this.animationElapsedMs / this.currentDeliveryDurationMs);

    // Delivery Animation Phases:
    // 0.00 to 0.20: Bowler run-up (RUN_UP)
    // 0.20 to 0.55: Ball flight from release to pitch bounce (DELIVERY_FLIGHT)
    // 0.55 to 0.60: Bat contact (BAT_CONTACT)
    // 0.60 to 0.85: Ball travel along trajectory (OUTFIELD_TRAJECTORY)
    // 0.85 to 1.00: Celebration / Resolution (CELEBRATION / RESOLVED)

    if (progress < 0.2) {
      // 1. Bowler Run-up
      if (this.animationPhase !== 'RUN_UP') this.setPhase('RUN_UP');
      const subP = progress / 0.2;
      const startY = -18 * this.scale;
      const deliveryY = -10.06 * this.scale;
      const currentY = startY + (deliveryY - startY) * subP;
      if (this.playerManager) {
        this.playerManager.setBowlerPosition(0, currentY);
      }
    } else if (progress < 0.55) {
      // 2. Ball Flight to pitch landing
      if (this.animationPhase !== 'DELIVERY_FLIGHT') this.setPhase('DELIVERY_FLIGHT');
      const subP = (progress - 0.2) / 0.35;
      if (this.ballAnimator) {
        this.ballAnimator.updateDeliveryFlight(subP);
      }
    } else if (progress < 0.6) {
      // 3. Bat Contact
      if (this.animationPhase !== 'BAT_CONTACT') {
        this.setPhase('BAT_CONTACT');
      }
      if (this.ballAnimator) {
        this.ballAnimator.updateDeliveryFlight(1.0);
      }
    } else if (progress < 0.85) {
      // 4. Outfield Trajectory
      if (this.animationPhase !== 'OUTFIELD_TRAJECTORY') {
        this.setPhase('OUTFIELD_TRAJECTORY');
        // Check for event toast trigger
        this.handleEventTriggers(this.activeEvent);
      }
      const subP = (progress - 0.6) / 0.25;
      if (this.ballAnimator) {
        this.ballAnimator.updateExitStroke(
          subP,
          this.activeEvent.trajectory,
          this.activeEvent.outcome,
        );
      }
    } else {
      // 5. Celebration & Resolution
      if (this.animationPhase !== 'CELEBRATION') {
        this.setPhase('CELEBRATION');
      }

      if (progress >= 1.0) {
        this.setPhase('RESOLVED');
        const cb = this.onCompleteCallback;
        this.activeEvent = null;
        this.onCompleteCallback = null;
        if (cb) cb();
      }
    }
  }

  private handleEventTriggers(event: DeliveryEvent): void {
    if (!this.effectsManager) return;

    if (event.dismissal) {
      // Wicket fallen!
      if (
        event.dismissal.mode === 'BOWLED' ||
        event.dismissal.mode === 'STUMPED' ||
        event.dismissal.mode === 'HIT_WICKET'
      ) {
        this.effectsManager.triggerStumpsBroken();
      }
      const modeLabel = event.dismissal.mode.replace('_', ' ');
      this.effectsManager.triggerEventToast('WICKET!', modeLabel, 0xef4444);
    } else if (event.outcome === 'SIX') {
      this.effectsManager.triggerEventToast('MAXIMUM!', '6 RUNS', 0x8b5cf6);
    } else if (event.outcome === 'FOUR') {
      this.effectsManager.triggerEventToast('BOUNDARY!', '4 RUNS', 0x10b981);
    } else if (event.outcome === 'NO_BALL') {
      this.effectsManager.triggerEventToast('NO BALL!', 'FREE HIT NEXT', 0xf59e0b);
    } else if (event.outcome === 'WIDE') {
      this.effectsManager.triggerEventToast('WIDE BALL', '+1 EXTRA', 0x3b82f6);
    }
  }

  destroy(): void {
    if (this.app) {
      this.app.destroy(true, { children: true, texture: true });
      this.app = null;
    }
  }
}
