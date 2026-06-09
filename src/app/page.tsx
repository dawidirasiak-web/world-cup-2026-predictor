import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const matchScoringRules = [
  ["Dokładny wynik", "5 pkt"],
  ["Zwycięzca + dokładna różnica bramek", "3 pkt"],
  ["Wytypowanie zwycięzcy", "2 pkt"],
  ["Remis bez dokładnego wyniku", "3 pkt"],
  ["Dokładny remis", "5 pkt"],
  ["Pytanie meczowe Tak/Nie", "1 pkt"],
];

const preTournamentRules = [
  ["Każdy poprawny finalista", "15 pkt"],
  ["Król strzelców", "20 pkt"],
  ["Dokładna liczba bramek króla strzelców", "10 pkt"],
  ["Każde pytanie przedturniejowe", "5 pkt"],
];

const warmupVideos = [
  {
    title: "Mundialowa piosenka 1",
    src: "https://www.youtube.com/embed/8n5dJwWXrbo?start=53&rel=0",
  },
  {
    title: "Mundialowa piosenka 2",
    src: "https://www.youtube.com/embed/pRpeEdMmmQ0?rel=0",
  },
  {
    title: "Mundialowa piosenka 3",
    src: "https://www.youtube.com/embed/TGtWWb9emYI?rel=0",
  },
  {
    title: "Mundialowa piosenka 4",
    src: "https://www.youtube.com/embed/7-7knsP2n5w?rel=0",
  },
];

export default async function Home() {
  const session = await getServerSession(authOptions);
  const playerName = session?.user?.name ?? "Graczu";

  return (
    <main className="min-h-screen">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Typer Mistrzostwa Świata 2026
          </Link>
          <nav className="flex items-center gap-3 text-sm font-medium">
            {session?.user ? (
              <Link
                href="/dashboard"
                className="rounded-md bg-slate-950 px-4 py-2 text-white transition hover:bg-slate-800"
              >
                Panel gracza
              </Link>
            ) : (
              <>
                <Link href="/auth/signin" className="px-3 py-2 text-slate-700">
                  Logowanie
                </Link>
                <Link
                  href="/auth/register"
                  className="rounded-md bg-slate-950 px-4 py-2 text-white transition hover:bg-slate-800"
                >
                  Rejestracja
                </Link>
              </>
            )}
          </nav>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-12 lg:grid-cols-[1fr_390px]">
        <div className="space-y-6">
          <section className="wc-section-hero">
            <p className="wc-kicker">Mundial 2026</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
              Witaj, {playerName}!
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/80">
              Dzięki za udział w naszej zabawie typowania Mistrzostw Świata
              2026. Przed Tobą 104 mecze, typy przedturniejowe, pytania i
              ranking, który będzie żył razem z turniejem.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={session?.user ? "/dashboard" : "/auth/signin"}
                className="rounded-md bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {session?.user ? "Przejdź do panelu" : "Zaloguj się"}
              </Link>
              <Link
                href="/ranking"
                className="rounded-md border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Zobacz ranking
              </Link>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="wc-hero-card rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <p className="wc-kicker">Mecze</p>
              <h2 className="mt-3 text-2xl font-semibold">Punktacja meczu</h2>
              <div className="mt-5 space-y-3">
                {matchScoringRules.map(([label, points]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-4 rounded-md bg-slate-50 px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-slate-700">{label}</span>
                    <span className="min-w-[52px] whitespace-nowrap rounded-md bg-slate-950 px-2.5 py-1 text-center text-xs font-semibold text-white">
                      {points}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="wc-hero-card rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <p className="wc-kicker">Przed turniejem</p>
              <h2 className="mt-3 text-2xl font-semibold">
                Dodatkowe typy
              </h2>
              <div className="mt-5 space-y-3">
                {preTournamentRules.map(([label, points]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-4 rounded-md bg-slate-50 px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-slate-700">{label}</span>
                    <span className="min-w-[52px] whitespace-nowrap rounded-md bg-slate-950 px-2.5 py-1 text-center text-xs font-semibold text-white">
                      {points}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <aside className="wc-hero-card rounded-lg border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-8 lg:self-start">
          <p className="wc-kicker">Rozgrzewka</p>
          <h2 className="mt-3 text-2xl font-semibold">Turniejowy klimat</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Odpal muzykę, ustaw typy i zaczynamy mundialową drogę.
          </p>
          <div className="mt-5 space-y-4">
            {warmupVideos.map((video) => (
              <div
                key={video.src}
                className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950"
              >
                <iframe
                  className="aspect-video w-full"
                  src={video.src}
                  title={video.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            Film jest osadzony z YouTube. Jeśli przeglądarka zablokuje
            odtwarzanie w ramce, otwórz go bezpośrednio z poziomu playera.
          </p>
        </aside>
      </section>
    </main>
  );
}
