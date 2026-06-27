import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { TeamLine } from "@/components/matches/team-line";
import { authOptions } from "@/lib/auth";
import { formatMatchDate, phaseLabel } from "@/lib/format";
import { isMatchPredictionOpen } from "@/lib/prediction-lock";
import { prisma } from "@/lib/prisma";

const bracketRounds = [
  {
    title: "1/16 finału",
    shortTitle: "1/16",
    matchNumbers: [73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88],
  },
  {
    title: "1/8 finału",
    shortTitle: "1/8",
    matchNumbers: [89, 90, 91, 92, 93, 94, 95, 96],
  },
  {
    title: "Ćwierćfinały",
    shortTitle: "1/4",
    matchNumbers: [97, 98, 99, 100],
  },
  {
    title: "Półfinały",
    shortTitle: "1/2",
    matchNumbers: [101, 102],
  },
  {
    title: "Finał",
    shortTitle: "Finał",
    matchNumbers: [104],
  },
];

const sourceLabelsByMatchNumber: Record<number, [string, string]> = {
  89: ["Zwycięzca meczu 74", "Zwycięzca meczu 77"],
  90: ["Zwycięzca meczu 73", "Zwycięzca meczu 75"],
  91: ["Zwycięzca meczu 76", "Zwycięzca meczu 78"],
  92: ["Zwycięzca meczu 79", "Zwycięzca meczu 80"],
  93: ["Zwycięzca meczu 83", "Zwycięzca meczu 84"],
  94: ["Zwycięzca meczu 81", "Zwycięzca meczu 82"],
  95: ["Zwycięzca meczu 86", "Zwycięzca meczu 88"],
  96: ["Zwycięzca meczu 85", "Zwycięzca meczu 87"],
  97: ["Zwycięzca meczu 89", "Zwycięzca meczu 90"],
  98: ["Zwycięzca meczu 93", "Zwycięzca meczu 94"],
  99: ["Zwycięzca meczu 91", "Zwycięzca meczu 92"],
  100: ["Zwycięzca meczu 95", "Zwycięzca meczu 96"],
  101: ["Zwycięzca meczu 97", "Zwycięzca meczu 98"],
  102: ["Zwycięzca meczu 99", "Zwycięzca meczu 100"],
  103: ["Przegrany meczu 101", "Przegrany meczu 102"],
  104: ["Zwycięzca meczu 101", "Zwycięzca meczu 102"],
};

type PlayoffMatch = Awaited<ReturnType<typeof getPlayoffMatches>>[number];

async function getPlayoffMatches(userId: string) {
  return prisma.match.findMany({
    where: {
      displayOrder: {
        gte: 73,
        lte: 104,
      },
    },
    orderBy: [{ displayOrder: "asc" }],
    include: {
      homeTeam: true,
      awayTeam: true,
      stadium: true,
      predictions: {
        where: { userId },
        select: {
          predictedHomeScore: true,
          predictedAwayScore: true,
          totalPoints: true,
        },
      },
    },
  });
}

function getFallbackSlot(matchNumber: number) {
  return sourceLabelsByMatchNumber[matchNumber] ?? ["Do ustalenia", "Do ustalenia"];
}

function PredictionBadge({ match }: { match: PlayoffMatch }) {
  const prediction = match.predictions[0];

  if (!prediction) {
    return (
      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
        Brak typu
      </span>
    );
  }

  return (
    <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
      Twój typ {prediction.predictedHomeScore}:{prediction.predictedAwayScore}
    </span>
  );
}

function TeamSlot({
  name,
  flagUrl,
  muted = false,
}: {
  name: string;
  flagUrl?: string | null;
  muted?: boolean;
}) {
  if (flagUrl || !muted) {
    return <TeamLine name={name} flagUrl={flagUrl} />;
  }

  return (
    <span className="inline-flex min-w-0 items-center gap-2 text-slate-500">
      <span className="h-5 w-7 rounded-sm border border-dashed border-slate-300 bg-slate-50" />
      <span className="truncate">{name}</span>
    </span>
  );
}

