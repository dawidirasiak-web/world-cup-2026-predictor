import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { MatchCard } from "@/components/matches/match-card";
import { authOptions } from "@/lib/auth";
import { getLocalDayRange } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getRanking } from "@/lib/ranking";

function formatAverage(value: number) {
  return new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function StatTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
      <p className="mt-2 text-sm text-slate-600">{detail}</p>
    </div>
  );
}

function PointsBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const width = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500">{value} pkt</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-500"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (session.user.role === "ADMIN") {
    const [playersCount, matchQuestionsCount, preQuestionsCount, ranking] =
      await Promise.all([
        prisma.user.count({ where: { role: "USER" } }),
        prisma.matchQuestion.count(),
        prisma.preTournamentQuestion.count(),
        getRanking(),
      ]);

    return (
      <main className="mx-auto min-h-screen max-w-6xl px-6 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <p className="wc-kicker">ADMIN</p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Panel administratora
            </h1>
          </div>
          <nav className="flex gap-3 text-sm font-medium">
            <Link
              href="/ranking"
              className="rounded-md border border-slate-200 px-4 py-2"
            >
              Ranking
            </Link>
            <SignOutButton />
          </nav>
        </header>

        <section className="grid gap-4 py-8 md:grid-cols-3">
          <div className="wc-hero-card rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Gracze</p>
            <p className="mt-2 text-3xl font-semibold">{playersCount}</p>
            <p className="mt-2 text-sm text-slate-600">
              Użytkownicy biorący udział w rankingu.
            </p>
          </div>
          <div className="wc-hero-card rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Pytania meczowe
            </p>
            <p className="mt-2 text-3xl font-semibold">{matchQuestionsCount}</p>
            <p className="mt-2 text-sm text-slate-600">
              Odpowiedzi Tak/Nie po 1 pkt.
            </p>
          </div>
          <div className="wc-hero-card rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Przedturniejowe
            </p>
            <p className="mt-2 text-3xl font-semibold">{preQuestionsCount}</p>
            <p className="mt-2 text-sm text-slate-600">
              Finaliści, król strzelców i pytania.
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-[1fr_1fr]">
          <Link
            href="/admin"
            className="wc-hero-card rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5"
          >
            <p className="wc-kicker">Admin</p>
            <h2 className="mt-3 text-2xl font-semibold">
              Zaznacz poprawne odpowiedzi
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Ustaw odpowiedzi do pytań, finalistów, króla strzelców i liczbę
              bramek.
            </p>
          </Link>
          <Link
            href="/ranking"
            className="wc-hero-card rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5"
          >
            <p className="wc-kicker">Ranking</p>
            <h2 className="mt-3 text-2xl font-semibold">
              Podgląd klasyfikacji
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Lider: {ranking[0]?.name ?? "brak graczy"}.
            </p>
          </Link>
        </section>
      </main>
    );
  }

  const { start, end } = getLocalDayRange();

  const [
    allMatchesCount,
    todayMatches,
    preTournamentQuestionsCount,
    ranking,
    userMatchPredictions,
    userPreTournamentPrediction,
  ] = await Promise.all([
    prisma.match.count(),
    prisma.match.findMany({
      where: {
        startsAt: {
          gte: start,
          lt: end,
        },
      },
      orderBy: [{ startsAt: "asc" }, { displayOrder: "asc" }],
      include: {
        homeTeam: true,
        awayTeam: true,
        stadium: true,
        question: true,
        predictions: {
          where: { userId: session.user.id },
          select: {
            predictedHomeScore: true,
            predictedAwayScore: true,
          },
        },
      },
    }),
    prisma.preTournamentQuestion.count(),
    getRanking(),
    prisma.matchPrediction.findMany({
      where: { userId: session.user.id },
      select: {
        scorePoints: true,
        questionPoints: true,
        totalPoints: true,
        questionAnswer: true,
      },
    }),
    prisma.preTournamentPrediction.findUnique({
      where: { userId: session.user.id },
      select: {
        totalPoints: true,
      },
    }),
  ]);

  const userRank = ranking.find((player) => player.id === session.user.id);
  const predictedMatchesCount = userMatchPredictions.length;
  const matchScorePoints = userMatchPredictions.reduce(
    (sum, prediction) => sum + prediction.scorePoints,
    0,
  );
  const matchQuestionPoints = userMatchPredictions.reduce(
    (sum, prediction) => sum + prediction.questionPoints,
    0,
  );
  const matchTotalPoints = userMatchPredictions.reduce(
    (sum, prediction) => sum + prediction.totalPoints,
    0,
  );
  const preTournamentPoints = userPreTournamentPrediction?.totalPoints ?? 0;
  const totalPoints = matchTotalPoints + preTournamentPoints;
  const averagePerPredictedMatch =
    predictedMatchesCount > 0 ? matchTotalPoints / predictedMatchesCount : 0;
  const questionAnswersCount = userMatchPredictions.filter(
    (prediction) => prediction.questionAnswer,
  ).length;
  const predictionProgress =
    allMatchesCount > 0
      ? Math.round((predictedMatchesCount / allMatchesCount) * 100)
      : 0;
  const chartMax = Math.max(
    matchScorePoints,
    matchQuestionPoints,
    preTournamentPoints,
    1,
  );

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <p className="wc-kicker">
            {session.user.role}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Witaj, {session.user.name}
          </h1>
        </div>
        <nav className="flex gap-3 text-sm font-medium">
          <Link
            href="/"
            className="rounded-md border border-slate-200 px-4 py-2"
          >
            Start
          </Link>
          <Link
            href="/ranking"
            className="rounded-md border border-slate-200 px-4 py-2"
          >
            Ranking
          </Link>
          <SignOutButton />
        </nav>
      </header>

      <section className="grid gap-4 py-8 md:grid-cols-3">
        <div className="wc-hero-card rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Mecze</p>
          <p className="mt-2 text-3xl font-semibold">{allMatchesCount}</p>
          <p className="mt-2 text-sm text-slate-600">
            Pełny terminarz do typowania.
          </p>
          <Link
            href="/matches"
            className="mt-4 inline-flex rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Obstaw mecz
          </Link>
        </div>

        <div className="wc-hero-card rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Typy przedturniejowe
          </p>
          <p className="mt-2 text-3xl font-semibold">
            {preTournamentQuestionsCount}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Finaliści, król strzelców i pytania.
          </p>
          <Link
            href="/pre-tournament"
            className="mt-4 inline-flex rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Uzupełnij typy
          </Link>
        </div>

        <div className="wc-hero-card rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Centrum meczu</p>
          <p className="mt-2 text-3xl font-semibold">{allMatchesCount}</p>
          <p className="mt-2 text-sm text-slate-600">
            Wybierz dowolny mecz, sprawdź typy graczy, wynik i statystyki.
          </p>
          <Link
            href="/match-center"
            className="mt-4 inline-flex rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Otwórz centrum
          </Link>
        </div>
      </section>

      <section className="pb-8">
        <div className="mb-4">
          <p className="text-sm font-medium text-emerald-700">Statystyki</p>
          <h2 className="text-2xl font-semibold tracking-tight">
            Twoje liczby
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <StatTile
            label="Punkty"
            value={totalPoints}
            detail={`Pozycja: ${userRank?.position ?? "-"} / ${ranking.length}`}
          />
          <StatTile
            label="Obstawione mecze"
            value={`${predictedMatchesCount}/${allMatchesCount}`}
            detail={`${predictionProgress}% terminarza`}
          />
          <StatTile
            label="Średnia na mecz"
            value={formatAverage(averagePerPredictedMatch)}
            detail="Na obstawiony mecz"
          />
          <StatTile
            label="Pytania meczowe"
            value={questionAnswersCount}
            detail={`${matchQuestionPoints} pkt z odpowiedzi`}
          />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold">Rozbicie punktów</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Wyniki, pytania meczowe i typy przedturniejowe.
                </p>
              </div>
              <span className="rounded-md bg-slate-950 px-3 py-1 text-sm font-semibold text-white">
                {totalPoints} pkt
              </span>
            </div>
            <div className="space-y-5">
              <PointsBar
                label="Wyniki meczów"
                value={matchScorePoints}
                max={chartMax}
              />
              <PointsBar
                label="Pytania meczowe"
                value={matchQuestionPoints}
                max={chartMax}
              />
              <PointsBar
                label="Typy przedturniejowe"
                value={preTournamentPoints}
                max={chartMax}
              />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-semibold">Postęp typowania</h3>
            <p className="mt-1 text-sm text-slate-600">
              Ile meczów masz już zapisanych.
            </p>
            <div className="mt-6">
              <div className="mb-2 flex justify-between text-sm">
                <span className="font-medium text-slate-700">Terminarz</span>
                <span className="text-slate-500">{predictionProgress}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-slate-950"
                  style={{ width: `${predictionProgress}%` }}
                />
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-slate-500">Przedturniejowe</p>
                <p className="mt-1 font-semibold">
                  {userPreTournamentPrediction ? "Zapisane" : "Brak"}
                </p>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <p className="text-slate-500">Ranking</p>
                <p className="mt-1 font-semibold">
                  {userRank ? `#${userRank.position}` : "-"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-10">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-emerald-700">Dzisiaj</p>
            <h2 className="text-2xl font-semibold tracking-tight">
              Dzisiejsze mecze
            </h2>
          </div>
          <Link
            href="/matches"
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Pełny terminarz
          </Link>
        </div>

        {todayMatches.length > 0 ? (
          <div className="space-y-4">
            {todayMatches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            Dzisiaj nie ma meczów do typowania. Pełny terminarz znajdziesz w
            panelu wszystkich meczów.
          </div>
        )}
      </section>
    </main>
  );
}
