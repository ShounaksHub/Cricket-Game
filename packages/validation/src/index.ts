import { z } from 'zod';

export const MatchFormatSchema = z.enum([
  'T10',
  'T20',
  'ODI',
  'TEST_RED_BALL',
  'TEST_PINK_BALL',
]);

export const DifficultySchema = z.enum(['EASY', 'MEDIUM', 'HARD']);

export const TossDecisionSchema = z.enum(['BAT', 'BOWL']);

export const DreamTeamStatusSchema = z.enum(['DRAFT', 'MATCH_READY']);

export const DreamTeamPlayerSlotSchema = z.object({
  playerId: z.string().uuid(),
  battingOrder: z.number().int().min(1).max(11),
  isCaptain: z.boolean().default(false),
  isViceCaptain: z.boolean().default(false),
  isDesignatedWicketkeeper: z.boolean().default(false),
  bowlingPriority: z.number().int().min(1).max(7).optional().nullable(),
});

export const CreateDreamTeamSchema = z.object({
  teamName: z.string().min(2).max(64).trim(),
  description: z.string().max(255).optional(),
  badgeIcon: z.string().min(2).max(64).default('SHIELD_CLASSIC'),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color code'),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color code'),
  format: MatchFormatSchema,
  status: DreamTeamStatusSchema.default('MATCH_READY'),
  lineup: z
    .array(DreamTeamPlayerSlotSchema)
    .length(11, 'A complete Playing XI must contain exactly 11 players')
    .refine((lineup) => {
      const keeperCount = lineup.filter((p) => p.isDesignatedWicketkeeper).length;
      return keeperCount >= 1;
    }, 'Lineup must include at least one designated wicketkeeper')
    .refine((lineup) => {
      const uniqueBattingOrders = new Set(lineup.map((p) => p.battingOrder));
      return uniqueBattingOrders.size === 11;
    }, 'Batting orders 1 through 11 must be unique'),
});

export const SaveDreamTeamDraftSchema = z.object({
  teamName: z.string().min(2).max(64).trim(),
  description: z.string().max(255).optional(),
  badgeIcon: z.string().min(2).max(64).default('SHIELD_CLASSIC'),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color code'),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color code'),
  format: MatchFormatSchema,
  status: z.literal('DRAFT').default('DRAFT'),
  lineup: z
    .array(DreamTeamPlayerSlotSchema)
    .max(11, 'Squad cannot exceed 11 players')
    .default([]),
});

export const UpdateDreamTeamSchema = z.object({
  teamName: z.string().min(2).max(64).trim().optional(),
  description: z.string().max(255).optional(),
  badgeIcon: z.string().min(2).max(64).optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  format: MatchFormatSchema.optional(),
  status: DreamTeamStatusSchema.optional(),
});

export const ReorderBattingOrderSchema = z.object({
  orders: z.array(
    z.object({
      playerId: z.string().uuid(),
      battingOrder: z.number().int().min(1).max(11),
    })
  ),
});

export const CreateMatchSchema = z.object({
  format: MatchFormatSchema,
  rulesetId: z.string().min(1),
  stadiumId: z.string().uuid(),
  pitchProfileId: z.string().uuid(),
  userDreamTeamId: z.string().uuid(),
  difficulty: DifficultySchema.default('MEDIUM'),
  customConditions: z
    .object({
      ambientTemperatureCelsius: z.number().min(0).max(50).default(24),
      humidityPercentage: z.number().min(0).max(100).default(55),
      cloudCoverPercentage: z.number().min(0).max(100).default(20),
      dewFactor: z.number().min(0).max(1).default(0.0),
    })
    .optional(),
});

export const TacticalDeliveryActionSchema = z.object({
  batterIntent: z.enum([
    'DEFEND',
    'ROTATE_STRIKE',
    'BALANCED',
    'AGGRESSIVE',
    'MAXIMUM_POWER',
  ]),
  batterTargetZone: z.enum(['OFF_SIDE', 'LEG_SIDE', 'V_STRAIGHT']).optional(),
  bowlerLine: z.enum(['OUTSIDE_OFF', 'STUMPS', 'DOWN_LEG']),
  bowlerLength: z.enum(['YORKER', 'FULL', 'GOOD_LENGTH', 'BACK_OF_LENGTH', 'SHORT']),
  bowlerVariation: z.enum(['STOCK', 'SLOWER_BALL', 'BOUNCER', 'GOOGLY', 'ARM_BALL']),
  fieldPreset: z.enum(['ATTACKING', 'BALANCED', 'BOUNDARY_DEFENSE', 'SPIN_CHOKE']),
});

export const TossActionSchema = z.object({
  calledHeadsOrTails: z.enum(['HEADS', 'TAILS']),
  decision: TossDecisionSchema,
});
