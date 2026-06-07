-- CreateTable
CREATE TABLE "TournamentResult" (
    "id" TEXT NOT NULL DEFAULT 'world-cup-2026',
    "championTeamId" TEXT,
    "finalistOneTeamId" TEXT,
    "finalistTwoTeamId" TEXT,
    "topScorer" TEXT,
    "topScorerGoals" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentResult_pkey" PRIMARY KEY ("id")
);
