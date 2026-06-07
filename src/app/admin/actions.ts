"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { recalculateMatchPredictions } from "@/lib/match-points";
import { prisma } from "@/lib/prisma";

const yesNoAnswerSchema = z.enum(["Tak", "Nie", ""]);
const tournamentResultSchema = z.object({
  finalistOneTeamId: z.string().optional(),
  finalistTwoTeamId: z.string().optional(),
  topScorer: z.string().trim().optional(),
  topScorerGoals: z.coerce.number().int().min(0).max(99).optional(),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Brak uprawnień administratora.");
  }

  return session;
}

function normalizeAnswer(answer: string | null | undefined) {
  return answer?.trim().toLowerCase() ?? "";
}

async function recalculatePreTournamentPrediction(
  transaction: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  predictionId: string,
) {
  const [prediction, result, answers] = await Promise.all([
    transaction.preTournamentPrediction.findUnique({
      where: { id: predictionId },
      select: {
        finalistOneTeamId: true,
        finalistTwoTeamId: true,
        topScorer: true,
        topScorerGoals: true,
      },
    }),
    transaction.tournamentResult.findUnique({
      where: { id: "world-cup-2026" },
      select: {
        finalistOneTeamId: true,
        finalistTwoTeamId: true,
        topScorer: true,
        topScorerGoals: true,
      },
    }),
    transaction.preTournamentAnswer.findMany({
      where: { predictionId },
      select: { points: true },
    }),
  ]);

  if (!prediction) {
    return;
  }

  const correctFinalists = [
    result?.finalistOneTeamId,
    result?.finalistTwoTeamId,
  ].filter(Boolean);
  const predictedFinalists = [
    prediction.finalistOneTeamId,
    prediction.finalistTwoTeamId,
  ];
  const finalistPoints = predictedFinalists.reduce(
    (sum, teamId) => sum + (correctFinalists.includes(teamId) ? 15 : 0),
    0,
  );
  const topScorerPoints =
    result?.topScorer &&
    normalizeAnswer(prediction.topScorer) === normalizeAnswer(result.topScorer)
      ? 20
      : 0;
  const topScorerGoalsPoints =
    typeof result?.topScorerGoals === "number" &&
    prediction.topScorerGoals === result.topScorerGoals
      ? 10
      : 0;
  const questionPoints = answers.reduce((sum, answer) => sum + answer.points, 0);

  await transaction.preTournamentPrediction.update({
    where: { id: predictionId },
    data: {
      finalistPoints,
      topScorerPoints,
      topScorerGoalsPoints,
      questionPoints,
      totalPoints:
        finalistPoints +
        topScorerPoints +
        topScorerGoalsPoints +
        questionPoints,
    },
  });
}

export async function saveMatchQuestionAnswer(formData: FormData) {
  await requireAdmin();

  const parsed = z
    .object({
      questionId: z.string().min(1),
      correctAnswer: yesNoAnswerSchema,
    })
    .safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    throw new Error("Niepoprawna odpowiedź.");
  }

  const correctAnswer = parsed.data.correctAnswer || null;

  await prisma.$transaction(async (transaction) => {
    const question = await transaction.matchQuestion.update({
      where: { id: parsed.data.questionId },
      data: { correctAnswer },
      include: {
        match: {
          select: {
            id: true,
          },
        },
      },
    });

    await recalculateMatchPredictions(transaction, question.match.id);
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/ranking");
  revalidatePath("/matches");
}

export async function savePreTournamentQuestionAnswer(formData: FormData) {
  await requireAdmin();

  const parsed = z
    .object({
      questionId: z.string().min(1),
      correctAnswer: yesNoAnswerSchema,
    })
    .safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    throw new Error("Niepoprawna odpowiedź.");
  }

  const correctAnswer = parsed.data.correctAnswer || null;

  await prisma.$transaction(async (transaction) => {
    const question = await transaction.preTournamentQuestion.update({
      where: { id: parsed.data.questionId },
      data: { correctAnswer },
      include: {
        answers: {
          select: {
            id: true,
            answer: true,
            predictionId: true,
          },
        },
      },
    });

    const affectedPredictionIds = new Set<string>();

    for (const answer of question.answers) {
      const points =
        correctAnswer &&
        normalizeAnswer(answer.answer) === normalizeAnswer(correctAnswer)
          ? question.points
          : 0;

      affectedPredictionIds.add(answer.predictionId);

      await transaction.preTournamentAnswer.update({
        where: { id: answer.id },
        data: { points },
      });
    }

    for (const predictionId of affectedPredictionIds) {
      await recalculatePreTournamentPrediction(transaction, predictionId);
    }
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/ranking");
  revalidatePath("/pre-tournament");
}

export async function saveTournamentResult(formData: FormData) {
  await requireAdmin();

  const raw = Object.fromEntries(formData);
  const parsed = tournamentResultSchema.safeParse({
    ...raw,
    topScorerGoals:
      raw.topScorerGoals === "" || raw.topScorerGoals === undefined
        ? undefined
        : raw.topScorerGoals,
  });

  if (!parsed.success) {
    throw new Error("Niepoprawne dane wyników przedturniejowych.");
  }

  const finalistOneTeamId = parsed.data.finalistOneTeamId || null;
  const finalistTwoTeamId = parsed.data.finalistTwoTeamId || null;

  if (
    finalistOneTeamId &&
    finalistTwoTeamId &&
    finalistOneTeamId === finalistTwoTeamId
  ) {
    throw new Error("Finaliści muszą być różnymi drużynami.");
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.tournamentResult.upsert({
      where: { id: "world-cup-2026" },
      update: {
        finalistOneTeamId,
        finalistTwoTeamId,
        topScorer: parsed.data.topScorer || null,
        topScorerGoals:
          typeof parsed.data.topScorerGoals === "number"
            ? parsed.data.topScorerGoals
            : null,
      },
      create: {
        id: "world-cup-2026",
        finalistOneTeamId,
        finalistTwoTeamId,
        topScorer: parsed.data.topScorer || null,
        topScorerGoals:
          typeof parsed.data.topScorerGoals === "number"
            ? parsed.data.topScorerGoals
            : null,
      },
    });

    const predictions = await transaction.preTournamentPrediction.findMany({
      select: { id: true },
    });

    for (const prediction of predictions) {
      await recalculatePreTournamentPrediction(transaction, prediction.id);
    }
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/ranking");
  revalidatePath("/pre-tournament");
}
