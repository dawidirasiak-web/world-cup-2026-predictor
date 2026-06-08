import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { TeamLine } from "@/components/matches/team-line";
import { authOptions } from "@/lib/auth";
import { getExternalStatsUrl } from "@/lib/external-stats";
import { formatMatchDate, getLocalDayRange, phaseLabel } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const SOFASCORE_TOURNAMENT_URL =
  "https://www.sofascore.com/football/tournament/world/world-championship/16#id:58210";

const SOFASCORE_GROUP_WIDGETS = [
  { group: "A", tournamentId: 3954, slug: "world-championship-gr-a" },
  { group: "B", tournamentId: 3955, slug: "world-championship-gr-b" },
  { group: "C", tournamentId: 3956, slug: "world-championship-gr-c" },
  { group: "D", tournamentId: 3957, slug: "world-championship-gr-d" },
  { group: "E", tournamentId: 3958, slug: "world-championship-gr-e" },
  { group: "F", tournamentId: 3959, slug: "world-championship-gr-f" },
  { group: "G", tournamentId: 3960, slug: "world-championship-gr-g" },
  { group: "H", tournamentId: 3961, slug: "world-championship-gr-h" },
  { group: "I", tournamentId: 139403, slug: "world-championship-gr-i" },
  { group: "J", tournamentId: 139404, slug: "world-championship-gr-j" },
  { group: "K", tournamentId: 139405, slug: "world-championship-gr-k" },
  { group: "L", tournamentId: 139406, slug: "world-championship-gr-l" },
];

type MatchWithRelations = Awaited<ReturnType<typeof getMatches>>[number];

async function getMatches() {
  return prisma.match.findMany({
    orderBy: [{ startsAt: "asc" }, { displayOrder: "asc" }],
    include: {
      homeTeam: true,
      awayTeam: true,
      stadium: true,
      question: true,
      _count: {
        select: { predictions: true },
      },
    },
  });
}

function formatCorrectAnswer(answer?: string | null) {
  return answer ? `Poprawna odpowiedź: ${answer}` : "Poprawna odpowiedź: brak";
}

function getMatchStatus(match: {
  startsAt: Date;
  homeScore: number | null;
  awayScore: number | null;
}) {
  if (match.homeScore !== null && match.awayScore !== null) {
    return "Zakończony";
  }

  if (match.startsAt <= new Date()) {
    return "Live / w toku";
  }

  return "Zaplanowany";
}

function groupBy<T>(
  items: T[],
  getKey: (item: T) => string | null | undefined,
) {
  return items.reduce<Record<string, T[]>>((accumulator, item) => {
    const key = getKey(item);

    if (!key) {
      return accumulator;
    }

    accumulator[key] = accumulator[key] ?? [];
    accumulator[key].push(item);
    return accumulator;
  }, {});
}

function SofaScoreGroupWidget({
  group,
  tournamentId,
}: {
  group: string;
  tournamentId: number;
}) {
  const groupTitle = `Group ${group}`;
  const widgetSrc = `https://widgets.sofascore.com/embed/tournament/${tournamentId}/season/58210/standings/${encodeURIComponent(
    groupTitle,
  )}?widgetTitle=${encodeURIComponent(groupTitle)}&showCompetitionLogo=true`;

  return (
    <div className="h-[315px] overflow-hidden rounded-md border border-slate-100 bg-slate-50">
      <iframe
        id={`sofa-standings-embed-${tournamentId}-58210`}
        title={`Tabela SofaScore - Grupa ${group}`}
        src={widgetSrc}
        className="h-[431px] w-full max-w-full"
        loading="lazy"
        scrolling="no"
      />
    </div>
  );
}

function MatchQuestionBlock({ match }: { match: MatchWithRelations }) {
  if (!match.question) {
    return null;
  }

  return (
    <p className="mt-2 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
      {match.question.question}{" "}
      <span className="font-semibold">
        {formatCorrectAnswer(match.question.correctAnswer)}
      </span>
    </p>
  );
}

function MatchListItem({ match }: { match: MatchWithRelations }) {
  return (
    <Link
      href={`/matches/${match.id}`}
      className="block rounded-md bg-slate-50 px-3 py-2 text-sm transition hover:bg-slate-100"
    >
      <span className="flex items-center justify-between gap-4">
        <span className="min-w-0 truncate font-medium">
          {match.homeTeam.name} vs {match.awayTeam.name}
        </span>
        <span className="shrink-0 text-slate-500">
          {match.homeScore ?? "-"}:{match.awayScore ?? "-"} ·{" "}
          {formatMatchDate(match.startsAt)}
        </span>
      </span>
    </Link>
  );
}

