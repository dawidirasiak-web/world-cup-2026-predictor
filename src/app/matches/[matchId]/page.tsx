import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ExternalMatchStats } from "@/components/matches/external-match-stats";
import { MatchPredictionForm } from "@/components/matches/match-prediction-form";
import { TeamLine } from "@/components/matches/team-line";
import { authOptions } from "@/lib/auth";
import { getExternalStatsUrl } from "@/lib/external-stats";
import { formatMatchDate, phaseLabel } from "@/lib/format";
import { formatPlayerName } from "@/lib/player-name";
import { isMatchPredictionOpen } from "@/lib/prediction-lock";
import { prisma } from "@/lib/prisma";

function formatQuestionAnswer(answer?: string | null) {
  return answer ? answer : "brak odpowiedzi";
}

export default async function MatchPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const { matchId } = await params;
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: true,
      awayTeam: true,
      stadium: true,
      question: true,
      _count: {
        select: { predictions: true },
      },
      predictions: {
        where: { userId: session.user.id },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!match) {
    notFound();
  }

  const prediction = match.predictions[0];
  const isOpen = isMatchPredictionOpen(match.startsAt);
  const canShowOtherPredictions = !isOpen;
  const otherPredictions = canShowOtherPredictions
    ? await prisma.matchPrediction.findMany({
        where: {
          matchId: match.id,
          userId: { not: session.user.id },
        },
        orderBy: { createdAt: "asc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      })
    : [];
  const usersWithoutPrediction = canShowOtherPredictions
    ? await prisma.user.findMany({
        where: {
          role: "USER",
          id: { not: session.user.id },
          matchPredictions: {
            none: {
              matchId: match.id,
            },
          },
        },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      })
    : [];
  const sofaScoreUrl = getExternalStatsUrl({
    externalStatsUrl: match.externalStatsUrl,
    matchNumber: match.displayOrder,
    homeTeam: match.homeTeam.name,
    awayTeam: match.awayTeam.name,
  });

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <Link
          href="/matches"
          className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          Powrót do terminarza
        </Link>
        <SignOutButton />
      </header>

      <section className="wc-section-hero">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase text-slate-500">
          <span>{phaseLabel(match.phase)}</span>
          {match.group ? <span>Grupa {match.group}</span> : null}
          <span>Mecz {match.displayOrder}</span>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-5">
          <h1 className="flex flex-wrap items-center gap-3 text-3xl font-semibold tracking-tight">
            <TeamLine
              name={match.homeTeam.name}
              flagUrl={match.homeTeam.flagUrl}
            />
            <span className="text-slate-400">
              {match.homeScore ?? "-"}:{match.awayScore ?? "-"}
            </span>
            <TeamLine
              name={match.awayTeam.name}
              flagUrl={match.awayTeam.flagUrl}
            />
          </h1>
          <span
            className={`rounded-md px-3 py-1 text-sm font-medium ${
              match.status === "LIVE"
                ? "bg-red-50 text-red-700"
                : match.status === "FINISHED"
                  ? "bg-slate-100 text-slate-700"
                  : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {match.status === "LIVE"
              ? "Live"
              : match.status === "FINISHED"
                ? "Zakończony"
                : "Zaplanowany"}
          </span>
        </div>
        <p className="mt-3 text-slate-600">{formatMatchDate(match.startsAt)}</p>
        <p className="mt-1 text-slate-600">
          {match.stadium
            ? `${match.stadium.name}, ${match.stadium.city}`
            : "Stadion do ustalenia"}
        </p>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
        <div className="space-y-5">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Twój typ</h2>
            <span
              className={`rounded-md px-3 py-1 text-sm font-medium ${
                isOpen
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {isOpen ? "Typowanie otwarte" : "Typowanie zamknięte"}
            </span>
            </div>
            <MatchPredictionForm
              matchId={match.id}
              homeTeamName={match.homeTeam.name}
              awayTeamName={match.awayTeam.name}
              question={match.question?.question}
              defaultHomeScore={prediction?.predictedHomeScore}
              defaultAwayScore={prediction?.predictedAwayScore}
              defaultQuestionAnswer={prediction?.questionAnswer}
              disabled={!isOpen}
            />
            {prediction ? (
              <div className="mt-4 grid gap-2 border-t border-slate-100 pt-4 text-sm sm:grid-cols-3">
                <div className="rounded-md bg-slate-50 p-3">
                  <p className="text-slate-500">Punkty za wynik</p>
                  <p className="mt-1 text-lg font-semibold">
                    {prediction.scorePoints}
                  </p>
                </div>
                <div className="rounded-md bg-slate-50 p-3">
                  <p className="text-slate-500">Punkty za pytanie</p>
                  <p className="mt-1 text-lg font-semibold">
                    {prediction.questionPoints}
                  </p>
                </div>
                <div className="rounded-md bg-slate-950 p-3 text-white">
                  <p className="text-white/70">Razem</p>
                  <p className="mt-1 text-lg font-semibold">
                    {prediction.totalPoints} pkt
                  </p>
                </div>
              </div>
            ) : null}
          </section>
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Typy innych graczy</h2>
            <p className="mt-2 text-sm text-slate-600">
              Zapisane typy dla tego meczu: {match._count.predictions}
            </p>
            <div className="mt-5 space-y-3">
              {!canShowOtherPredictions ? (
                <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">
                  Typy innych graczy beda widoczne od godziny rozpoczecia
                  meczu.
                </p>
              ) : otherPredictions.length > 0 ? (
                otherPredictions.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-md bg-slate-50 p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{item.user.name}</p>
                      <p className="text-xs text-slate-500">
                        {formatPlayerName(item.user)}
                      </p>
                      {match.question ? (
                        <p className="mt-2 inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">
                          Pytanie: {formatQuestionAnswer(item.questionAnswer)}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold">
                        {item.predictedHomeScore}:{item.predictedAwayScore}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-emerald-700">
                        {item.totalPoints} pkt
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">
                  Nikt inny nie zapisał jeszcze typu dla tego meczu.
                </p>
              )}
            </div>
            {canShowOtherPredictions && usersWithoutPrediction.length > 0 ? (
              <div className="mt-6 border-t border-slate-100 pt-5">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Nie obstawili
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Bez zapisanego typu: {usersWithoutPrediction.length}
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {usersWithoutPrediction.map((user) => (
                    <div
                      key={user.id}
                      className="rounded-md bg-slate-50 px-3 py-2 text-sm"
                    >
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-slate-500">
                        {formatPlayerName(user)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

        </div>

        <div>
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Składy SofaScore</h2>
            <ExternalMatchStats matchId={match.id} externalStatsUrl={sofaScoreUrl} />
          </section>
        </div>
      </section>
    </main>
  );
}
