import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { MatchCard } from "@/components/matches/match-card";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function MatchesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const matches = await prisma.match.findMany({
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
  });

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <p className="wc-kicker">Terminarz</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Wszystkie mecze
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

      <section className="wc-section-hero">
        <p className="wc-kicker">104 mecze</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">
          Droga do finału
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
          Obstaw wyniki, pilnuj terminów i śledź fazę grupową od pierwszego
          gwizdka aż do meczu finałowego.
        </p>
      </section>

      <section className="space-y-4 pb-8">
        {matches.map((match) => (
          <MatchCard key={match.id} match={match} />
        ))}
      </section>
    </main>
  );
}
