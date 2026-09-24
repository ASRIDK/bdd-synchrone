"use client";

import { useTransition } from "react";
import { setUser } from "@/app/actions";

type U = { login: string; name: string; role: string };

export function UserSwitcher({ users, current }: { users: U[]; current: string }) {
  const [pending, start] = useTransition();
  return (
    <label className="flex min-w-0 items-center gap-2 text-sm">
      <span className="hidden text-ink-faint sm:inline">Viewing as</span>
      <select
        aria-label="Viewing as"
        className="min-w-0 max-w-[58vw] rounded-md border border-line bg-surface px-2 py-1.5 text-ink sm:max-w-none"
        value={current}
        disabled={pending}
        onChange={(e) => start(() => setUser(e.target.value))}
      >
        {users.map((u) => (
          <option key={u.login} value={u.login}>
            {u.name}, {u.role}
          </option>
        ))}
      </select>
    </label>
  );
}
