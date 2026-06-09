import Link from "next/link";
import { TeamLine } from "@/components/matches/team-line";
import { formatMatchDate, phaseLabel } from "@/lib/format";
import { isMatchPredictionOpen } from "@/lib/prediction-lock";

type MatchCardProps = {
  match: {
    id: string;
    startsAt: Date;
    phase: string;
    group: string | null;
    homeScore: number | null;
    awayScore: number | null;
    homeTeam: {
      name: string;
      flagUrl: string | null;
    };
    awayTeam: {
      name: string;
      flagUrl: string | null;
    };
    stadium: {
      name: string;
      city: string;
    } | null;
    question: {
      question: string;
      correctAnswer: string | null;
    } | null;
    predictions: Array<{
      predictedHomeScore: number;
      predictedAwayScore: number;
      questionAnswer: string | null;
      scorePoints: number;
      questionPoints: number;
      totalPoints: number;
    }>;
  };
};

function formatQuestionAnswer(answer?: string | null) {
  if (!answer) {
    return "brak";
  }

  const normalized = answer.trim().toLowerCase();

  if (normalized === "yes" || normalized === "tak") {
    return "Tak";
  }

  if (normalized === "no" || normalized === "nie") {
    return "Nie";
  }

  return answer;
}

export function MatchCard({ match }: MatchCardProps) {
  const prediction = match.predictions[0];
  const isOpen = isMatchPredictionOpen(match.startsAt);

  return (
    <article
      id={`match-${match.id}`}
      className="relative scroll-mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white p-5 shadow-sm before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:bg-[linear-gradient(180deg,#df0712,#284cff,#7ee000)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase text-slate-500">
            <span>{phaseLabel(match.phase)}</span>
            {match.group ? <span>Grupa {match.group}</span> : null}
            <span>{formatMatchDate(match.startsAt)}</span>
          </div>
          <h3 className="mt-3 flex flex-wrap items-center gap-2 text-xl font-semibold">
            <TeamLine
              name={match.homeTeam.name}
              flagUrl={match.homeTeam.flagUrl}
            />
            <span className="text-slate-400">vs</span>
            <TeamLine
              name={match.awayTeam.name}
              flagUrl={match.awayTeam.flagUrl}
            />
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            {match.stadium
              ? `${match.stadium.name}, ${match.stadium.city}`
              : "Stadion do ustalenia"}
          </p>
        </div>
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

      {match.question ? (
        <div className="mt-4 rounded-md bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase text-slate-500">
            Pytanie meczowe za 1 punkt
          </p>
          <p className="mt-1 text-sm text-slate-800">
            {match.question.question}
          </p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3 border-t border-slate-100 pt-4">
        {prediction ? (
          <div className="flex w-full flex-wrap gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 shadow-sm md:w-auto">
            <div className="rounded bg-white px-3 py-2">
              <p className="text-xs font-semibold uppercase text-emerald-700">
                Twój wynik
              </p>
              <p className="mt-1 font-semibold text-slate-950">
                {prediction.predictedHomeScore}:{prediction.predictedAwayScore}
              </p>
            </div>
            <div className="rounded bg-white px-3 py-2">
              <p className="text-xs font-semibold uppercase text-emerald-700">
                Odpowiedź
              </p>
              <p className="mt-1 font-semibold text-slate-950">
                {formatQuestionAnswer(prediction.questionAnswer)}
              </p>
            </div>
            <div className="rounded bg-white px-3 py-2">
              <p className="text-xs font-semibold uppercase text-emerald-700">
                Razem
              </p>
              <p className="mt-1 font-semibold text-slate-950">
                {prediction.totalPoints} pkt
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-600">
            Nie masz jeszcze typu dla tego meczu.
          </p>
        )}
        {isOpen ? (
          <Link
            href={`/matches/${match.id}`}
            className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            {prediction ? "Edytuj typ" : "Obstaw mecz"}
          </Link>
        ) : (
          <Link
            href={`/matches/${match.id}`}
            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
          >
            Podgląd
          </Link>
        )}
      </div>
    </article>
  );
}
