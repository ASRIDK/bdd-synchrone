"use client";

import { useState } from "react";

// Same formula as the reverse brief: users x hours saved per week x 45.9 working weeks x €57.7.
const STAFF = 1500;
const HOUR_VALUE = 57.7;
const WEEKS = 45.9;
const BUILD = 110_000;
const RUN = 40_000;

const SCENARIOS = [
  { name: "Low", share: 10, minutes: 15 },
  { name: "Central", share: 25, minutes: 30 },
  { name: "High", share: 40, minutes: 45 },
];

const eur = (x: number) => `€${Math.round(x).toLocaleString("en-GB")}`;

export function ValueCalculator() {
  const [share, setShare] = useState(25);
  const [minutes, setMinutes] = useState(30);

  const users = Math.round((STAFF * share) / 100);
  const hours = users * (minutes / 60) * WEEKS;
  const value = hours * HOUR_VALUE;
  const firstYear = BUILD + RUN;
  const ratio = value / firstYear;
  const breakEvenUsers = Math.ceil(firstYear / ((minutes / 60) * WEEKS * HOUR_VALUE));

  return (
    <section className="mt-8 rounded-xl border border-line bg-surface p-5 sm:p-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <label className="block">
          <span className="flex justify-between text-sm">
            <span>Share of staff using it</span>
            <span className="tabular font-medium">{share}% ({users} people)</span>
          </span>
          <input type="range" min={2} max={60} value={share} onChange={(e) => setShare(Number(e.target.value))} className="mt-2 w-full accent-[var(--ink)]" />
        </label>
        <label className="block">
          <span className="flex justify-between text-sm">
            <span>Time saved per user per week</span>
            <span className="tabular font-medium">{minutes} min</span>
          </span>
          <input type="range" min={5} max={90} step={5} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="mt-2 w-full accent-[var(--ink)]" />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {SCENARIOS.map((s) => (
          <button
            key={s.name}
            type="button"
            onClick={() => {
              setShare(s.share);
              setMinutes(s.minutes);
            }}
            className={`rounded-md border px-3 py-1.5 text-sm ${share === s.share && minutes === s.minutes ? "border-ink text-ink" : "border-line text-ink-soft hover:text-ink"}`}
          >
            {s.name} scenario
          </button>
        ))}
      </div>

      <dl className="mt-6 grid gap-4 border-t border-line pt-5 tabular sm:grid-cols-4">
        <div>
          <dt className="text-sm text-ink-faint">Hours saved a year</dt>
          <dd className="text-2xl font-semibold">{Math.round(hours).toLocaleString("en-GB")}</dd>
        </div>
        <div>
          <dt className="text-sm text-ink-faint">Value a year</dt>
          <dd className="text-2xl font-semibold">{eur(value)}</dd>
        </div>
        <div>
          <dt className="text-sm text-ink-faint">Return per euro, year one</dt>
          <dd className={`text-2xl font-semibold ${ratio >= 1 ? "text-valid" : "text-history"}`}>{ratio.toFixed(1)}x</dd>
        </div>
        <div>
          <dt className="text-sm text-ink-faint">Break-even at</dt>
          <dd className="text-2xl font-semibold">{breakEvenUsers} users</dd>
        </div>
      </dl>
      <p className="mt-4 text-sm text-ink-faint">
        Year one cost: {eur(BUILD)} to build and {eur(RUN)} to run. Not counted: avoided rework (one three-week redo is about
        105 hours, close to €6k), faster onboarding, and knowledge kept when people leave. The two numbers we do not know yet
        are how many people will use it and how much time it really saves; the usage log (data/logs) is there to measure both.
      </p>
    </section>
  );
}
