import { getRanking } from "@/lib/ranking";
import { getLocalDayRange } from "@/lib/format";
import { formatPlayerName } from "@/lib/player-name";
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

function getWarsawNoonFromDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const dayStart = getLocalDayRange(
    new Date(Date.UTC(year, month - 1, day, 12)),
  ).start;

  return new Date(dayStart.getTime() + 1000 * 60 * 60 * 12);
}

async function getBackfilledPreviousPositions(snapshotDate: string) {
  const snapshotNoon = getWarsawNoonFromDateKey(snapshotDate);
  const previousSnapshotNoon = new Date(snapshotNoon);
  previousSnapshotNoon.setUTCDate(previousSnapshotNoon.getUTCDate() - 1);
  const users = await prisma.user.findMany({
    where: { role: "USER" },
    orderBy: { name: "asc" },
    include: {
      matchPredictions: {
        where: {
          match: {
            startsAt: { lt: previousSnapshotNoon },
          },
        },
        select: {
          scorePoints: true,
          questionPoints: true,
          totalPoints: true,
        },
      },
      preTournamentPrediction: {
        select: {
          totalPoints: true,
        },
      },
    },
  });

  return new Map(
    users
      .map((user) => {
        const matchScorePoints = user.matchPredictions.reduce(
          (sum, prediction) => sum + prediction.scorePoints,
          0,
        );
        const matchQuestionPoints = user.matchPredictions.reduce(
          (sum, prediction) => sum + prediction.questionPoints,
          0,
        );
        const matchTotalPoints = user.matchPredictions.reduce(
          (sum, prediction) => sum + prediction.totalPoints,
          0,
        );
        const preTournamentPoints =
          user.preTournamentPrediction?.totalPoints ?? 0;

        return {
          id: user.id,
          name: user.name,
          playerName: formatPlayerName(user),
          matchScorePoints,
          matchQuestionPoints,
          preTournamentPoints,
          totalPoints: matchTotalPoints + preTournamentPoints,
        };
      })
      .sort((first, second) => {
        if (second.totalPoints !== first.totalPoints) {
          return second.totalPoints - first.totalPoints;
        }

        if (second.matchScorePoints !== first.matchScorePoints) {
          return second.matchScorePoints - first.matchScorePoints;
        }

        if (second.matchQuestionPoints !== first.matchQuestionPoints) {
          return second.matchQuestionPoints - first.matchQuestionPoints;
        }

        if (second.preTournamentPoints !== first.preTournamentPoints) {
          return second.preTournamentPoints - first.preTournamentPoints;
        }

        return first.name.localeCompare(second.name, "pl");
      })
      .map((player, index) => [player.id, index + 1]),
  );
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
  const snapshotDates = await prisma.rankingSnapshot.findMany({
    where: { snapshotDate: { lte: snapshotDate } },
    distinct: ["snapshotDate"],
    orderBy: { snapshotDate: "desc" },
    take: 2,
    select: { snapshotDate: true },
  });
  const currentSnapshotDate = snapshotDates[0]?.snapshotDate;
  const previousSnapshotDate = snapshotDates[1]?.snapshotDate;

  const currentSnapshots = currentSnapshotDate
    ? await prisma.rankingSnapshot.findMany({
        where: { snapshotDate: currentSnapshotDate },
        select: {
          userId: true,
          position: true,
        },
      })
    : [];
  const previousSnapshots = previousSnapshotDate
    ? await prisma.rankingSnapshot.findMany({
        where: { snapshotDate: previousSnapshotDate },
        select: {
          userId: true,
          position: true,
        },
      })
    : [];
  const currentPositionByUserId = new Map(
    currentSnapshots.map((snapshot) => [snapshot.userId, snapshot.position]),
  );
  const previousPositionByUserId =
    previousSnapshots.length > 0
      ? new Map(
          previousSnapshots.map((snapshot) => [
            snapshot.userId,
            snapshot.position,
          ]),
        )
      : await getBackfilledPreviousPositions(snapshotDate);

  return new Map<string, RankingMovement>(
    ranking.map((player) => {
      const currentPosition =
        currentPositionByUserId.get(player.id) ?? player.position;
      const previousPosition = previousPositionByUserId.get(player.id);

      if (!previousPosition) {
        return [player.id, { direction: "same", places: 0 }];
      }

      const difference = previousPosition - currentPosition;

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
