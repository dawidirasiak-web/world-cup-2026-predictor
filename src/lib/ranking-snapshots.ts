import { getRanking } from "@/lib/ranking";
import { prisma } from "@/lib/prisma";

export type RankingMovement = {
  direction: "up" | "down" | "same";
  places: number;
};

export function getWarsawDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${value("year")}-${value("month")}-${value("day")}`;
}

export async function saveRankingSnapshot(date = new Date()) {
  const snapshotDate = getWarsawDateKey(date);
  const ranking = await getRanking();

  await prisma.$transaction(
    ranking.map((player) =>
      prisma.rankingSnapshot.upsert({
        where: {
          snapshotDate_userId: {
            snapshotDate,
            userId: player.id,
          },
        },
        update: {
          position: player.position,
          totalPoints: player.totalPoints,
          matchScorePoints: player.matchScorePoints,
          matchQuestionPoints: player.matchQuestionPoints,
          preTournamentPoints: player.preTournamentPoints,
        },
        create: {
          snapshotDate,
          userId: player.id,
          position: player.position,
          totalPoints: player.totalPoints,
          matchScorePoints: player.matchScorePoints,
          matchQuestionPoints: player.matchQuestionPoints,
          preTournamentPoints: player.preTournamentPoints,
        },
      }),
    ),
  );

  return {
    snapshotDate,
    players: ranking.length,
  };
}

export async function getRankingMovements(
  ranking: Array<{ id: string; position: number }>,
  date = new Date(),
) {
  const snapshotDate = getWarsawDateKey(date);
  const snapshots = await prisma.rankingSnapshot.findMany({
    where: { snapshotDate },
    select: {
      userId: true,
      position: true,
    },
  });
  const positionByUserId = new Map(
    snapshots.map((snapshot) => [snapshot.userId, snapshot.position]),
  );

  return new Map<string, RankingMovement>(
    ranking.map((player) => {
      const previousPosition = positionByUserId.get(player.id);

      if (!previousPosition) {
        return [player.id, { direction: "same", places: 0 }];
      }

      const difference = previousPosition - player.position;

      if (difference > 0) {
        return [player.id, { direction: "up", places: difference }];
      }

      if (difference < 0) {
        return [player.id, { direction: "down", places: Math.abs(difference) }];
      }

      return [player.id, { direction: "same", places: 0 }];
    }),
  );
}
