"use client";

import { useActionState } from "react";
import {
  savePreTournamentPrediction,
  type PreTournamentFormState,
} from "@/app/pre-tournament/actions";

const initialState: PreTournamentFormState = {
  ok: false,
  message: "",
};

type TeamOption = {
  id: string;
  name: string;
  group: string | null;
};

type Question = {
  id: string;
  question: string;
  type: "YES_NO" | "OPEN";
  points: number;
};

type ExistingPrediction = {
  finalistOneTeamId: string;
  finalistTwoTeamId: string;
  topScorer: string;
  topScorerGoals: number;
  answers: Array<{
    questionId: string;
    answer: string;
  }>;
} | null;

export function PreTournamentForm({
  teams,
  questions,
  existingPrediction,
  disabled,
}: {
  teams: TeamOption[];
  questions: Question[];
  existingPrediction: ExistingPrediction;
  disabled: boolean;
}) {
  const [state, action, isPending] = useActionState(
    savePreTournamentPrediction,
    initialState,
  );
  const answerByQuestionId = new Map(
    existingPrediction?.answers.map((answer) => [
      answer.questionId,
      answer.answer,
    ]) ?? [],
  );

  return (
    <form action={action} className="space-y-6">
      {state.message ? (
        <p
          className={`rounded-md px-3 py-2 text-sm ${
            state.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </p>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Finał</h2>
        <p className="mt-2 text-sm text-slate-600">
          Każdy poprawnie wytypowany finalista jest wart 15 punktów. Kolejność
          nie ma znaczenia.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {[
            ["finalistOneTeamId", "Finalista 1", existingPrediction?.finalistOneTeamId],
            ["finalistTwoTeamId", "Finalista 2", existingPrediction?.finalistTwoTeamId],
          ].map(([name, label, defaultValue]) => (
            <label key={name} className="block text-sm font-medium text-slate-700">
              {label}
              <select
                name={name}
                required
                disabled={disabled}
                defaultValue={defaultValue ?? ""}
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-900 disabled:bg-slate-100"
              >
                <option value="">Wybierz drużynę</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                    {team.group ? `, grupa ${team.group}` : ""}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Król strzelców</h2>
        <p className="mt-2 text-sm text-slate-600">
          Trafienie króla strzelców daje 20 punktów, a dokładna liczba jego
          bramek daje dodatkowe 10 punktów.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_180px]">
          <label className="block text-sm font-medium text-slate-700">
            Zawodnik
            <input
              name="topScorer"
              required
              disabled={disabled}
              defaultValue={existingPrediction?.topScorer ?? ""}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-900 disabled:bg-slate-100"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Liczba bramek
            <input
              name="topScorerGoals"
              type="number"
              min={0}
              max={99}
              required
              disabled={disabled}
              defaultValue={existingPrediction?.topScorerGoals ?? 0}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-900 disabled:bg-slate-100"
            />
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Pytania przedturniejowe</h2>
        <p className="mt-2 text-sm text-slate-600">
          Pięć pytań po 5 punktów. Część pytań ma odpowiedź Tak/Nie, część jest
          otwarta.
        </p>
        <div className="mt-5 space-y-5">
          {questions.map((question) => {
            const currentAnswer = answerByQuestionId.get(question.id);

            return (
              <div key={question.id}>
                <p className="text-sm font-medium text-slate-800">
                  {question.question}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {question.points} pkt
                </p>
                {question.type === "YES_NO" ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {["Tak", "Nie"].map((answer) => (
                      <label
                        key={answer}
                        className="flex cursor-pointer items-center gap-3 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 has-[:checked]:border-slate-950 has-[:checked]:bg-slate-50"
                      >
                        <input
                          name={`question-${question.id}`}
                          type="radio"
                          value={answer}
                          required
                          disabled={disabled}
                          defaultChecked={currentAnswer === answer}
                          className="h-4 w-4 accent-slate-950"
                        />
                        {answer}
                      </label>
                    ))}
                  </div>
                ) : (
                  <textarea
                    name={`question-${question.id}`}
                    rows={3}
                    required
                    disabled={disabled}
                    defaultValue={currentAnswer ?? ""}
                    className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-900 disabled:bg-slate-100"
                  />
                )}
              </div>
            );
          })}
        </div>
      </section>

      <button
        type="submit"
        disabled={disabled || isPending}
        className="w-full rounded-md bg-slate-950 px-4 py-3 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {disabled
          ? "Typy przedturniejowe zamknięte"
          : isPending
            ? "Zapisywanie..."
            : "Zapisz typy przedturniejowe"}
      </button>
    </form>
  );
}
