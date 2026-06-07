import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { authOptions } from "@/lib/auth";
import { getRanking } from "@/lib/ranking";

export default async function RankingPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const ranking = await getRanking();

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <p className="wc-kicker">Ranking</p>
          <h1 className="text-3xl font-semibold tracking-tight">Gracze</h1>
        </div>
        <nav className="flex gap-3">
          <Link
            href="/dashboard"
            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium"
          >
            Dashboard
          </Link>
          <SignOutButton />
        </nav>
      </header>

      <section className="grid gap-4 py-8 md:grid-cols-3">
        {ranking.slice(0, 3).map((player) => (
          <article
            key={player.id}
            className="wc-hero-card rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-slate-500">
              Miejsce #{player.position}
            </p>
            <h2 className="mt-2 text-xl font-semibold">{player.name}</h2>
            <p className="mt-1 text-xs font-medium uppercase text-slate-500">
              {player.role}
            </p>
            <p className="mt-4 text-3xl font-semibold">
              {player.totalPoints} pkt
            </p>
          </article>
        ))}
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Gracz</th>
              <th className="px-4 py-3 font-medium">Wyniki</th>
              <th className="px-4 py-3 font-medium">Pytania meczowe</th>
              <th className="px-4 py-3 font-medium">Przedturniejowe</th>
              <th className="px-4 py-3 font-medium">Razem</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((player) => (
              <tr key={player.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-semibold">{player.position}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{player.name}</div>
                  <div className="text-xs text-slate-500">{player.role}</div>
                </td>
                <td className="px-4 py-3">{player.matchScorePoints}</td>
                <td className="px-4 py-3">{player.matchQuestionPoints}</td>
                <td className="px-4 py-3">{player.preTournamentPoints}</td>
                <td className="px-4 py-3 text-lg font-semibold">
                  {player.totalPoints}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
