"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/login/actions";

const MAIN = [
  { href: "/", label: "Dashboard" },
  { href: "/assistant", label: "Assistant" },
  { href: "/library", label: "Library" },
  { href: "/decisions", label: "Decisions" },
];
const BETA: Record<string, { href: string; label: string }> = {
  experts: { href: "/experts", label: "Who knows what" },
  review: { href: "/review", label: "Transcript review" },
  digest: { href: "/digest", label: "Decision digest" },
};
const MORE = [
  { href: "/evaluation", label: "Quality report" },
  { href: "/value", label: "Value and cost" },
  { href: "/add-ons", label: "Add-ons" },
  { href: "/settings", label: "Settings" },
];

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className={`flex items-center gap-2.5 ${light ? "text-white" : "text-ink"}`}>
      <span aria-hidden="true" className="flex h-5 items-end gap-[3px]">
        {[9, 18, 12, 20, 7].map((h, i) => (
          <span key={i} className="w-[3px] rounded-full bg-signal" style={{ height: h }} />
        ))}
      </span>
      <span className="text-[15px] font-extrabold uppercase tracking-[0.18em]">Knowledge Warranty</span>
    </span>
  );
}

export function SiteNav({ name, email, beta }: { name: string; email: string; beta: string[] }) {
  const pathname = usePathname();
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const more = [...beta.map((b) => BETA[b]), ...MORE];

  return (
    <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-5 sm:pt-4">
      <div className="mx-auto flex max-w-6xl items-center gap-3 rounded-2xl bg-surface px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.12)] sm:px-5">
        <Link href="/" className="shrink-0">
          <Logo />
        </Link>
        <nav aria-label="Main" className="mx-auto hidden items-center gap-1 lg:flex">
          {MAIN.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active(l.href) ? "page" : undefined}
              className={`rounded-xl px-3 py-2 text-[15px] ${active(l.href) ? "bg-paper font-semibold text-ink" : "text-ink-soft hover:text-ink"}`}
            >
              {l.label}
            </Link>
          ))}
          <details className="group relative">
            <summary className="cursor-pointer list-none rounded-xl px-3 py-2 text-[15px] text-ink-soft hover:text-ink">More</summary>
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-surface p-2 shadow-[0_12px_40px_rgba(0,0,0,0.15)]">
              {more.map((l) => (
                <Link key={l.href} href={l.href} className="block rounded-xl px-3 py-2 text-[15px] text-ink-soft hover:bg-paper hover:text-ink">
                  {l.label}
                </Link>
              ))}
            </div>
          </details>
        </nav>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <details className="relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl py-1 pl-1 pr-2 hover:bg-paper">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-night text-[12px] font-bold text-white">{initials}</span>
              <span className="hidden whitespace-nowrap text-[14px] font-medium xl:block">{name}</span>
            </summary>
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-surface p-3 shadow-[0_12px_40px_rgba(0,0,0,0.15)]">
              <p className="px-2 text-[14px] font-medium">{name}</p>
              <p className="px-2 text-[13px] text-ink-faint">{email}</p>
              <div className="mt-2 border-t border-line pt-2 lg:hidden">
                {[...MAIN, { href: "/import", label: "Import a meeting" }, ...more].map((l) => (
                  <Link key={l.href} href={l.href} className="block rounded-xl px-2 py-1.5 text-[15px] text-ink-soft hover:bg-paper">
                    {l.label}
                  </Link>
                ))}
              </div>
              <form action={signOut} className="mt-2 border-t border-line pt-2">
                <button type="submit" className="w-full rounded-xl px-2 py-1.5 text-left text-[15px] text-ink-soft hover:bg-paper hover:text-ink">
                  Sign out
                </button>
              </form>
            </div>
          </details>
          <Link href="/import" className="hidden whitespace-nowrap rounded-xl bg-night px-4 py-2.5 text-[13px] font-bold uppercase tracking-wide text-white sm:block">
            Import a meeting
          </Link>
        </div>
      </div>
    </header>
  );
}
