import type {
  DeliveryDismissal,
  DeliveryExtras,
  DeliveryOutcome,
} from '../contracts/types.js';

export interface CommentaryContext {
  readonly bowlerName: string;
  readonly strikerName: string;
  readonly outcome: DeliveryOutcome;
  readonly runsBat: number;
  readonly extras: DeliveryExtras;
  readonly dismissal?: DeliveryDismissal;
  readonly isFreeHit: boolean;
  readonly overNumber: number;
  readonly ballInOver: number;
}

/**
 * Generates descriptive, broadcast-quality cricket commentary for each delivery event.
 */
export function generateCommentary(ctx: CommentaryContext): string {
  const { bowlerName, strikerName, outcome, runsBat, extras, dismissal, isFreeHit } = ctx;

  if (dismissal) {
    switch (dismissal.mode) {
      case 'BOWLED':
        return `OUT! ${bowlerName} rattles the timber! Clean bowled! ${strikerName} completely beaten for pace and trajectory. Stumps shattered!`;
      case 'LBW':
        return `OUT! Huge appeal from ${bowlerName} and given! Plumb in front, ${strikerName} pinned on the crease. That was hitting middle and leg!`;
      case 'CAUGHT_BEHIND':
        return `OUT! Nicked and taken! ${bowlerName} finds the outside edge and the keeper makes no mistake. ${strikerName} departs!`;
      case 'STUMPED':
        return `OUT! Deceived in flight by ${bowlerName}! ${strikerName} danced down the track, missed it entirely and the bails are whipped off in a flash!`;
      case 'CAUGHT':
        return `OUT! In the air and safely taken! ${strikerName} mistimed the lofted stroke off ${bowlerName} and holes out in the deep!`;
      case 'RUN_OUT':
        return `OUT! Direct hit! Total chaos between the wickets and ${dismissal.dismissedPlayerId === strikerName ? strikerName : 'the non-striker'} is caught well short of the crease!`;
      case 'HIT_WICKET':
        return `OUT! Unbelievable! ${strikerName} dislodges their own bails stepping back deep into the crease. Hit wicket!`;
    }
  }

  if (extras.wides > 0) {
    return `${bowlerName} sprays this one well down the leg side. Signaled wide by the umpire.`;
  }

  if (extras.noBalls > 0) {
    return `NO BALL! ${bowlerName} oversteps the front crease. Extra run awarded and FREE HIT coming up next!`;
  }

  if (extras.byes > 0) {
    return `${bowlerName} beats the bat and the keeper fails to gather cleanly. Batters scamper through for a bye.`;
  }

  if (extras.legByes > 0) {
    return `Deflected off the thigh pad into the square leg region. Leg-bye signaled by the umpire.`;
  }

  switch (outcome) {
    case 'SIX':
      return isFreeHit
        ? `FREE HIT DISPATCHED! ${strikerName} sends ${bowlerName} towering over deep midwicket into the top tier! Massive six!`
        : `SIX! That has gone miles! What a thunderous strike from ${strikerName} off ${bowlerName}! High, handsome and deep into the stands!`;

    case 'FOUR':
      return `FOUR! Beautifully timed by ${strikerName}! Pierces the field with precision off ${bowlerName} and races across the outfield to the fence.`;

    case 'RUN_3':
      return `Great placement into the deep pocket! ${strikerName} and partner sprint hard between the wickets, turning two into three!`;

    case 'RUN_2':
      return `Punched off the back foot through the covers. Excellent running between the wickets to comfortably come back for two.`;

    case 'RUN_1':
      return `Tucked away softly into the vacant midwicket gap for a sharp single. Strike rotated.`;

    case 'DOT':
    default:
      return `${bowlerName} hits a good length on off stump. ${strikerName} defends solidly towards the ring fielder. No run.`;
  }
}
