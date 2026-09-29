import type { ReactNode } from "react";

// Every signed-in page: a black rounded hero card under the navigation, and the content below
// on the paper floor.
export function Page({
  title,
  accent,
  intro,
  aside,
  overlap,
  children,
  width = "max-w-[1440px]",
  compact = false,
}: {
  title: string;
  accent?: string;
  intro?: ReactNode;
  aside?: ReactNode;
  overlap?: ReactNode;
  children: ReactNode;
  width?: string;
  compact?: boolean;
}) {
  return (
    <>
      <section className="pt-24 sm:pt-28">
        <div className={`mx-auto ${width} px-5 sm:px-8 lg:px-12`}>
          <div className={`flex flex-col gap-8 rounded-hero bg-night px-6 text-white sm:px-10 lg:flex-row lg:items-end lg:justify-between lg:px-12 ${compact ? "py-6 sm:py-7" : "pb-12 pt-10 sm:pt-12"}`}>
            <div className="max-w-4xl">
              <h1 className={`display ${compact ? "text-[2rem] sm:text-[2.6rem]" : "text-[2.5rem] sm:text-[3.6rem]"}`}>
                {title}
                {accent && (
                  <>
                    {" "}
                    <span className="text-signal">{accent}</span>
                  </>
                )}
              </h1>
              {intro && <div className={`max-w-3xl text-white/75 ${compact ? "mt-2 text-[15px]" : "mt-4 text-[16px]"}`}>{intro}</div>}
            </div>
            {aside && <div className="shrink-0">{aside}</div>}
          </div>
        </div>
      </section>
      {overlap && (
        <div className={`relative z-10 mx-auto -mt-7 ${width} px-5 sm:px-8 lg:px-12`}>
          {overlap}
        </div>
      )}
      <div className={`mx-auto ${width} px-5 pb-24 sm:px-8 lg:px-12 ${compact ? "pt-5" : "pt-12"}`}>{children}</div>
    </>
  );
}

// The white pill of links overlapping the bottom of the hero card.
export function PillLinks({ items }: { items: Array<{ href: string; label: string }> }) {
  return (
    <nav aria-label="On this page" className="mx-auto flex w-fit max-w-full gap-1 overflow-x-auto rounded-full bg-surface p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
      {items.map((i) => (
        <a key={i.href} href={i.href} className="whitespace-nowrap rounded-full px-4 py-2 text-[14px] text-ink hover:bg-paper">
          {i.label}
        </a>
      ))}
    </nav>
  );
}
