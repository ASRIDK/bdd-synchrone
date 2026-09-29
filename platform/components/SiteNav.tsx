"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/login/actions";

const MAIN = [
  { href: "/", label: "Dashboard" },
  { href: "/assistant", label: "Assistant" },
  { href: "/library", label: "Library" },
  { href: "/decisions", label: "Decisions" },
  { href: "/evaluation", label: "Quality report" },
  { href: "/how-it-works", label: "How it works" },
];

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className={`flex items-center gap-2.5 ${light ? "text-white" : "text-ink"}`}>
      <span aria-hidden="true" className={`relative h-[22px] w-[22px] rounded-full border-[5px] ${light ? "border-white" : "border-ink"}`}>
        <span className="absolute inset-[3px] rounded-full bg-signal" />
      </span>
      <span className="text-[16px] font-bold tracking-[-0.02em]">Knowledge Warranty</span>
    </span>
  );
}

export function SiteNav({ name, email }: { name: string; email: string }) {
  const pathname = usePathname();
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="fixed inset-x-0 top-0 z-40 px-5 pt-3 sm:px-8 sm:pt-4 lg:px-12">
      <div className="mx-auto flex max-w-[1440px] items-center gap-3 rounded-card bg-surface py-2 pl-4 pr-2 shadow-[0_1px_0_var(--line),0_8px_24px_rgba(0,0,0,0.06)] sm:pl-5">
        <Link href="/" className="shrink-0">
          <Logo />
        </Link>
        <nav aria-label="Main" className="mx-auto hidden items-center gap-1 lg:flex">
          {MAIN.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active(l.href) ? "page" : undefined}
              className={`whitespace-nowrap rounded-full px-3.5 py-2 text-[14px] ${active(l.href) ? "bg-ink font-medium text-white" : "text-ink-soft hover:bg-paper hover:text-ink"}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <details className="relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full py-1 pl-1 pr-3 hover:bg-paper">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-night text-[12px] font-bold text-white">{initials}</span>
              <span className="hidden whitespace-nowrap text-[14px] font-medium 2xl:block">{name}</span>
            </summary>
            <div className="absolute right-0 mt-2 w-64 rounded-card bg-surface p-3 shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
              <p className="px-2 text-[14px] font-medium">{name}</p>
              <p className="px-2 text-[13px] text-ink-faint">{email}</p>
              <div className="mt-2 border-t border-line pt-2 lg:hidden">
                {[...MAIN, { href: "/import", label: "Import a meeting" }].map((l) => (
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
          <Link href="/import" className="hidden whitespace-nowrap rounded-full bg-signal px-4 py-2.5 text-[14px] font-semibold text-white sm:block">
            ● Import<span className="hidden xl:inline"> a meeting</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
