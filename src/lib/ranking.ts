import { prisma } from "@/lib/prisma";

export async function getRanking() {
  const users = await prisma.user.findMany({
    where: { role: "USER" },
    orderBy: { name: "asc" },
    include: {
      matchPredictions: {
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

  return users
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
        role: user.role,
        matchScorePoints,
        matchQuestionPoints,
        matchTotalPoints,
        preTournamentPoints,
        totalPoints: matchTotalPoints + preTournamentPoints,
      };
    })
    .sort((first, second) => {
      if (second.totalPoints !== first.totalPoints) {
        return second.totalPoints - first.totalPoints;
      }

      return first.name.localeCompare(second.name, "pl");
    })
    .map((user, index) => ({
      ...user,
      position: index + 1,
    }));
}
