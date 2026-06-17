CREATE TABLE "RankingSnapshot" (
    "id" TEXT NOT NULL,
    "snapshotDate" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "totalPoints" INTEGER NOT NULL,
    "matchScorePoints" INTEGER NOT NULL,
    "matchQuestionPoints" INTEGER NOT NULL,
    "preTournamentPoints" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankingSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RankingSnapshot_snapshotDate_userId_key" ON "RankingSnapshot"("snapshotDate", "userId");
CREATE INDEX "RankingSnapshot_snapshotDate_idx" ON "RankingSnapshot"("snapshotDate");
CREATE INDEX "RankingSnapshot_userId_idx" ON "RankingSnapshot"("userId");

ALTER TABLE "RankingSnapshot" ADD CONSTRAINT "RankingSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
