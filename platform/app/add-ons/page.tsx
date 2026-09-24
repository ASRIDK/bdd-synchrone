import Link from "next/link";
import { FeatureToggle } from "@/components/FeatureToggle";
import { FEATURES, type FeatureStatus } from "@/lib/features";
import { isEnabled } from "@/lib/flags";

const GROUPS: Array<{ status: FeatureStatus; title: string; intro: string }> = [
  { status: "live", title: "Live", intro: "Part of the product today." },
  {
    status: "beta",
    title: "Ready for a soft launch",
    intro: "Built and working. Switch one on for a pilot team, watch the usage log, then open it to everyone.",
  },
  {
    status: "planned",
    title: "Prepared, not built",
    intro: "Designed so they plug in without rework. Each one lists what it needs from Synchrone before it can start.",
  },
];

export default function AddOnsPage() {
  return (
    <div className="max-w-4xl">
      <h1 className="text-[2rem] font-semibold tracking-tight">Add-ons</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">
        What the platform does now, what can be switched on next, and what is prepared for later.
      </p>
      {GROUPS.map((g) => (
        <section key={g.status} className="mt-10">
          <h2 className="text-xl font-semibold">{g.title}</h2>
          <p className="mt-1 text-ink-soft">{g.intro}</p>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {FEATURES.filter((f) => f.status === g.status).map((f) => (
              <li key={f.id} className="flex flex-col rounded-xl border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold">
                    {f.href && (f.status === "live" || isEnabled(f.id)) ? (
                      <Link href={f.href} className="underline decoration-line underline-offset-4 hover:decoration-ink">{f.name}</Link>
                    ) : (
                      f.name
                    )}
                  </h3>
                  {f.status === "beta" && <FeatureToggle id={f.id} on={isEnabled(f.id)} />}
                </div>
                <p className="mt-0.5 text-sm text-ink-faint">For {f.forWho}</p>
                <p className="mt-2 text-[15px] text-ink-soft">{f.summary}</p>
                {f.needs && <p className="mt-2 text-sm text-ink-faint">Needs: {f.needs}</p>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
