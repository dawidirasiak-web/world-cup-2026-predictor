"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isMatchPredictionOpen } from "@/lib/prediction-lock";

const predictionSchema = z.object({
  matchId: z.string().min(1),
  predictedHomeScore: z.coerce.number().int().min(0).max(30),
  predictedAwayScore: z.coerce.number().int().min(0).max(30),
  questionAnswer: z.string().trim().max(500).optional(),
});

export type PredictionFormState = {
  ok: boolean;
  message: string;
};

export async function saveMatchPrediction(
  _state: PredictionFormState,
  formData: FormData,
): Promise<PredictionFormState> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      ok: false,
      message: "Musisz byc zalogowany, zeby obstawic mecz.",
    };
  }

  const parsed = predictionSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Niepoprawne dane typu.",
    };
  }

  const match = await prisma.match.findUnique({
    where: { id: parsed.data.matchId },
    include: { question: true },
  });

  if (!match) {
    return {
      ok: false,
      message: "Nie znaleziono meczu.",
    };
  }

  if (!isMatchPredictionOpen(match.startsAt)) {
    return {
      ok: false,
      message: "Typowanie tego meczu jest juz zamkniete.",
    };
  }

  await prisma.matchPrediction.upsert({
    where: {
      userId_matchId: {
        userId: session.user.id,
        matchId: match.id,
      },
    },
    update: {
      predictedHomeScore: parsed.data.predictedHomeScore,
      predictedAwayScore: parsed.data.predictedAwayScore,
      questionAnswer: parsed.data.questionAnswer,
    },
    create: {
      userId: session.user.id,
      matchId: match.id,
      predictedHomeScore: parsed.data.predictedHomeScore,
      predictedAwayScore: parsed.data.predictedAwayScore,
      questionAnswer: parsed.data.questionAnswer,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/matches");
  revalidatePath(`/matches/${match.id}`);
  revalidatePath("/ranking");

  redirect(`/matches#match-${match.id}`);
}
