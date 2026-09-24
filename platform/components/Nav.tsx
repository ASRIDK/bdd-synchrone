"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MAIN = [
  { href: "/", label: "Ask" },
  { href: "/library", label: "Library" },
  { href: "/decisions", label: "Decisions" },
];
const BETA: Record<string, { href: string; label: string }> = {
  experts: { href: "/experts", label: "Who knows what" },
  review: { href: "/review", label: "Transcript review" },
  digest: { href: "/digest", label: "Decision digest" },
};
const ABOUT = [
  { href: "/evaluation", label: "Quality report" },
  { href: "/value", label: "Value and cost" },
  { href: "/add-ons", label: "Add-ons" },
  { href: "/settings", label: "Settings" },
];

export function Nav({ beta, compact = false }: { beta: string[]; compact?: boolean }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const link = (item: { href: string; label: string }) => (
    <Link
      key={item.href}
      href={item.href}
      aria-current={isActive(item.href) ? "page" : undefined}
      className={`block whitespace-nowrap rounded-md px-2.5 py-1.5 text-[15px] ${
        isActive(item.href) ? "bg-surface font-medium text-ink shadow-[inset_0_0_0_1px_var(--line)]" : "text-ink-soft hover:text-ink"
      }`}
    >
      {item.label}
    </Link>
  );

  if (compact) {
    return <div className="flex gap-1 overflow-x-auto">{[...MAIN, ...beta.map((b) => BETA[b]), ...ABOUT].map(link)}</div>;
  }
  return (
    <div className="mt-8 space-y-6">
      <div className="space-y-0.5">{MAIN.map(link)}</div>
      {beta.length > 0 && (
        <div>
          <p className="px-2.5 pb-1 text-sm text-ink-faint">Beta</p>
          <div className="space-y-0.5">{beta.map((b) => link(BETA[b]))}</div>
        </div>
      )}
      <div>
        <p className="px-2.5 pb-1 text-sm text-ink-faint">About this platform</p>
        <div className="space-y-0.5">{ABOUT.map(link)}</div>
      </div>
    </div>
  );
}
