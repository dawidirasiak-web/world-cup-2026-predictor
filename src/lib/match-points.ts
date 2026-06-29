import { prisma } from "@/lib/prisma";
import {
  NEXT_PLAYOFF_SLOTS,
  getPlayoffSlotLabel,
  placeholderTeamCode,
} from "@/lib/playoff-bracket";
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
    winnerTeamId?: string | null;
  },
) {
  const currentMatch = await transaction.match.findUnique({
    where: { id: params.matchId },
    select: {
      homeTeamId: true,
      awayTeamId: true,
      phase: true,
    },
  });

  if (!currentMatch) {
    throw new Error("Nie znaleziono meczu.");
  }

  const isPlayoffMatch = currentMatch.phase !== "GROUP_STAGE";
  const isDraw = params.homeScore === params.awayScore;
  const winnerTeamId =
    isPlayoffMatch && isDraw ? params.winnerTeamId ?? null : null;

  if (
    winnerTeamId &&
    winnerTeamId !== currentMatch.homeTeamId &&
    winnerTeamId !== currentMatch.awayTeamId
  ) {
    throw new Error("Zwycięzca awansu musi być jedną z drużyn meczu.");
  }

  const match = await transaction.match.update({
    where: { id: params.matchId },
    data: {
      homeScore: params.homeScore,
      awayScore: params.awayScore,
      status: params.status,
      winnerTeamId,
    },
    select: {
      displayOrder: true,
    },
  });

  await recalculateMatchPredictions(transaction, params.matchId);

  if (params.status === "FINISHED") {
    await syncPlayoffSlotsFromMatch(transaction, match.displayOrder);
  }
}

export async function clearMatchResultAndRecalculate(
  transaction: Transaction,
  matchId: string,
) {
  const match = await transaction.match.update({
    where: { id: matchId },
    data: {
      homeScore: null,
      awayScore: null,
      winnerTeamId: null,
      status: "SCHEDULED",
    },
    select: {
      displayOrder: true,
    },
  });

  await recalculateMatchPredictions(transaction, matchId);
  await syncPlayoffSlotsFromMatch(transaction, match.displayOrder);
}

async function upsertPlaceholderTeam(transaction: Transaction, label: string) {
  return transaction.team.upsert({
    where: { fifaCode: placeholderTeamCode(label) },
    update: {
      name: label,
      shortName: label,
      flagUrl: null,
    },
    create: {
      fifaCode: placeholderTeamCode(label),
      name: label,
      shortName: label,
      flagUrl: null,
    },
  });
}

async function getTeamForPlayoffSlot(
  transaction: Transaction,
  sourceMatchNumber: number,
  mode: "winner" | "loser",
) {
  const sourceMatch = await transaction.match.findFirst({
    where: { displayOrder: sourceMatchNumber },
    select: {
      homeTeamId: true,
      awayTeamId: true,
      homeScore: true,
      awayScore: true,
      winnerTeamId: true,
    },
  });

  if (
    !sourceMatch ||
    sourceMatch.homeScore === null ||
    sourceMatch.awayScore === null
  ) {
    return null;
  }

  if (sourceMatch.homeScore === sourceMatch.awayScore) {
    if (
      !sourceMatch.winnerTeamId ||
      (sourceMatch.winnerTeamId !== sourceMatch.homeTeamId &&
        sourceMatch.winnerTeamId !== sourceMatch.awayTeamId)
    ) {
      return null;
    }

    if (mode === "winner") {
      return sourceMatch.winnerTeamId;
    }

    return sourceMatch.winnerTeamId === sourceMatch.homeTeamId
      ? sourceMatch.awayTeamId
      : sourceMatch.homeTeamId;
  }

  const homeWon = sourceMatch.homeScore > sourceMatch.awayScore;

  if (mode === "winner") {
    return homeWon ? sourceMatch.homeTeamId : sourceMatch.awayTeamId;
  }

  return homeWon ? sourceMatch.awayTeamId : sourceMatch.homeTeamId;
}

async function syncPlayoffSlotsFromMatch(
  transaction: Transaction,
  sourceMatchNumber: number,
) {
  const nextSlots = NEXT_PLAYOFF_SLOTS[sourceMatchNumber] ?? [];

  for (const slot of nextSlots) {
    const teamId =
      (await getTeamForPlayoffSlot(transaction, sourceMatchNumber, slot.mode)) ??
      (
        await upsertPlaceholderTeam(
          transaction,
          getPlayoffSlotLabel(slot.targetMatchNumber, slot.side),
        )
      ).id;

    const updatedMatch = await transaction.match.updateMany({
      where: { displayOrder: slot.targetMatchNumber },
      data:
        slot.side === "home"
          ? { homeTeamId: teamId }
          : { awayTeamId: teamId },
    });

    if (updatedMatch.count === 0) {
      continue;
    }

    const targetMatch = await transaction.match.findFirst({
      where: { displayOrder: slot.targetMatchNumber },
      select: {
        id: true,
        displayOrder: true,
        homeScore: true,
        awayScore: true,
        status: true,
      },
    });

    if (
      targetMatch?.status === "FINISHED" &&
      targetMatch.homeScore !== null &&
      targetMatch.awayScore !== null
    ) {
      await syncPlayoffSlotsFromMatch(transaction, targetMatch.displayOrder);
    }
  }
}
