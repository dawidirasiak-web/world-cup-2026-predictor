import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { authOptions } from "@/lib/auth";
import { formatMatchDate, phaseLabel } from "@/lib/format";
import { prisma } from "@/lib/prisma";

function formatDay(date: Date) {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatQuestionAnswer(answer?: string | null) {
  if (!answer) {
    return "brak";
  }

  const normalized = answer.trim().toLowerCase();

  if (normalized === "yes" || normalized === "tak") {
    return "Tak";
  }

  if (normalized === "no" || normalized === "nie") {
    return "Nie";
  }

  return answer;
}

function ScorePill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-2">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-950">{value} pkt</p>
    </div>
  );
}

export default async function PunktacjaPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const [matchPredictions, preTournamentPrediction] = await Promise.all([
    prisma.matchPrediction.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
      include: {
        match: {
          include: {
            homeTeam: true,
            awayTeam: true,
            question: true,
          },
        },
      },
    }),
    prisma.preTournamentPrediction.findUnique({
      where: { userId: session.user.id },
      include: {
        finalistOneTeam: true,
        finalistTwoTeam: true,
        answers: {
          orderBy: { question: { displayOrder: "asc" } },
          include: { question: true },
        },
      },
    }),
  ]);

  const matchScorePoints = matchPredictions.reduce(
    (sum, prediction) => sum + prediction.scorePoints,
    0,
  );
  const matchQuestionPoints = matchPredictions.reduce(
    (sum, prediction) => sum + prediction.questionPoints,
    0,
  );
  const matchTotalPoints = matchPredictions.reduce(
    (sum, prediction) => sum + prediction.totalPoints,
    0,
  );
  const preTournamentPoints = preTournamentPrediction?.totalPoints ?? 0;
  const totalPoints = matchTotalPoints + preTournamentPoints;
  const sortedMatchPredictions = [...matchPredictions].sort(
    (first, second) =>
      first.match.startsAt.getTime() - second.match.startsAt.getTime() ||
      first.createdAt.getTime() - second.createdAt.getTime(),
  );
  const predictionsByDay = sortedMatchPredictions.reduce<
    Record<string, typeof matchPredictions>
  >((groups, prediction) => {
    const day = formatDay(prediction.match.startsAt);
    groups[day] = groups[day] ?? [];
    groups[day].push(prediction);
    return groups;
  }, {});

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <p className="wc-kicker">Punktacja</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Szczegółowy bilans punktów
          </h1>
        </div>
        <nav className="flex flex-wrap gap-3 text-sm font-medium">
          <Link
            href="/dashboard"
            className="rounded-md border border-slate-200 bg-white px-4 py-2"
          >
            Strona Główna
          </Link>
          <Link
            href="/ranking"
            className="rounded-md border border-slate-200 bg-white px-4 py-2"
          >
            Ranking
          </Link>
          <SignOutButton />
        </nav>
      </header>

      <section className="grid gap-4 py-8 md:grid-cols-4">
        <div className="wc-hero-card rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Razem</p>
          <p className="mt-2 text-3xl font-semibold">{totalPoints}</p>
          <p className="mt-2 text-sm text-slate-600">Wszystkie punkty gracza.</p>
        </div>
        <div className="wc-hero-card rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Wyniki meczów</p>
          <p className="mt-2 text-3xl font-semibold">{matchScorePoints}</p>
          <p className="mt-2 text-sm text-slate-600">Punkty za trafione wyniki.</p>
        </div>
        <div className="wc-hero-card rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Pytania meczowe</p>
          <p className="mt-2 text-3xl font-semibold">{matchQuestionPoints}</p>
          <p className="mt-2 text-sm text-slate-600">Punkty za odpowiedzi Tak/Nie.</p>
        </div>
        <div className="wc-hero-card rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Przedturniejowe</p>
          <p className="mt-2 text-3xl font-semibold">{preTournamentPoints}</p>
          <p className="mt-2 text-sm text-slate-600">Finaliści, król strzelców i pytania.</p>
        </div>
      </section>

      <section className="pb-8">
        <div className="mb-4">
          <p className="text-sm font-medium text-emerald-700">Mecze</p>
          <h2 className="text-2xl font-semibold tracking-tight">
            Punkty dzień po dniu
          </h2>
        </div>

        {Object.entries(predictionsByDay).length > 0 ? (
          <div className="space-y-5">
            {Object.entries(predictionsByDay).map(([day, predictions]) => (
              <section
                key={day}
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">{day}</h3>
                  <span className="rounded-md bg-slate-950 px-3 py-1 text-sm font-semibold text-white">
                    {predictions.reduce(
                      (sum, prediction) => sum + prediction.totalPoints,
                      0,
                    )}{" "}
                    pkt
                  </span>
                </div>

                <div className="space-y-3">
                  {predictions.map((prediction) => {
                    const match = prediction.match;
                    const result =
                      match.homeScore !== null && match.awayScore !== null
                        ? `${match.homeScore}:${match.awayScore}`
                        : "-:-";

                    return (
                      <article
                        key={prediction.id}
                        className="rounded-md border border-slate-100 bg-slate-50 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase text-slate-500">
                              {phaseLabel(match.phase)}{" "}
                              {match.group ? `· Grupa ${match.group}` : ""} ·{" "}
                              {formatMatchDate(match.startsAt)}
                            </p>
                            <h4 className="mt-2 font-semibold">
                              {match.homeTeam.name} vs {match.awayTeam.name}
                            </h4>
                            <p className="mt-1 text-sm text-slate-600">
                              Wynik meczu: <strong>{result}</strong> · Twój typ:{" "}
                              <strong>
                                {prediction.predictedHomeScore}:
                                {prediction.predictedAwayScore}
                              </strong>
                            </p>
                            {match.question ? (
                              <p className="mt-2 text-sm text-slate-600">
                                {match.question.question}
                                <br />
                                Twoja odpowiedź:{" "}
                                <strong>
                                  {formatQuestionAnswer(
                                    prediction.questionAnswer,
                                  )}
                                </strong>{" "}
                                · Poprawna:{" "}
                                <strong>
                                  {formatQuestionAnswer(
                                    match.question.correctAnswer,
                                  )}
                                </strong>
                              </p>
                            ) : null}
                          </div>
                          <div className="grid min-w-[220px] grid-cols-3 gap-2">
                            <ScorePill
                              label="Wynik"
                              value={prediction.scorePoints}
                            />
                            <ScorePill
                              label="Pytanie"
                              value={prediction.questionPoints}
                            />
                            <ScorePill
                              label="Razem"
                              value={prediction.totalPoints}
                            />
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            Nie masz jeszcze zapisanych typów meczowych.
          </div>
        )}
      </section>

      <section className="pb-10">
        <div className="mb-4">
          <p className="text-sm font-medium text-emerald-700">
            Przed turniejem
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">
            Typy przedturniejowe
          </h2>
        </div>

        {preTournamentPrediction ? (
          <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-3 md:grid-cols-4">
              <ScorePill
                label="Finaliści"
                value={preTournamentPrediction.finalistPoints}
              />
              <ScorePill
                label="Król strzelców"
                value={preTournamentPrediction.topScorerPoints}
              />
              <ScorePill
                label="Liczba bramek"
                value={preTournamentPrediction.topScorerGoalsPoints}
              />
              <ScorePill
                label="Pytania"
                value={preTournamentPrediction.questionPoints}
              />
            </div>

            <div className="rounded-md bg-slate-50 p-4 text-sm text-slate-700">
              <p>
                Finaliści:{" "}
                <strong>
                  {preTournamentPrediction.finalistOneTeam.name}
                </strong>{" "}
                i{" "}
                <strong>
                  {preTournamentPrediction.finalistTwoTeam.name}
                </strong>
              </p>
              <p className="mt-1">
                Król strzelców:{" "}
                <strong>{preTournamentPrediction.topScorer}</strong>, bramki:{" "}
                <strong>{preTournamentPrediction.topScorerGoals}</strong>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Ostatnia aktualizacja:{" "}
                {formatMatchDate(preTournamentPrediction.updatedAt)}
              </p>
            </div>

            <div className="space-y-2">
              {preTournamentPrediction.answers.map((answer) => (
                <div
                  key={answer.id}
                  className="rounded-md border border-slate-100 bg-slate-50 p-3 text-sm"
                >
                  <p className="font-medium">{answer.question.question}</p>
                  <p className="mt-1 text-slate-600">
                    Twoja odpowiedź: <strong>{answer.answer}</strong> · Poprawna:{" "}
                    <strong>
                      {formatQuestionAnswer(answer.question.correctAnswer)}
                    </strong>{" "}
                    · Punkty: <strong>{answer.points}</strong>
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            Nie masz jeszcze zapisanych typów przedturniejowych.
          </div>
        )}
      </section>
    </main>
  );
}
