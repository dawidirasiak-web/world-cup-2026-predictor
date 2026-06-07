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

type MatchWithRelations = Awaited<ReturnType<typeof getMatches>>[number];
type TeamForStandings = Awaited<ReturnType<typeof getTeams>>[number];

type StandingRow = {
  team: TeamForStandings;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

async function getMatches() {
  return prisma.match.findMany({
    orderBy: [{ startsAt: "asc" }, { displayOrder: "asc" }],
    include: {
      homeTeam: true,
      awayTeam: true,
      stadium: true,
      _count: {
        select: { predictions: true },
      },
    },
  });
}

async function getTeams() {
  return prisma.team.findMany({
    where: {
      group: { not: null },
    },
    orderBy: [{ group: "asc" }, { displayOrder: "asc" }, { name: "asc" }],
  });
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

function createEmptyRow(team: TeamForStandings): StandingRow {
  return {
    team,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
  };
}

function applyResult(
  row: StandingRow,
  goalsFor: number,
  goalsAgainst: number,
) {
  row.played += 1;
  row.goalsFor += goalsFor;
  row.goalsAgainst += goalsAgainst;
  row.goalDifference = row.goalsFor - row.goalsAgainst;

  if (goalsFor > goalsAgainst) {
    row.won += 1;
    row.points += 3;
    return;
  }

  if (goalsFor === goalsAgainst) {
    row.drawn += 1;
    row.points += 1;
    return;
  }

  row.lost += 1;
}

function buildGroupStandings(
  groupTeams: TeamForStandings[],
  groupMatches: MatchWithRelations[],
) {
  const rows = new Map(
    groupTeams.map((team) => [team.id, createEmptyRow(team)]),
  );

  for (const match of groupMatches) {
    if (match.homeScore === null || match.awayScore === null) {
      continue;
    }

    const homeRow = rows.get(match.homeTeamId);
    const awayRow = rows.get(match.awayTeamId);

    if (!homeRow || !awayRow) {
      continue;
    }

    applyResult(homeRow, match.homeScore, match.awayScore);
    applyResult(awayRow, match.awayScore, match.homeScore);
  }

  return [...rows.values()].sort((first, second) => {
    if (second.points !== first.points) return second.points - first.points;
    if (second.goalDifference !== first.goalDifference) {
      return second.goalDifference - first.goalDifference;
    }
    if (second.goalsFor !== first.goalsFor) return second.goalsFor - first.goalsFor;
    return first.team.name.localeCompare(second.team.name, "pl");
  });
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

export default async function MatchCenterPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const [matches, teams] = await Promise.all([getMatches(), getTeams()]);
  const groups = [...new Set(teams.map((team) => team.group).filter(Boolean))]
    .sort((first, second) => first!.localeCompare(second!, "pl")) as string[];
  const teamsByGroup = groupBy(teams, (team) => team.group);
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
          <p className="wc-kicker">
            Centrum meczów
          </p>
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
          <p className="mt-2 text-sm text-slate-600">Pełny terminarz turnieju.</p>
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
          <p className="mt-2 text-sm text-slate-600">Wyniki wpisane przez admina.</p>
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
              najlepszych drużyn z trzecich miejsc. Tabele poniżej liczą się z
              wyników wpisanych w aplikacji.
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
            Tabele i mecze grupowe
          </h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {groups.map((group) => {
            const standings = buildGroupStandings(
              teamsByGroup[group] ?? [],
              matchesByGroup[group] ?? [],
            );
            const groupMatches = matchesByGroup[group] ?? [];

            return (
              <article
                key={group}
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Grupa
                    </p>
                    <h3 className="text-xl font-semibold">Grupa {group}</h3>
                  </div>
                  <span className="rounded-md bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
                    {groupMatches.length} meczów
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                        <th className="py-2 pr-3">#</th>
                        <th className="py-2 pr-3">Drużyna</th>
                        <th className="py-2 pr-3 text-center">M</th>
                        <th className="py-2 pr-3 text-center">B</th>
                        <th className="py-2 pr-3 text-center">+/-</th>
                        <th className="py-2 text-right">Pkt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((row, index) => (
                        <tr
                          key={row.team.id}
                          className="border-b border-slate-50 last:border-0"
                        >
                          <td className="py-2 pr-3 text-slate-500">
                            {index + 1}
                          </td>
                          <td className="py-2 pr-3 font-medium">
                            <TeamLine
                              name={row.team.name}
                              flagUrl={row.team.flagUrl}
                            />
                          </td>
                          <td className="py-2 pr-3 text-center">
                            {row.played}
                          </td>
                          <td className="py-2 pr-3 text-center">
                            {row.goalsFor}:{row.goalsAgainst}
                          </td>
                          <td className="py-2 pr-3 text-center">
                            {row.goalDifference > 0 ? "+" : ""}
                            {row.goalDifference}
                          </td>
                          <td className="py-2 text-right font-semibold">
                            {row.points}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
                  {groupMatches.map((match) => (
                    <Link
                      key={match.id}
                      href={`/matches/${match.id}`}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2 text-sm transition hover:bg-slate-100"
                    >
                      <span className="font-medium">
                        {match.homeTeam.name} vs {match.awayTeam.name}
                      </span>
                      <span className="text-slate-500">
                        {match.homeScore ?? "-"}:{match.awayScore ?? "-"} ·{" "}
                        {formatMatchDate(match.startsAt)}
                      </span>
                    </Link>
                  ))}
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
