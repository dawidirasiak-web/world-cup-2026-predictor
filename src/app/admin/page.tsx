import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { TeamLine } from "@/components/matches/team-line";
import {
  saveMatchQuestionAnswer,
  saveMatchResult,
  savePreTournamentQuestionAnswer,
  saveTournamentResult,
} from "@/app/admin/actions";
import { authOptions } from "@/lib/auth";
import { formatMatchDate, phaseLabel } from "@/lib/format";
import { prisma } from "@/lib/prisma";

function AnswerSelect({ defaultValue }: { defaultValue?: string | null }) {
  return (
    <select
      name="correctAnswer"
      defaultValue={defaultValue ?? ""}
      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 sm:w-32"
    >
      <option value="">Brak</option>
      <option value="Tak">Tak</option>
      <option value="Nie">Nie</option>
    </select>
  );
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const [matches, preTournamentQuestions, teams, tournamentResult] =
    await Promise.all([
    prisma.match.findMany({
      orderBy: [{ displayOrder: "asc" }],
      include: {
        homeTeam: true,
        awayTeam: true,
        question: true,
        _count: {
          select: { predictions: true },
        },
      },
    }),
      prisma.preTournamentQuestion.findMany({
        orderBy: { displayOrder: "asc" },
        include: {
          _count: {
            select: { answers: true },
          },
        },
      }),
      prisma.team.findMany({
        where: { group: { not: null } },
        orderBy: [{ group: "asc" }, { displayOrder: "asc" }, { name: "asc" }],
      }),
      prisma.tournamentResult.findUnique({
        where: { id: "world-cup-2026" },
      }),
    ]);

  const answeredMatchQuestions = matches.filter(
    (match) => match.question?.correctAnswer,
  ).length;
  const answeredPreQuestions = preTournamentQuestions.filter(
    (question) => question.correctAnswer,
  ).length;

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="wc-kicker">Panel admina</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Odpowiedzi i punktacja
          </h1>
        </div>
        <nav className="flex gap-3">
          <Link
            href="/dashboard"
            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium"
          >
            Strona Główna
          </Link>
          <SignOutButton />
        </nav>
      </header>

      <section className="grid gap-4 py-8 md:grid-cols-3">
        <div className="wc-hero-card rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Mecze</p>
          <p className="mt-2 text-3xl font-semibold">{matches.length}</p>
          <p className="mt-2 text-sm text-slate-600">
            Pytania meczowe po 1 pkt.
          </p>
        </div>
        <div className="wc-hero-card rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Uzupełnione meczowe
          </p>
          <p className="mt-2 text-3xl font-semibold">
            {answeredMatchQuestions}/{matches.length}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Po zapisie punkty są przeliczane.
          </p>
        </div>
        <div className="wc-hero-card rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Przedturniejowe
          </p>
          <p className="mt-2 text-3xl font-semibold">
            {answeredPreQuestions}/{preTournamentQuestions.length}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Pytania ogólne po 5 pkt.
          </p>
        </div>
      </section>

      <section className="wc-section-hero">
        <p className="wc-kicker">Admin</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">
          Zaznacz poprawne odpowiedzi
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/75">
          Wyniki meczów mogą przyjść z SofaScore, ale pytania specjalne
          wymagają decyzji admina. Wybierz poprawną odpowiedź i zapisz, a system
          przeliczy punkty graczy.
        </p>
      </section>

      <section className="pb-10">
        <div className="mb-4">
          <p className="wc-kicker">Wyniki turnieju</p>
          <h2 className="mt-2 text-2xl font-semibold">
            Finaliści, król strzelców i liczba bramek
          </h2>
        </div>
        <form
          action={saveTournamentResult}
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Finalista 1
              <select
                name="finalistOneTeamId"
                defaultValue={tournamentResult?.finalistOneTeamId ?? ""}
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
              >
                <option value="">Brak</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                    {team.group ? `, grupa ${team.group}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Finalista 2
              <select
                name="finalistTwoTeamId"
                defaultValue={tournamentResult?.finalistTwoTeamId ?? ""}
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
              >
                <option value="">Brak</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                    {team.group ? `, grupa ${team.group}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Król strzelców
              <input
                name="topScorer"
                defaultValue={tournamentResult?.topScorer ?? ""}
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Liczba bramek króla strzelców
              <input
                name="topScorerGoals"
                type="number"
                min={0}
                max={99}
                defaultValue={tournamentResult?.topScorerGoals ?? ""}
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
              />
            </label>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <p className="text-sm text-slate-600">
              Zapis przelicza punkty za finalistów, króla strzelców i liczbę
              bramek dla wszystkich graczy.
            </p>
            <button
              type="submit"
              className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Zapisz wyniki turnieju
            </button>
          </div>
        </form>
      </section>

      <section className="pb-10">
        <div className="mb-4">
          <p className="wc-kicker">Przedturniejowe</p>
          <h2 className="mt-2 text-2xl font-semibold">
            Pytania ogólne za 5 pkt
          </h2>
        </div>
        <div className="space-y-3">
          {preTournamentQuestions.map((question) => (
            <form
              key={question.id}
              action={savePreTournamentQuestionAnswer}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              <input type="hidden" name="questionId" value={question.id} />
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Pytanie {question.displayOrder} · {question.points} pkt ·
                    odpowiedzi: {question._count.answers}
                  </p>
                  <p className="mt-2 font-semibold">{question.question}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <AnswerSelect defaultValue={question.correctAnswer} />
                  <button
                    type="submit"
                    className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Zapisz
                  </button>
                </div>
              </div>
            </form>
          ))}
        </div>
      </section>

      <section className="pb-10">
        <div className="mb-4">
          <p className="wc-kicker">Meczowe</p>
          <h2 className="mt-2 text-2xl font-semibold">
            Pytania meczowe za 1 pkt
          </h2>
        </div>
        <div className="space-y-3">
          {matches.map((match) => (
            <article
              key={match.id}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {phaseLabel(match.phase)} · {match.group ?? "Mecz"} · mecz{" "}
                    {match.displayOrder} · {formatMatchDate(match.startsAt)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 font-semibold">
                    <TeamLine
                      name={match.homeTeam.name}
                      flagUrl={match.homeTeam.flagUrl}
                    />
                    <span className="text-slate-400">vs</span>
                    <TeamLine
                      name={match.awayTeam.name}
                      flagUrl={match.awayTeam.flagUrl}
                    />
                  </div>
                  <p className="mt-3 text-sm text-slate-700">
                    {match.question?.question ?? "Brak pytania dla meczu."}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Typy graczy: {match._count.predictions}
                  </p>
                </div>
                <form
                  action={saveMatchQuestionAnswer}
                  className="flex flex-wrap items-center gap-2"
                >
                  {match.question ? (
                    <input
                      type="hidden"
                      name="questionId"
                      value={match.question.id}
                    />
                  ) : null}
                  <AnswerSelect defaultValue={match.question?.correctAnswer} />
                  <button
                    type="submit"
                    disabled={!match.question}
                    className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Zapisz odpowiedź
                  </button>
                </form>
              </div>
              <form
                action={saveMatchResult}
                className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-slate-100 pt-4"
              >
                <input type="hidden" name="matchId" value={match.id} />
                <div className="flex flex-wrap items-end gap-3">
                  <label className="block text-sm font-medium text-slate-700">
                    {match.homeTeam.name}
                    <input
                      name="homeScore"
                      type="number"
                      min={0}
                      max={30}
                      defaultValue={match.homeScore ?? ""}
                      className="mt-2 w-24 rounded-md border border-slate-300 px-3 py-2 text-center outline-none focus:border-slate-900"
                    />
                  </label>
                  <span className="pb-2 text-lg font-semibold text-slate-400">
                    :
                  </span>
                  <label className="block text-sm font-medium text-slate-700">
                    {match.awayTeam.name}
                    <input
                      name="awayScore"
                      type="number"
                      min={0}
                      max={30}
                      defaultValue={match.awayScore ?? ""}
                      className="mt-2 w-24 rounded-md border border-slate-300 px-3 py-2 text-center outline-none focus:border-slate-900"
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Zapisz wynik
                </button>
              </form>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