export default async function MatchCenterPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const matches = await getMatches();
  const groups = SOFASCORE_GROUP_WIDGETS.map((widget) => widget.group);
  const groupStageMatches = matches.filter(
    (match) => match.phase === "GROUP_STAGE",
  );
  const matchesByGroup = groupBy(groupStageMatches, (match) => match.group);
  const upcomingMatchesCount = matches.filter(
    (match) => match.startsAt > new Date(),
  ).length;
  const playedMatchesCount = matches.filter(
    (match) => match.homeScore !== null && match.awayScore !== null,
  ).length;
  const { start: todayStart, end: todayEnd } = getLocalDayRange();
  const todayMatches = matches.filter(
    (match) => match.startsAt >= todayStart && match.startsAt < todayEnd,
  );

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <p className="wc-kicker">Centrum meczów</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Mistrzostwa Świata 2026
          </h1>
        </div>
        <nav className="flex gap-3">
          <Link
            href="/dashboard"
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Dashboard
          </Link>
          <SignOutButton />
        </nav>
      </header>

      <section className="grid gap-4 py-8 md:grid-cols-4">
        <div className="wc-hero-card rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Wszystkie mecze</p>
          <p className="mt-2 text-3xl font-semibold">{matches.length}</p>
          <p className="mt-2 text-sm text-slate-600">
            Pełny terminarz turnieju.
          </p>
        </div>
        <div className="wc-hero-card rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Grupy</p>
          <p className="mt-2 text-3xl font-semibold">{groups.length}</p>
          <p className="mt-2 text-sm text-slate-600">Po 4 drużyny w grupie.</p>
        </div>
        <div className="wc-hero-card rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Nadchodzące</p>
          <p className="mt-2 text-3xl font-semibold">{upcomingMatchesCount}</p>
          <p className="mt-2 text-sm text-slate-600">Mecze przed startem.</p>
        </div>
        <div className="wc-hero-card rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Z wynikami</p>
          <p className="mt-2 text-3xl font-semibold">{playedMatchesCount}</p>
          <p className="mt-2 text-sm text-slate-600">
            Wyniki z SofaScore lub wpisane przez admina.
          </p>
        </div>
      </section>

      <section className="mb-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-emerald-700">Dzisiaj</p>
            <h2 className="text-2xl font-semibold tracking-tight">
              Dzisiejsze mecze
            </h2>
          </div>
          <span className="rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-200">
            {todayMatches.length} spotkań
          </span>
        </div>

        {todayMatches.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {todayMatches.map((match) => {
              const statsUrl = getExternalStatsUrl({
                externalStatsUrl: match.externalStatsUrl,
                matchNumber: match.displayOrder,
                homeTeam: match.homeTeam.name,
                awayTeam: match.awayTeam.name,
              });

              return (
                <article
                  key={match.id}
                  className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {phaseLabel(match.phase)} · {match.group ?? "Mecz"} ·
                        mecz {match.displayOrder}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xl font-semibold">
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
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        {formatMatchDate(match.startsAt)} ·{" "}
                        {match.stadium
                          ? `${match.stadium.name}, ${match.stadium.city}`
                          : "Stadion do potwierdzenia"}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        Typy graczy: {match._count.predictions}
                      </p>
                      <MatchQuestionBlock match={match} />
                    </div>
                    <span className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                      {getMatchStatus(match)}
                    </span>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                    <Link
                      href={`/matches/${match.id}`}
                      className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                    >
                      Szczegóły
                    </Link>
                    <a
                      href={statsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      SofaScore
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
            Dzisiaj nie ma meczów. Najbliższe spotkania znajdziesz niżej w
            terminarzu i tabelach grup.
          </div>
        )}
      </section>

      <section className="wc-hero-card mb-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-emerald-700">
              Informacje o turnieju
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
              Faza grupowa, tabele i wyniki
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              W fazie grupowej jest 12 grup po 4 drużyny. Do 1/16 finału
              awansują dwie najlepsze drużyny z każdej grupy oraz osiem
              najlepszych drużyn z trzecich miejsc. Tabele poniżej są
              oficjalnymi widgetami SofaScore.
            </p>
          </div>
          <a
            href={SOFASCORE_TOURNAMENT_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Otwórz turniej w SofaScore
          </a>
        </div>
      </section>

      <section className="pb-10">
        <div className="mb-4">
          <p className="text-sm font-medium text-emerald-700">Grupy</p>
          <h2 className="text-2xl font-semibold tracking-tight">
            Tabele SofaScore i mecze grupowe
          </h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {SOFASCORE_GROUP_WIDGETS.map((widget) => {
            const groupMatches = matchesByGroup[widget.group] ?? [];

            return (
              <article
                key={widget.group}
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Grupa
                    </p>
                    <h3 className="text-xl font-semibold">
                      Grupa {widget.group}
                    </h3>
                  </div>
                  <span className="rounded-md bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
                    {groupMatches.length} meczów
                  </span>
                </div>

                <SofaScoreGroupWidget {...widget} />

                <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Mecze w aplikacji
                  </p>
                  {groupMatches.length > 0 ? (
                    groupMatches.map((match) => (
                      <MatchListItem key={match.id} match={match} />
                    ))
                  ) : (
                    <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-500">
                      Brak meczów tej grupy w terminarzu aplikacji.
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="space-y-4 pb-10">
        <div className="mb-4">
          <p className="text-sm font-medium text-emerald-700">Terminarz</p>
          <h2 className="text-2xl font-semibold tracking-tight">
            Wszystkie mecze
          </h2>
        </div>

        {matches.map((match) => {
          const status = getMatchStatus(match);
          const statsUrl = getExternalStatsUrl({
            externalStatsUrl: match.externalStatsUrl,
            matchNumber: match.displayOrder,
            homeTeam: match.homeTeam.name,
            awayTeam: match.awayTeam.name,
          });

          return (
            <article
              key={match.id}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {phaseLabel(match.phase)} · {match.group ?? "Mecz"} · mecz{" "}
                    {match.displayOrder}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xl font-semibold">
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
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {formatMatchDate(match.startsAt)} ·{" "}
                    {match.stadium
                      ? `${match.stadium.name}, ${match.stadium.city}`
                      : "Stadion do potwierdzenia"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Typy graczy: {match._count.predictions}
                  </p>
                  <MatchQuestionBlock match={match} />
                </div>

                <span
                  className={
                    status === "Zakończony"
                      ? "rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700"
                      : "rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"
                  }
                >
                  {status}
                </span>
              </div>

              <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <Link
                  href={`/matches/${match.id}`}
                  className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Szczegóły
                </Link>
                <a
                  href={statsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  SofaScore
                </a>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
