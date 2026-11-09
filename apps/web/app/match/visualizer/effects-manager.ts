import { Container, Graphics, Text, TextStyle } from 'pixi.js';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  alpha: number;
  color: number;
  size: number;
  decay: number;
}

/**
 * Manages celebration shockwaves, cartwheeling bails, particle effects,
 * and TV broadcast event banners in PixiJS v8.
 */
export class EffectsManager {
  readonly container: Container;
  private readonly scale: number;

  private particles: Particle[] = [];
  private particleGraphic: Graphics;
  private rippleGraphic: Graphics;
  private toastContainer: Container;
  private toastText: Text;
  private toastSubtext: Text;
  private toastBg: Graphics;
  private toastAlpha = 0;

  constructor(options: { scale: number }) {
    this.container = new Container();
    this.scale = options.scale;

    this.rippleGraphic = new Graphics();
    this.particleGraphic = new Graphics();
    this.toastContainer = new Container();

    this.toastBg = new Graphics();
    const mainStyle = new TextStyle({
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: 22,
      fontWeight: '900',
      fill: 0xffffff,
      letterSpacing: 2,
    });
    const subStyle = new TextStyle({
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: 13,
      fontWeight: '600',
      fill: 0xd1d5db,
      letterSpacing: 1,
    });

    this.toastText = new Text({ text: '', style: mainStyle });
    this.toastText.anchor.set(0.5);
    this.toastSubtext = new Text({ text: '', style: subStyle });
    this.toastSubtext.anchor.set(0.5);
    this.toastSubtext.y = 20;

    this.toastContainer.addChild(this.toastBg);
    this.toastContainer.addChild(this.toastText);
    this.toastContainer.addChild(this.toastSubtext);
    this.toastContainer.alpha = 0;

    this.container.addChild(this.rippleGraphic);
    this.container.addChild(this.particleGraphic);
    this.container.addChild(this.toastContainer);
  }

  reset(): void {
    this.particles = [];
    this.particleGraphic.clear();
    this.rippleGraphic.clear();
    this.toastContainer.alpha = 0;
    this.toastAlpha = 0;
  }

  /**
   * Spawns cartwheeling wooden bails and spark particles at striker stumps.
   */
  triggerStumpsBroken(): void {
    const stumpY = 10.06 * this.scale;
    // 2 bails flying in opposite directions
    this.particles.push({
      x: -2,
      y: stumpY,
      vx: -3.5 - Math.random() * 2,
      vy: -5 - Math.random() * 4,
      rotation: 0,
      vRot: 0.25,
      alpha: 1.0,
      color: 0xefd8a1,
      size: 6,
      decay: 0.02,
    });
    this.particles.push({
      x: 2,
      y: stumpY,
      vx: 3.5 + Math.random() * 2,
      vy: -5 - Math.random() * 4,
      rotation: 0,
      vRot: -0.25,
      alpha: 1.0,
      color: 0xefd8a1,
      size: 6,
      decay: 0.02,
    });

    // 10 wooden splinter / spark particles
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const speed = 2 + Math.random() * 4;
      this.particles.push({
        x: (Math.random() - 0.5) * 6,
        y: stumpY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        rotation: 0,
        vRot: (Math.random() - 0.5) * 0.4,
        alpha: 1.0,
        color: i % 2 === 0 ? 0xf59e0b : 0xd97706,
        size: 2.5,
        decay: 0.03,
      });
    }
  }

  /**
   * Triggers a television broadcast lower-third event badge.
   */
  triggerEventToast(mainTitle: string, subtitle?: string, colorHex = 0x10b981): void {
    this.toastText.text = mainTitle;
    this.toastSubtext.text = subtitle ?? '';

    this.toastBg.clear();
    // Rounded banner badge with glow
    this.toastBg.roundRect(-120, -22, 240, subtitle ? 54 : 44, 8);
    this.toastBg.fill({ color: colorHex, alpha: 0.95 });
    this.toastBg.stroke({ color: 0xffffff, width: 2, alpha: 0.9 });

    this.toastContainer.y = -40; // centered above pitch
    this.toastAlpha = 1.0;
    this.toastContainer.alpha = 1.0;
  }

  /**
   * Ticks active particle animations and fades event badges.
   */
  update(): void {
    // 1. Update Particles
    this.particleGraphic.clear();
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2; // gravity
      p.rotation += p.vRot;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.particleGraphic.rect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size / 2);
      this.particleGraphic.fill({ color: p.color, alpha: p.alpha });
    }

    // 2. Fade Toast
    if (this.toastAlpha > 0) {
      this.toastAlpha -= 0.015;
      this.toastContainer.alpha = Math.max(0, this.toastAlpha);
    }
  }
}
