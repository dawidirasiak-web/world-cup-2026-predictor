ALTER TABLE "Match" ADD COLUMN "winnerTeamId" TEXT;

ALTER TABLE "Match"
ADD CONSTRAINT "Match_winnerTeamId_fkey"
FOREIGN KEY ("winnerTeamId") REFERENCES "Team"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Match_winnerTeamId_idx" ON "Match"("winnerTeamId");
