"use client";

import { useActionState } from "react";
import { requestPasswordReset, type FormState } from "@/app/auth/actions";

const initialState: FormState = {
  ok: false,
  message: "",
};

export function ForgotPasswordForm() {
  const [state, action, isPending] = useActionState(
    requestPasswordReset,
    initialState,
  );

  return (
    <form action={action} className="mt-6 space-y-4">
      {state.message ? (
        <div
          className={`rounded-md px-3 py-2 text-sm ${
            state.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
          }`}
        >
          <p>{state.message}</p>
          {state.resetUrl ? (
            <a
              href={state.resetUrl}
              className="mt-2 inline-flex font-semibold underline underline-offset-4"
            >
              Otworz link resetu hasla
            </a>
          ) : null}
        </div>
      ) : null}
      <label className="block text-sm font-medium text-slate-700">
        Email
        <input
          name="email"
          type="email"
          required
          className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-900"
        />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-slate-950 px-4 py-2 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isPending ? "Wysylanie..." : "Wyslij link"}
      </button>
    </form>
  );
}
