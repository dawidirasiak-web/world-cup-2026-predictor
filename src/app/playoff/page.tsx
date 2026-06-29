import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { authOptions } from "@/lib/auth";
import { formatMatchDate, phaseLabel } from "@/lib/format";
import { getPlayoffSlotLabel } from "@/lib/playoff-bracket";
import { prisma } from "@/lib/prisma";

const bracketRounds = [
  {
    title: "1/16 finału",
    shortTitle: "1/16",
    matchNumbers: [74, 77, 73, 75, 83, 84, 81, 82, 76, 78, 79, 80, 86, 88, 85, 87],
    rows: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31],
  },
  {
    title: "1/8 finału",
    shortTitle: "1/8",
    matchNumbers: [89, 90, 93, 94, 91, 92, 95, 96],
    rows: [2, 6, 10, 14, 18, 22, 26, 30],
  },
  {
    title: "Ćwierćfinały",
    shortTitle: "1/4",
    matchNumbers: [97, 98, 99, 100],
    rows: [4, 12, 20, 28],
  },
  {
    title: "Półfinały",
    shortTitle: "1/2",
    matchNumbers: [101, 102],
    rows: [8, 24],
  },
  {
    title: "Finał",
    shortTitle: "Finał",
    matchNumbers: [104],
    rows: [16],
  },
];

type PlayoffMatch = Awaited<ReturnType<typeof getPlayoffMatches>>[number];

async function getPlayoffMatches() {
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
    },
  });
}

function isPlaceholderTeam(name: string) {
  return name.startsWith("Zwycięzca") || name.startsWith("Przegrany");
}

function TeamSlot({
  name,
  flagUrl,
}: {
  name: string;
  flagUrl?: string | null;
}) {
  const muted = isPlaceholderTeam(name);

  return (
    <span
      className={`flex min-w-0 flex-1 items-center gap-2 ${
        muted ? "text-slate-500" : "text-slate-800"
      }`}
    >
      {flagUrl && !muted ? (
        <Image
          src={flagUrl}
          alt=""
          width={28}
          height={20}
          className="h-5 w-7 shrink-0 rounded-sm border border-slate-200 object-cover"
        />
      ) : (
        <span
          className={`h-5 w-7 shrink-0 rounded-sm border ${
            muted
              ? "border-dashed border-slate-300 bg-slate-50"
              : "border-slate-200 bg-slate-100"
          }`}
        />
      )}
      <span className="min-w-0 flex-1 whitespace-normal break-words leading-tight">
        {name}
      </span>
    </span>
  );
}

function ScoreCell({
  score,
  winner,
}: {
  score: number | null;
  winner: boolean;
}) {
  return (
    <span
      className={`grid h-6 w-7 place-items-center rounded text-xs font-bold ${
        winner ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-500"
      }`}
    >
      {score ?? "-"}
    </span>
  );
}

function BracketMatch({
  matchNumber,
  match,
  isLastRound,
}: {
  matchNumber: number;
  match?: PlayoffMatch;
  isLastRound: boolean;
}) {
  const fallbackHome = getPlayoffSlotLabel(matchNumber, "home");
  const fallbackAway = getPlayoffSlotLabel(matchNumber, "away");
  const homeScore = match?.homeScore ?? null;
  const awayScore = match?.awayScore ?? null;
  const winnerTeamId = match?.winnerTeamId ?? null;
  const isFinished = homeScore !== null && awayScore !== null;
  const homeWon =
    isFinished &&
    (homeScore > awayScore ||
      (homeScore === awayScore && winnerTeamId === match?.homeTeamId));
  const awayWon =
    isFinished &&
    (awayScore > homeScore ||
      (homeScore === awayScore && winnerTeamId === match?.awayTeamId));

  return (
    <div className="relative">
      {!isLastRound ? (
        <span className="absolute left-full top-1/2 h-px w-7 bg-blue-300" />
      ) : null}
      <article className="relative z-10 w-[252px] overflow-hidden rounded-md border border-slate-200 bg-white text-[12px] shadow-sm">
        <div className="flex min-h-7 items-center justify-between bg-slate-200 px-2 py-1 font-semibold text-slate-700">
          <span className="truncate">{formatMatchDate(match?.startsAt ?? new Date())}</span>
          <span className="ml-2 shrink-0">#{matchNumber}</span>
        </div>
        <div className="space-y-1 p-2">
          <div
            className={`flex min-h-10 items-center justify-between gap-2 rounded px-2 py-1.5 ${
              homeWon ? "bg-emerald-50" : "bg-slate-50"
            }`}
          >
            <TeamSlot
              name={match?.homeTeam.name ?? fallbackHome}
              flagUrl={match?.homeTeam.flagUrl}
            />
            <ScoreCell score={homeScore} winner={homeWon} />
          </div>
          <div
            className={`flex min-h-10 items-center justify-between gap-2 rounded px-2 py-1.5 ${
              awayWon ? "bg-emerald-50" : "bg-slate-50"
            }`}
          >
            <TeamSlot
              name={match?.awayTeam.name ?? fallbackAway}
              flagUrl={match?.awayTeam.flagUrl}
            />
            <ScoreCell score={awayScore} winner={awayWon} />
          </div>
        </div>
        <div className="border-t border-slate-100 px-2 py-1.5 text-[10px] font-medium text-slate-500">
          {match ? phaseLabel(match.phase) : "Play-off"}
        </div>
      </article>
    </div>
  );
}

export default async function PlayoffPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const matches = await getPlayoffMatches();
  const matchesByNumber = new Map(
    matches.map((match) => [match.displayOrder, match]),
  );
  const completedMatches = matches.filter(
    (match) => match.homeScore !== null && match.awayScore !== null,
  ).length;
  const thirdPlaceMatch = matchesByNumber.get(103);

  return (
    <main className="mx-auto min-h-screen max-w-[1500px] px-6 py-8">
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
          Wyniki i awanse od 1/16 finału do meczu finałowego.
        </h2>
        <div className="mt-6 inline-flex rounded-md bg-white/10 px-4 py-3 text-sm font-semibold ring-1 ring-white/15">
          Uzupełnione wyniki: {completedMatches}/{matches.length}
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

        <div className="overflow-x-auto rounded-md border border-slate-200 bg-[#eaf4fb] p-4 shadow-sm">
          <div className="grid min-w-[1580px] grid-cols-[270px_270px_270px_270px_270px] gap-x-12">
            {bracketRounds.map((round, roundIndex) => (
              <section key={round.title}>
                <div className="mb-3 rounded-md bg-slate-200 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {round.shortTitle}
                  </p>
                  <h3 className="text-sm font-bold text-slate-800">{round.title}</h3>
                </div>
                <div className="grid grid-rows-[repeat(32,68px)]">
                  {round.matchNumbers.map((matchNumber, index) => (
                    <div
                      key={matchNumber}
                      className="flex items-center"
                      style={{ gridRow: `${round.rows[index]} / span 2` }}
                    >
                      <BracketMatch
                        matchNumber={matchNumber}
                        match={matchesByNumber.get(matchNumber)}
                        isLastRound={roundIndex === bracketRounds.length - 1}
                      />
                    </div>
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
          <div className="w-fit rounded-md border border-slate-200 bg-[#eaf4fb] p-4 shadow-sm">
            <BracketMatch
              matchNumber={103}
              match={thirdPlaceMatch}
              isLastRound
            />
          </div>
        </section>
      ) : null}
    </main>
  );
}
