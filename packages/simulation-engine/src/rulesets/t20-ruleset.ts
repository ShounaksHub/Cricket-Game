import type { MatchFormat } from '@cricket/shared-types';
import type { InningsState } from '../contracts/types.js';

export interface PowerplayConfig {
  readonly p1EndOver: number; // 1-based over where P1 concludes (e.g. 6 in T20)
  readonly p2EndOver?: number;
  readonly p3EndOver?: number;
}

export interface RulesetInterface {
  readonly format: MatchFormat;
  readonly rulesetVersion: string;
  readonly maxOversPerInnings: number;
  readonly maxOversPerBowler: number;
  readonly legalBallsPerOver: number;
  readonly freeHitAfterNoBall: boolean;
  readonly powerplay: PowerplayConfig;

  maxFieldersOutsideCircle(currentOver: number): number;
  getMaxFieldersOutsideRing(currentOver: number): number;
  isPowerplayActive(currentOver: number): boolean;
  isPowerplayOver(currentOver: number): boolean;
  canBowlerBowlOver(
    bowlerId: string,
    previousBowlerId: string,
    completedOvers: number
  ): { allowed: boolean; reason?: string };
  isInningsOver(innings: InningsState): boolean;
  isOverLimitReached(completedOvers: number, format?: MatchFormat): boolean;
}

/**
 * Standard ICC T20 International Ruleset Engine.
 */
export class T20Ruleset implements RulesetInterface {
  readonly format: MatchFormat = 'T20';
  readonly rulesetVersion: string = 'rules-t20-icc-2026.1';
  readonly maxOversPerInnings: number = 20;
  readonly maxOversPerBowler: number = 4;
  readonly legalBallsPerOver: number = 6;
  readonly freeHitAfterNoBall: boolean = true;
  readonly powerplay: PowerplayConfig = { p1EndOver: 6 };

  /**
   * Field restrictions:
   * Overs 1-6 (Powerplay): Maximum 2 fielders outside 30-yard circle.
   * Overs 7-20: Maximum 5 fielders outside 30-yard circle.
   */
  maxFieldersOutsideCircle(currentOver: number): number {
    return this.isPowerplayActive(currentOver) ? 2 : 5;
  }

  getMaxFieldersOutsideRing(currentOver: number): number {
    return this.maxFieldersOutsideCircle(currentOver);
  }

  isPowerplayActive(currentOver: number): boolean {
    return currentOver < this.powerplay.p1EndOver;
  }

  isPowerplayOver(currentOver: number): boolean {
    return this.isPowerplayActive(currentOver);
  }

  isOverLimitReached(completedOvers: number): boolean {
    return completedOvers >= this.maxOversPerInnings;
  }

  canBowlerBowlOver(
    bowlerId: string,
    previousBowlerId: string,
    oversBowled: number
  ): { allowed: boolean; reason?: string } {
    if (bowlerId === previousBowlerId) {
      return {
        allowed: false,
        reason: 'Bowler cannot bowl two consecutive overs (MCC Law 21.7)',
      };
    }
    if (oversBowled >= this.maxOversPerBowler) {
      return {
        allowed: false,
        reason: `Bowler has already completed maximum quota (${this.maxOversPerBowler} overs) for ${this.format}`,
      };
    }
    return { allowed: true };
  }

  isInningsOver(innings: InningsState): boolean {
    // 1. All Out (10 wickets down)
    if (innings.totalWickets >= 10) return true;

    // 2. Scheduled Overs Completed
    if (innings.completedOvers >= this.maxOversPerInnings) return true;

    // 3. Target achieved in chasing innings (2nd innings)
    if (
      innings.targetRuns !== undefined &&
      innings.targetRuns !== null &&
      innings.totalRuns >= innings.targetRuns
    ) {
      return true;
    }

    return false;
  }
}

/**
 * Factory function to retrieve format-calibrated ruleset.
 */
export function getRulesetForFormat(format: MatchFormat): RulesetInterface {
  switch (format) {
    case 'T20':
      return new T20Ruleset();
    case 'T10':
      return new (class extends T20Ruleset {
        override readonly format: MatchFormat = 'T10';
        override readonly rulesetVersion = 'rules-t10-2026.1';
        override readonly maxOversPerInnings = 10;
        override readonly maxOversPerBowler = 2;
        override readonly powerplay = { p1EndOver: 3 };
      })();
    case 'ODI':
      return new (class extends T20Ruleset {
        override readonly format: MatchFormat = 'ODI';
        override readonly rulesetVersion = 'rules-odi-icc-2026.1';
        override readonly maxOversPerInnings = 50;
        override readonly maxOversPerBowler = 10;
        override readonly powerplay = { p1EndOver: 10, p2EndOver: 40, p3EndOver: 50 };
        override maxFieldersOutsideCircle(currentOver: number): number {
          if (currentOver < 10) return 2; // P1
          if (currentOver < 40) return 4; // P2
          return 5; // P3
        }
      })();
    case 'TEST_RED_BALL':
    case 'TEST_PINK_BALL':
      return new (class extends T20Ruleset {
        override readonly format: MatchFormat = format;
        override readonly rulesetVersion = 'rules-test-icc-2026.1';
        override readonly maxOversPerInnings = 9999;
        override readonly maxOversPerBowler = 9999;
        override readonly freeHitAfterNoBall = false;
        override readonly powerplay = { p1EndOver: 0 };
        override maxFieldersOutsideCircle(): number {
          return 9; // No circle restriction in Test
        }
        override isPowerplayActive(): boolean {
          return false;
        }
        override isInningsOver(inn: InningsState): boolean {
          if (inn.totalWickets >= 10) return true;
          if (inn.isDeclared) return true;
          if (inn.targetRuns && inn.totalRuns >= inn.targetRuns) return true;
          return false;
        }
      })();
    default:
      return new T20Ruleset();
  }
}
