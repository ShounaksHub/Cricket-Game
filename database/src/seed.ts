import { PrismaClient } from '@prisma/client';
import {
  generateStandardAliases,
  ingestPlayerRecord,
  VERIFIED_BENCHMARK_PLAYERS,
} from '@cricket/data-ingestion';
import type { MatchFormat } from '@cricket/shared-types';

const prisma = new PrismaClient();

export async function seedVerifiedPlayers(): Promise<{ seeded: number }> {
  console.log(`Starting verified cricketer database seeding...`);
  let count = 0;

  for (const rawPlayer of VERIFIED_BENCHMARK_PLAYERS) {
    const profile = ingestPlayerRecord(rawPlayer);

    // 1. Upsert Player Core Identity
    const player = await prisma.player.upsert({
      where: { id: profile.id },
      create: {
        id: profile.id,
        cricsheetId: profile.cricsheetId,
        fullName: profile.fullName,
        displayName: profile.displayName,
        dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth) : null,
        primaryNationality: profile.primaryNationality,
        primaryRole: profile.primaryRole,
        secondaryRole: profile.secondaryRole,
        battingHand: profile.battingHand,
        bowlingStyle: profile.bowlingStyle,
        isWicketkeeper: profile.isWicketkeeper,
        historicalEra: profile.historicalEra,
        careerDebutYear: profile.careerDebutYear,
        careerRetirementYear: profile.careerRetirementYear,
        isActive: profile.isActive,
        confidenceScore: profile.confidenceScore,
      },
      update: {
        displayName: profile.displayName,
        confidenceScore: profile.confidenceScore,
        isActive: profile.isActive,
      },
    });

    // 2. Upsert Aliases
    const aliases = generateStandardAliases(profile.fullName);
    aliases.push(profile.displayName);
    for (const alias of aliases) {
      await prisma.playerAlias.upsert({
        where: {
          playerId_aliasName: {
            playerId: player.id,
            aliasName: alias,
          },
        },
        create: {
          playerId: player.id,
          aliasName: alias,
          sourceIdentifier: profile.cricsheetId ?? profile.wikidataId,
        },
        update: {},
      });
    }

    // 3. Upsert Provenance Record
    await prisma.playerDataSource.create({
      data: {
        playerId: player.id,
        sourceName: profile.provenance.sourceName,
        sourceUri: profile.provenance.sourceUri,
        licenseType: profile.provenance.licenseType,
        datasetVersion: profile.provenance.datasetVersion,
        verificationStatus: profile.provenance.verificationStatus,
        notes: profile.provenance.attributionNotice,
      },
    });

    // 4. Upsert Format Statistics (Layer 1)
    for (const format of Object.keys(profile.formatStats) as MatchFormat[]) {
      const stats = profile.formatStats[format];
      if (stats) {
        await prisma.playerFormatStatistic.upsert({
          where: {
            playerId_formatCode: {
              playerId: player.id,
              formatCode: format,
            },
          },
          create: {
            playerId: player.id,
            formatCode: format,
            matchesPlayed: stats.matchesPlayed,
            inningsBatted: stats.inningsBatted,
            runsScored: stats.runsScored,
            highestScore: stats.highestScore,
            isHighestScoreNotOut: stats.isHighestScoreNotOut,
            battingAverage: stats.battingAverage,
            strikeRate: stats.strikeRate,
            centuries: stats.centuries,
            halfCenturies: stats.halfCenturies,
            fours: stats.fours ?? 0,
            sixes: stats.sixes ?? 0,
            ballsBowled: stats.ballsBowled,
            runsConceded: stats.runsConceded,
            wicketsTaken: stats.wicketsTaken,
            bowlingAverage: stats.bowlingAverage,
            economyRate: stats.economyRate,
            bowlingStrikeRate: stats.bowlingStrikeRate,
            fiveWicketHauls: stats.fiveWicketHauls,
            catchesTaken: stats.catchesTaken,
            stumpingsMade: stats.stumpingsMade,
          },
          update: {
            matchesPlayed: stats.matchesPlayed,
            runsScored: stats.runsScored,
            wicketsTaken: stats.wicketsTaken,
          },
        });
      }
    }

    // 5. Upsert Era Metrics (Layer 2)
    for (const format of Object.keys(profile.eraMetrics) as MatchFormat[]) {
      const era = profile.eraMetrics[format];
      if (era) {
        await prisma.playerEraMetric.upsert({
          where: {
            playerId_formatCode_normalizationVersion: {
              playerId: player.id,
              formatCode: format,
              normalizationVersion: era.normalizationVersion,
            },
          },
          create: {
            playerId: player.id,
            formatCode: format,
            eraBracket: era.eraBracket,
            eraPeerBattingAvgMean: era.peerCohortMeanBattingAvg,
            eraPeerBattingAvgStd: era.peerCohortStdBattingAvg,
            eraPeerStrikeRateMean: 50.0,
            eraPeerStrikeRateStd: 10.0,
            eraPeerBowlingAvgMean: era.peerCohortMeanBowlingAvg,
            eraPeerBowlingAvgStd: era.peerCohortStdBowlingAvg,
            eraPeerEconomyMean: 3.0,
            eraPeerEconomyStd: 0.5,
            battingAvgZScore: era.battingAvgZScore,
            strikeRateZScore: era.strikeRateZScore,
            bowlingAvgZScore: era.bowlingAvgZScore,
            economyZScore: era.economyZScore,
            eraPerformanceRatio: era.eraPerformanceRatio,
            normalizationVersion: era.normalizationVersion,
          },
          update: {
            battingAvgZScore: era.battingAvgZScore,
            eraPerformanceRatio: era.eraPerformanceRatio,
          },
        });
      }
    }

    // 6. Upsert Attributes (Layer 3 & 4)
    await prisma.playerAttribute.upsert({
      where: {
        playerId_version: {
          playerId: player.id,
          version: profile.attributes.ratingVersion,
        },
      },
      create: {
        playerId: player.id,
        technique: profile.attributes.technique,
        timing: profile.attributes.timing,
        power: profile.attributes.power,
        strikeRotation: profile.attributes.strikeRotation,
        defensiveAbility: profile.attributes.defensiveAbility,
        againstPace: profile.attributes.againstPace,
        againstSpin: profile.attributes.againstSpin,
        shortBallHandling: profile.attributes.shortBallHandling,
        yorkerHandling: profile.attributes.yorkerHandling,
        deathOverBatting: profile.attributes.deathOverBatting,
        lineAndLength: profile.attributes.lineAndLength,
        paceOrSpinExecution: profile.attributes.paceOrSpinExecution,
        swingOrDrift: profile.attributes.swingOrDrift,
        seamOrTurn: profile.attributes.seamOrTurn,
        accuracy: profile.attributes.accuracy,
        variation: profile.attributes.variation,
        yorkerExecution: profile.attributes.yorkerExecution,
        deathOverBowling: profile.attributes.deathOverBowling,
        newBallEffectiveness: profile.attributes.newBallEffectiveness,
        stamina: profile.attributes.stamina,
        catching: profile.attributes.catching,
        reflexes: profile.attributes.reflexes,
        groundFielding: profile.attributes.groundFielding,
        throwingAccuracy: profile.attributes.throwingAccuracy,
        wicketkeeping: profile.attributes.wicketkeeping,
        pressureHandling: profile.attributes.pressureHandling,
        consistency: profile.attributes.consistency,
        decisionMaking: profile.attributes.matchAwareness,
        pitchAdaptability: profile.attributes.pitchAdaptability,
        weatherAdaptability: profile.attributes.weatherAdaptability,
        version: profile.attributes.ratingVersion,
      },
      update: {
        technique: profile.attributes.technique,
        lineAndLength: profile.attributes.lineAndLength,
      },
    });

    // 7. Upsert Format Ratings (Layer 4)
    for (const format of Object.keys(profile.ratings) as MatchFormat[]) {
      const r = profile.ratings[format];
      if (r) {
        await prisma.playerRating.upsert({
          where: {
            playerId_formatCode_ratingVersion: {
              playerId: player.id,
              formatCode: format,
              ratingVersion: r.ratingVersion,
            },
          },
          create: {
            playerId: player.id,
            formatCode: format,
            overallRating: r.overallRating,
            battingRating: r.battingRating,
            bowlingRating: r.bowlingRating,
            fieldingRating: r.fieldingRating,
            ratingVersion: r.ratingVersion,
            confidenceTier: r.confidenceTier,
          },
          update: {
            overallRating: r.overallRating,
            battingRating: r.battingRating,
            bowlingRating: r.bowlingRating,
            fieldingRating: r.fieldingRating,
          },
        });
      }
    }

    count++;
    console.log(`Seeded player [${count}/${VERIFIED_BENCHMARK_PLAYERS.length}]: ${profile.fullName} (${profile.historicalEra})`);
  }

  console.log(`Completed seeding ${count} verified players.`);
  return { seeded: count };
}

if (process.argv[1]?.includes('seed')) {
  seedVerifiedPlayers()
    .then(() => prisma.$disconnect())
    .catch((err) => {
      console.error('Seeding failed:', err);
      prisma.$disconnect();
      process.exit(1);
    });
}
