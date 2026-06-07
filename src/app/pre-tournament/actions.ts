"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { isPreTournamentPredictionOpen } from "@/lib/prediction-lock";
import { prisma } from "@/lib/prisma";

const predictionSchema = z.object({
  finalistOneTeamId: z.string().min(1),
  finalistTwoTeamId: z.string().min(1),
  topScorer: z.string().trim().min(2).max(120),
  topScorerGoals: z.coerce.number().int().min(0).max(99),
});

export type PreTournamentFormState = {
  ok: boolean;
  message: string;
};

export async function savePreTournamentPrediction(
  _state: PreTournamentFormState,
  formData: FormData,
): Promise<PreTournamentFormState> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      ok: false,
      message: "Musisz być zalogowany, żeby zapisać typy.",
    };
  }

  const firstMatch = await prisma.match.findFirst({
    orderBy: { startsAt: "asc" },
    select: { startsAt: true },
  });

  if (firstMatch && !isPreTournamentPredictionOpen(firstMatch.startsAt)) {
    return {
      ok: false,
      message: "Typy przedturniejowe są już zamknięte.",
    };
  }

  const parsed = predictionSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Niepoprawne dane.",
    };
  }

  if (parsed.data.finalistOneTeamId === parsed.data.finalistTwoTeamId) {
    return {
      ok: false,
      message: "Wybierz dwóch różnych finalistów.",
    };
  }

  const questions = await prisma.preTournamentQuestion.findMany({
    orderBy: { displayOrder: "asc" },
  });

  const missingAnswer = questions.find((question) => {
    const answer = formData.get(`question-${question.id}`);
    return !answer || String(answer).trim().length === 0;
  });

  if (missingAnswer) {
    return {
      ok: false,
      message: "Odpowiedz na wszystkie pytania przedturniejowe.",
    };
  }

  await prisma.$transaction(async (transaction) => {
    const prediction = await transaction.preTournamentPrediction.upsert({
      where: { userId: session.user.id },
      update: {
        finalistOneTeamId: parsed.data.finalistOneTeamId,
        finalistTwoTeamId: parsed.data.finalistTwoTeamId,
        topScorer: parsed.data.topScorer,
        topScorerGoals: parsed.data.topScorerGoals,
      },
      create: {
        userId: session.user.id,
        finalistOneTeamId: parsed.data.finalistOneTeamId,
        finalistTwoTeamId: parsed.data.finalistTwoTeamId,
        topScorer: parsed.data.topScorer,
        topScorerGoals: parsed.data.topScorerGoals,
      },
    });

    for (const question of questions) {
      const answer = String(formData.get(`question-${question.id}`) ?? "").trim();

      await transaction.preTournamentAnswer.upsert({
        where: {
          predictionId_questionId: {
            predictionId: prediction.id,
            questionId: question.id,
          },
        },
        update: { answer },
        create: {
          predictionId: prediction.id,
          questionId: question.id,
          answer,
        },
      });
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/pre-tournament");
  revalidatePath("/ranking");

  return {
    ok: true,
    message: "Typy przedturniejowe zapisane.",
  };
}
