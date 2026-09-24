"use client";

import { useActionState, useState } from "react";
import { signIn, type SignInState } from "@/app/login/actions";

type Account = { email: string; name: string; role: string };

export function LoginForm({ next, accounts }: { next: string; accounts: Account[] }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, {});
  const [email, setEmail] = useState(state.email ?? "");

  return (
    <>
      <form action={action} className="mt-6 space-y-3">
        <input type="hidden" name="next" value={next} />
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="firstname.lastname@synchrone.fr"
          aria-invalid={Boolean(state.error)}
          aria-describedby={state.error ? "email-error" : undefined}
          className="w-full rounded-xl border border-line bg-paper px-4 py-3 text-[15px] placeholder:text-ink-faint"
        />
        {state.error && (
          <p id="email-error" role="alert" className="text-sm text-signal">
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-night px-5 py-3.5 text-[14px] font-bold uppercase tracking-wide text-white disabled:opacity-50"
        >
          {pending ? "Signing in" : "Continue"}
        </button>
      </form>

      <div className="mt-8 border-t border-line pt-5">
        <p className="text-sm font-medium">Demo accounts</p>
        <p className="text-sm text-ink-faint">Each one sees different missions. Click to fill in the address.</p>
        <ul className="mt-3 grid gap-1.5">
          {accounts.map((a) => (
            <li key={a.email}>
              <button
                type="button"
                onClick={() => setEmail(a.email)}
                className={`w-full rounded-xl px-3 py-2 text-left hover:bg-paper ${email === a.email ? "bg-paper" : ""}`}
              >
                <span className="block text-[14px] font-medium">{a.name}</span>
                <span className="block text-[13px] text-ink-faint">{a.role}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
