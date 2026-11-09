import type { CricketRuleset, MatchFormat } from '@cricket/shared-types';

export const PITCH_DIMENSIONS = {
  STUMPS_TO_STUMPS_METERS: 20.12, // 22 yards
  POPPING_CREASE_TO_STUMPS_METERS: 1.22, // 4 feet
  INNER_FIELDING_CIRCLE_RADIUS_METERS: 27.43, // 30 yards
  STUMPS_WIDTH_METERS: 0.228, // 9 inches
  STUMPS_HEIGHT_METERS: 0.711, // 28 inches
  DEFAULT_STRAIGHT_BOUNDARY_METERS: 70.0,
  DEFAULT_SQUARE_BOUNDARY_METERS: 65.0,
} as const;

export const STANDARD_RULESETS: Record<MatchFormat, CricketRuleset> = {
  T10: {
    rulesetId: 'T10_STANDARD_2026',
    format: 'T10',
    version: '1.0.0',
    maxOversPerInnings: 10,
    maxOversPerBowler: 2,
    inningsPerTeam: 1,
    isMultiday: false,
    powerplays: [
      {
        phaseName: 'Mandatory Powerplay',
        startOver: 1,
        endOver: 3,
        maxFieldersOutsideCircle: 2,
      },
    ],
    frontFootNoBallFreeHit: true,
    superOverEnabled: true,
    maxConsecutiveSuperOvers: 3,
    drsReviewsPerInnings: 1,
    allowsConcussionSubstitutes: true,
  },
  T20: {
    rulesetId: 'T20_ICC_2026',
    format: 'T20',
    version: '1.0.0',
    maxOversPerInnings: 20,
    maxOversPerBowler: 4,
    inningsPerTeam: 1,
    isMultiday: false,
    powerplays: [
      {
        phaseName: 'Mandatory Powerplay',
        startOver: 1,
        endOver: 6,
        maxFieldersOutsideCircle: 2,
      },
    ],
    frontFootNoBallFreeHit: true,
    superOverEnabled: true,
    maxConsecutiveSuperOvers: 5,
    drsReviewsPerInnings: 2,
    allowsConcussionSubstitutes: true,
  },
  ODI: {
    rulesetId: 'ODI_ICC_2026',
    format: 'ODI',
    version: '1.0.0',
    maxOversPerInnings: 50,
    maxOversPerBowler: 10,
    inningsPerTeam: 1,
    isMultiday: false,
    powerplays: [
      {
        phaseName: 'Powerplay 1',
        startOver: 1,
        endOver: 10,
        maxFieldersOutsideCircle: 2,
      },
      {
        phaseName: 'Powerplay 2',
        startOver: 11,
        endOver: 40,
        maxFieldersOutsideCircle: 4,
      },
      {
        phaseName: 'Powerplay 3',
        startOver: 41,
        endOver: 50,
        maxFieldersOutsideCircle: 5,
      },
    ],
    frontFootNoBallFreeHit: true,
    superOverEnabled: true,
    maxConsecutiveSuperOvers: 3,
    drsReviewsPerInnings: 2,
    allowsConcussionSubstitutes: true,
  },
  TEST_RED_BALL: {
    rulesetId: 'TEST_ICC_WTC_2026',
    format: 'TEST_RED_BALL',
    version: '1.0.0',
    inningsPerTeam: 2,
    isMultiday: true,
    powerplays: [],
    testScheduleConfig: {
      scheduledDays: 5,
      scheduledDailyOvers: 90,
      sessionsPerDay: 3,
      sessions: [
        {
          sessionNumber: 1,
          sessionName: 'Morning',
          scheduledDurationMinutes: 120,
          scheduledMinimumOvers: 30,
          intervalAfterSession: {
            intervalName: 'Lunch',
            durationMinutes: 40,
          },
        },
        {
          sessionNumber: 2,
          sessionName: 'Afternoon',
          scheduledDurationMinutes: 120,
          scheduledMinimumOvers: 30,
          intervalAfterSession: {
            intervalName: 'Tea',
            durationMinutes: 20,
          },
        },
        {
          sessionNumber: 3,
          sessionName: 'Evening',
          scheduledDurationMinutes: 120,
          scheduledMinimumOvers: 30,
        },
      ],
      followOnDeficit: 200,
      newBallOverThreshold: 80,
      allowDeclarations: true,
      allowEnforceFollowOn: true,
    },
    frontFootNoBallFreeHit: false,
    superOverEnabled: false,
    maxConsecutiveSuperOvers: 0,
    drsReviewsPerInnings: 3,
    allowsConcussionSubstitutes: true,
  },
  TEST_PINK_BALL: {
    rulesetId: 'TEST_PINK_BALL_ICC_2026',
    format: 'TEST_PINK_BALL',
    version: '1.0.0',
    inningsPerTeam: 2,
    isMultiday: true,
    powerplays: [],
    testScheduleConfig: {
      scheduledDays: 5,
      scheduledDailyOvers: 90,
      sessionsPerDay: 3,
      sessions: [
        {
          sessionNumber: 1,
          sessionName: 'Afternoon',
          scheduledDurationMinutes: 120,
          scheduledMinimumOvers: 30,
          intervalAfterSession: {
            intervalName: 'Tea',
            durationMinutes: 20,
          },
        },
        {
          sessionNumber: 2,
          sessionName: 'Twilight',
          scheduledDurationMinutes: 120,
          scheduledMinimumOvers: 30,
          intervalAfterSession: {
            intervalName: 'Dinner',
            durationMinutes: 40,
          },
        },
        {
          sessionNumber: 3,
          sessionName: 'Night',
          scheduledDurationMinutes: 120,
          scheduledMinimumOvers: 30,
        },
      ],
      followOnDeficit: 200,
      newBallOverThreshold: 80,
      allowDeclarations: true,
      allowEnforceFollowOn: true,
    },
    frontFootNoBallFreeHit: false,
    superOverEnabled: false,
    maxConsecutiveSuperOvers: 0,
    drsReviewsPerInnings: 3,
    allowsConcussionSubstitutes: true,
  },
};
