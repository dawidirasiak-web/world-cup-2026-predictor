import { prisma } from "@/lib/prisma";
import {
  calculateMatchQuestionPoints,
  calculateMatchScorePoints,
} from "@/lib/scoring";

type Transaction = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export async function recalculateMatchPredictions(
  transaction: Transaction,
  matchId: string,
) {
  const match = await transaction.match.findUnique({
    where: { id: matchId },
    select: {
      homeScore: true,
      awayScore: true,
      question: {
        select: {
          correctAnswer: true,
        },
      },
      predictions: {
        select: {
          id: true,
          predictedHomeScore: true,
          predictedAwayScore: true,
          questionAnswer: true,
        },
      },
    },
  });

  if (!match) {
    return;
  }

  for (const prediction of match.predictions) {
    const scorePoints =
      match.homeScore !== null && match.awayScore !== null
        ? calculateMatchScorePoints({
            predictedHomeScore: prediction.predictedHomeScore,
            predictedAwayScore: prediction.predictedAwayScore,
            homeScore: match.homeScore,
            awayScore: match.awayScore,
          })
        : 0;
    const questionPoints = calculateMatchQuestionPoints(
      prediction.questionAnswer,
      match.question?.correctAnswer,
    );

    await transaction.matchPrediction.update({
      where: { id: prediction.id },
      data: {
        scorePoints,
        questionPoints,
        totalPoints: scorePoints + questionPoints,
      },
    });
  }
}

export async function updateMatchResultAndRecalculate(
  transaction: Transaction,
  params: {
    matchId: string;
    homeScore: number;
    awayScore: number;
    status: "LIVE" | "FINISHED";
  },
) {
  await transaction.match.update({
    where: { id: params.matchId },
    data: {
      homeScore: params.homeScore,
      awayScore: params.awayScore,
      status: params.status,
    },
  });

  await recalculateMatchPredictions(transaction, params.matchId);
}
