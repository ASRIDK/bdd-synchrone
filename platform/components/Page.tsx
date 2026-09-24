import type { ReactNode } from "react";

// Every signed-in page: a black hero band (the navigation floats over its top edge) and the
// content below on the light grey page.
export function Page({
  title,
  accent,
  intro,
  aside,
  overlap,
  children,
  width = "max-w-6xl",
}: {
  title: string;
  accent?: string;
  intro?: ReactNode;
  aside?: ReactNode;
  overlap?: ReactNode;
  children: ReactNode;
  width?: string;
}) {
  return (
    <>
      <section className="bg-night pb-14 pt-32 text-white sm:pt-36">
        <div className={`mx-auto ${width} px-5 sm:px-8`}>
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="display text-[2.4rem] sm:text-[3.4rem]">
                {title}
                {accent && (
                  <>
                    {" "}
                    <span className="text-signal">{accent}</span>
                  </>
                )}
              </h1>
              {intro && <div className="mt-4 max-w-2xl text-[16px] text-white/75">{intro}</div>}
            </div>
            {aside && <div className="shrink-0">{aside}</div>}
          </div>
        </div>
      </section>
      {overlap && (
        <div className={`relative z-10 mx-auto -mt-7 ${width} px-5 sm:px-8`}>
          {overlap}
        </div>
      )}
      <div className={`mx-auto ${width} px-5 pb-20 pt-10 sm:px-8`}>{children}</div>
    </>
  );
}

// The white pill of links overlapping the hero, as on AmplifyME's audience tabs.
export function PillLinks({ items }: { items: Array<{ href: string; label: string }> }) {
  return (
    <nav aria-label="On this page" className="mx-auto flex w-fit max-w-full gap-1 overflow-x-auto rounded-2xl bg-surface p-2 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
      {items.map((i) => (
        <a key={i.href} href={i.href} className="whitespace-nowrap rounded-xl px-4 py-2.5 text-[15px] text-ink hover:bg-paper">
          {i.label}
        </a>
      ))}
    </nav>
  );
}
