import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { authOptions } from "@/lib/auth";
import { getRanking } from "@/lib/ranking";
import {
  getRankingMovements,
  type RankingMovement,
} from "@/lib/ranking-snapshots";

function PositionMovement({ movement }: { movement: RankingMovement }) {
  const label =
    movement.direction === "up"
      ? `W gore o ${movement.places}`
      : movement.direction === "down"
        ? `W dol o ${movement.places}`
        : "Bez zmian";
  const indicator =
    movement.direction === "up"
      ? "↑"
      : movement.direction === "down"
        ? "↓"
        : "−";
  const className =
    movement.direction === "up"
      ? "bg-emerald-50 text-emerald-700"
      : movement.direction === "down"
        ? "bg-red-50 text-red-700"
        : "bg-slate-100 text-slate-600";

  return (
    <span
      title={label}
      className={`inline-flex min-w-12 items-center justify-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${className}`}
    >
      <span aria-hidden="true">{indicator}</span>
      <span>{movement.places}</span>
    </span>
  );
}

export default async function RankingPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const ranking = await getRanking();
  const movements = await getRankingMovements(ranking);

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
            Strona Główna
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
            <div className="mt-2">
              <PositionMovement
                movement={
                  movements.get(player.id) ?? { direction: "same", places: 0 }
                }
              />
            </div>
            <h2 className="mt-2 text-xl font-semibold">{player.name}</h2>
            <p className="mt-1 text-xs font-medium uppercase text-slate-500">
              {player.playerName}
            </p>
            <p className="mt-4 text-3xl font-semibold">
              {player.totalPoints} pkt
            </p>
          </article>
        ))}
      </section>

      <section className="space-y-3 md:hidden">
        {ranking.map((player) => (
          <article
            key={player.id}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Miejsce #{player.position}
                </p>
                <div className="mt-1">
                  <PositionMovement
                    movement={
                      movements.get(player.id) ?? {
                        direction: "same",
                        places: 0,
                      }
                    }
                  />
                </div>
                <h2 className="mt-1 font-semibold">{player.name}</h2>
                <p className="text-xs text-slate-500">{player.playerName}</p>
              </div>
              <p className="text-xl font-semibold">{player.totalPoints} pkt</p>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-md bg-slate-50 p-2">
                <p className="text-slate-500">Wyniki</p>
                <p className="mt-1 text-base font-semibold">
                  {player.matchScorePoints}
                </p>
              </div>
              <div className="rounded-md bg-slate-50 p-2">
                <p className="text-slate-500">Pytania</p>
                <p className="mt-1 text-base font-semibold">
                  {player.matchQuestionPoints}
                </p>
              </div>
              <div className="rounded-md bg-slate-50 p-2">
                <p className="text-slate-500">Przedturn.</p>
                <p className="mt-1 text-base font-semibold">
                  {player.preTournamentPoints}
                </p>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Zmiana</th>
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
                  <PositionMovement
                    movement={
                      movements.get(player.id) ?? {
                        direction: "same",
                        places: 0,
                      }
                    }
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{player.name}</div>
                  <div className="text-xs text-slate-500">
                    {player.playerName}
                  </div>
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
