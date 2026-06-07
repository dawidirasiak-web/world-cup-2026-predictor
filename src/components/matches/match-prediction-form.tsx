"use client";

import { useActionState } from "react";
import {
  saveMatchPrediction,
  type PredictionFormState,
} from "@/app/matches/actions";

const initialState: PredictionFormState = {
  ok: false,
  message: "",
};

export function MatchPredictionForm({
  matchId,
  homeTeamName,
  awayTeamName,
  question,
  defaultHomeScore,
  defaultAwayScore,
  defaultQuestionAnswer,
  disabled,
}: {
  matchId: string;
  homeTeamName: string;
  awayTeamName: string;
  question?: string;
  defaultHomeScore?: number;
  defaultAwayScore?: number;
  defaultQuestionAnswer?: string | null;
  disabled: boolean;
}) {
  const [state, action, isPending] = useActionState(
    saveMatchPrediction,
    initialState,
  );

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="matchId" value={matchId} />
      {state.message ? (
        <p
          className={`rounded-md px-3 py-2 text-sm ${
            state.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </p>
      ) : null}

      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
        <label className="block text-sm font-medium text-slate-700">
          {homeTeamName}
          <input
            name="predictedHomeScore"
            type="number"
            min={0}
            max={30}
            required
            disabled={disabled}
            defaultValue={defaultHomeScore ?? 0}
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-center text-lg font-semibold outline-none focus:border-slate-900 disabled:bg-slate-100"
          />
        </label>
        <span className="pb-2 text-lg font-semibold text-slate-500">:</span>
        <label className="block text-sm font-medium text-slate-700">
          {awayTeamName}
          <input
            name="predictedAwayScore"
            type="number"
            min={0}
            max={30}
            required
            disabled={disabled}
            defaultValue={defaultAwayScore ?? 0}
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-center text-lg font-semibold outline-none focus:border-slate-900 disabled:bg-slate-100"
          />
        </label>
      </div>

      {question ? (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-slate-700">
            {question}
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {["Tak", "Nie"].map((answer) => (
              <label
                key={answer}
                className="flex cursor-pointer items-center gap-3 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 has-[:checked]:border-slate-950 has-[:checked]:bg-slate-50"
              >
                <input
                  name="questionAnswer"
                  type="radio"
                  value={answer}
                  required
                  disabled={disabled}
                  defaultChecked={defaultQuestionAnswer === answer}
                  className="h-4 w-4 accent-slate-950"
                />
                {answer}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <button
        type="submit"
        disabled={disabled || isPending}
        className="w-full rounded-md bg-slate-950 px-4 py-2 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {disabled ? "Typowanie zamknięte" : isPending ? "Zapisywanie..." : "Zapisz typ"}
      </button>
    </form>
  );
}
