/*
  Warnings:

  - Added the required column `topScorerGoals` to the `PreTournamentPrediction` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PreTournamentQuestionType" AS ENUM ('YES_NO', 'OPEN');

-- AlterTable
ALTER TABLE "PreTournamentPrediction" ADD COLUMN     "topScorerGoals" INTEGER NOT NULL,
ADD COLUMN     "topScorerGoalsPoints" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PreTournamentQuestion" ADD COLUMN     "type" "PreTournamentQuestionType" NOT NULL DEFAULT 'YES_NO';
