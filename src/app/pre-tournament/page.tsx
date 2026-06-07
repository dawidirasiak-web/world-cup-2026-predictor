import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { PreTournamentForm } from "@/components/pre-tournament/pre-tournament-form";
import { authOptions } from "@/lib/auth";
import { formatMatchDate } from "@/lib/format";
import { isPreTournamentPredictionOpen } from "@/lib/prediction-lock";
import { prisma } from "@/lib/prisma";

export default async function PreTournamentPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const [teams, questions, firstMatch, existingPrediction] = await Promise.all([
    prisma.team.findMany({
      orderBy: [{ group: "asc" }, { displayOrder: "asc" }, { name: "asc" }],
      where: {
        group: { not: null },
      },
      select: {
        id: true,
        name: true,
        group: true,
      },
    }),
    prisma.preTournamentQuestion.findMany({
      orderBy: { displayOrder: "asc" },
      select: {
        id: true,
        question: true,
        type: true,
        points: true,
      },
    }),
    prisma.match.findFirst({
      orderBy: { startsAt: "asc" },
      select: { startsAt: true },
    }),
    prisma.preTournamentPrediction.findUnique({
      where: { userId: session.user.id },
      select: {
        finalistOneTeamId: true,
        finalistTwoTeamId: true,
        topScorer: true,
        topScorerGoals: true,
        answers: {
          select: {
            questionId: true,
            answer: true,
          },
        },
      },
    }),
  ]);

  const isOpen = firstMatch
    ? isPreTournamentPredictionOpen(firstMatch.startsAt)
    : true;

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <Link
          href="/dashboard"
          className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          Powrót do dashboardu
        </Link>
        <SignOutButton />
      </header>

      <section className="wc-section-hero">
        <p className="wc-kicker">
          Typy przedturniejowe
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Finaliści, król strzelców i pytania
        </h1>
        <p className="mt-4 text-slate-600">
          Typowanie jest otwarte do startu pierwszego meczu
          {firstMatch ? `: ${formatMatchDate(firstMatch.startsAt)}.` : "."}
        </p>
      </section>

      <PreTournamentForm
        teams={teams}
        questions={questions}
        existingPrediction={existingPrediction}
        disabled={!isOpen}
      />
    </main>
  );
}
