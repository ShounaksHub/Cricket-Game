-- CreateEnum
CREATE TYPE "DreamTeamStatus" AS ENUM ('DRAFT', 'MATCH_READY');

-- AlterTable
ALTER TABLE "dream_teams" ADD COLUMN "description" VARCHAR(255),
ADD COLUMN "status" "DreamTeamStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "dream_team_players" ADD COLUMN "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