function BracketMatchCard({
  matchNumber,
  match,
}: {
  matchNumber: number;
  match?: PlayoffMatch;
}) {
  const [fallbackHome, fallbackAway] = getFallbackSlot(matchNumber);
  const isOpen = match ? isMatchPredictionOpen(match.startsAt) : false;
  const isFinished =
    match?.homeScore !== null &&
    match?.homeScore !== undefined &&
    match.awayScore !== null;

  return (
    <article className="relative min-h-[172px] rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Mecz {matchNumber}
          </p>
          <p className="mt-1 text-xs font-medium text-emerald-700">
            {match ? phaseLabel(match.phase) : "Drabinka"}
          </p>
        </div>
        {match ? (
          <span
            className={`rounded-md px-2 py-1 text-xs font-semibold ${
              isOpen
                ? "bg-emerald-50 text-emerald-700"
                : isFinished
                  ? "bg-slate-100 text-slate-700"
                  : "bg-amber-50 text-amber-700"
            }`}
          >
            {isOpen ? "Otwarte" : isFinished ? "Wynik" : "Zamknięte"}
          </span>
        ) : null}
      </div>

      <div className="mt-4 space-y-2 text-sm font-semibold">
        <div className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2">
          <TeamSlot
            name={match?.homeTeam.name ?? fallbackHome}
            flagUrl={match?.homeTeam.flagUrl}
            muted={!match}
          />
          <span className="text-slate-500">{match?.homeScore ?? "-"}</span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2">
          <TeamSlot
            name={match?.awayTeam.name ?? fallbackAway}
            flagUrl={match?.awayTeam.flagUrl}
            muted={!match}
          />
          <span className="text-slate-500">{match?.awayScore ?? "-"}</span>
        </div>
      </div>

      {match ? (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-500">{formatMatchDate(match.startsAt)}</p>
          <p className="mt-1 truncate text-xs text-slate-500">
            {match.stadium
              ? `${match.stadium.name}, ${match.stadium.city}`
              : "Stadion do potwierdzenia"}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <PredictionBadge match={match} />
            <Link
              href={`/matches/${match.id}`}
              className={`rounded-md px-3 py-2 text-xs font-semibold transition ${
                isOpen
                  ? "bg-slate-950 text-white hover:bg-slate-800"
                  : "border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {isOpen ? "Obstaw" : "Podgląd"}
            </Link>
          </div>
        </div>
      ) : (
        <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">
          Mecz pojawi się w typowaniu po zaimportowaniu terminarza.
        </p>
      )}
    </article>
  );
}

export default async function PlayoffPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const matches = await getPlayoffMatches(session.user.id);
  const matchesByNumber = new Map(
    matches.map((match) => [match.displayOrder, match]),
  );
  const roundOf32Matches = bracketRounds[0].matchNumbers
    .map((matchNumber) => matchesByNumber.get(matchNumber))
    .filter((match): match is PlayoffMatch => Boolean(match));
  const openMatches = roundOf32Matches.filter((match) =>
    isMatchPredictionOpen(match.startsAt),
  );
  const predictedMatches = roundOf32Matches.filter(
    (match) => match.predictions.length > 0,
  );
  const thirdPlaceMatch = matchesByNumber.get(103);

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <p className="wc-kicker">Play-off</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Drabinka Mistrzostw Świata 2026
          </h1>
        </div>
        <nav className="flex gap-3">
          <Link
            href="/dashboard"
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Panel
          </Link>
          <Link
            href="/matches"
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Terminarz
          </Link>
          <SignOutButton />
        </nav>
      </header>

      <section className="wc-section-hero">
        <p className="wc-kicker">Faza pucharowa</p>
        <h2 className="mt-2 max-w-4xl text-3xl font-semibold tracking-tight">
          Obstaw aktualne mecze 1/16 finału i śledź drogę aż do finału.
        </h2>
        <div className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-lg bg-white/10 p-4 ring-1 ring-white/15">
            <p className="text-white/70">Mecze 1/16 finału</p>
            <p className="mt-1 text-2xl font-semibold">{roundOf32Matches.length}</p>
          </div>
          <div className="rounded-lg bg-white/10 p-4 ring-1 ring-white/15">
            <p className="text-white/70">Otwarte do typowania</p>
            <p className="mt-1 text-2xl font-semibold">{openMatches.length}</p>
          </div>
          <div className="rounded-lg bg-white/10 p-4 ring-1 ring-white/15">
            <p className="text-white/70">Twoje typy w 1/16</p>
            <p className="mt-1 text-2xl font-semibold">
              {predictedMatches.length}/{roundOf32Matches.length}
            </p>
          </div>
        </div>
      </section>

      <section className="pb-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-emerald-700">Drabinka</p>
            <h2 className="text-2xl font-semibold tracking-tight">
              Droga do finału
            </h2>
          </div>
          <span className="rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-200">
            Mecze 73-104
          </span>
        </div>

        <div className="overflow-x-auto pb-4">
          <div className="grid min-w-[1180px] grid-cols-[1.45fr_1.2fr_1fr_0.9fr_0.9fr] gap-4">
            {bracketRounds.map((round) => (
              <section key={round.title} className="space-y-3">
                <div className="sticky top-0 z-10 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {round.shortTitle}
                  </p>
                  <h3 className="text-lg font-semibold">{round.title}</h3>
                </div>
                <div className="space-y-3">
                  {round.matchNumbers.map((matchNumber) => (
                    <BracketMatchCard
                      key={matchNumber}
                      matchNumber={matchNumber}
                      match={matchesByNumber.get(matchNumber)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>

      {thirdPlaceMatch ? (
        <section className="pb-10">
          <div className="mb-4">
            <p className="text-sm font-medium text-emerald-700">Dodatkowo</p>
            <h2 className="text-2xl font-semibold tracking-tight">
              Mecz o 3. miejsce
            </h2>
          </div>
          <div className="max-w-xl">
            <BracketMatchCard matchNumber={103} match={thirdPlaceMatch} />
          </div>
        </section>
      ) : null}

      <section className="space-y-4 pb-10">
        <div>
          <p className="text-sm font-medium text-emerald-700">
            Do obstawienia teraz
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">
            Mecze 1/16 finału
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {roundOf32Matches.map((match) => (
            <BracketMatchCard
              key={match.id}
              matchNumber={match.displayOrder}
              match={match}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
