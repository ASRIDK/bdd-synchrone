"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// The architecture diagram (docs/diagrams/architecture.png) redrawn in SVG and played step by
// step: each step lights up the boxes it involves and sends a dot along the arrows it uses.

type Tone = "neutral" | "teal" | "amber" | "red";
type NodeDef = { id: string; x: number; y: number; w: number; h: number; title: string; sub: string; tone?: Tone };
type EdgeDef = { id: string; d: string; label?: string; lx?: number; ly?: number; dashed?: boolean };

const NODES: NodeDef[] = [
  { id: "rec", x: 104, y: 248, w: 334, h: 104, title: "Meeting recordings", sub: "audio + video" },
  { id: "import", x: 104, y: 373, w: 334, h: 104, title: "Import page", sub: "hash · mission · metadata" },
  { id: "review", x: 104, y: 498, w: 334, h: 104, title: "Transcript review", sub: "human corrections" },
  { id: "glossary", x: 104, y: 623, w: 334, h: 104, title: "Domain glossary", sub: "client terms" },
  { id: "whisper", x: 562, y: 401, w: 323, h: 135, title: "Whisper transcription", sub: "local · timestamped segments" },
  { id: "passage", x: 1015, y: 208, w: 407, h: 115, title: "Passage index", sub: "25-40 s chunks · BM25 + embeddings", tone: "teal" },
  { id: "decision", x: 1015, y: 364, w: 407, h: 115, title: "Decision register", sub: "current · replaced · history", tone: "amber" },
  { id: "access", x: 1015, y: 520, w: 407, h: 115, title: "Access + retrieval", sub: "permissions · hybrid search · evidence gate" },
  { id: "answer", x: 1015, y: 677, w: 407, h: 115, title: "Answer + verification", sub: "quotes or local model · citations", tone: "red" },
  { id: "frontend", x: 1588, y: 401, w: 360, h: 135, title: "Next.js frontend", sub: "assistant · library · timeline" },
  { id: "quality", x: 562, y: 916, w: 355, h: 135, title: "Quality report", sub: "50 questions · WER · latency · leaks" },
  { id: "evalloop", x: 1588, y: 916, w: 360, h: 135, title: "Evaluation loop", sub: "tune thresholds · report results" },
];

const EDGES: EdgeDef[] = [
  { id: "ingest", d: "M469 468 L556 468", label: "ingest", lx: 512, ly: 441 },
  { id: "segments", d: "M885 468 L972 468", label: "segments", lx: 928, ly: 441 },
  { id: "e1", d: "M1218 323 L1218 360" },
  { id: "e2", d: "M1218 479 L1218 516" },
  { id: "e3", d: "M1218 635 L1218 672" },
  { id: "serves", d: "M1458 468 L1582 468", label: "serves answers", lx: 1522, ly: 441 },
  { id: "ask", d: "M1582 500 L1458 500" },
  { id: "measures", d: "M917 984 L1073 984 L1073 872", label: "measures", lx: 1090, ly: 910 },
  { id: "calibrates", d: "M1588 984 L1364 984 L1364 872", label: "calibrates", lx: 1420, ly: 910, dashed: true },
  { id: "results", d: "M739 1051 L739 1083 L1768 1083 L1768 1058", label: "results", lx: 1234, ly: 1083 },
];

export type ArchitectureFacts = {
  recordings: number;
  audioMinutes: number;
  segments: number;
  chunks: number;
  decisions: number;
  superseded: number;
  realtimeFactor: number | null;
  werEnglish: number | null;
  werFrench: number | null;
  modelPassed: number | null;
  total: number | null;
  glossaryTerms: number;
};

type Step = { title: string; nodes: string[]; edges: string[]; what: string; facts: string[]; href: string; cta: string };

function steps(f: ArchitectureFacts): Step[] {
  const pct = (x: number | null) => (x === null ? "n/a" : `${Math.round(x * 100)}%`);
  return [
    {
      title: "Sources come in",
      nodes: ["rec", "import", "review", "glossary"],
      edges: [],
      what: "Meetings, trainings and troubleshooting sessions enter through the Import page. Each file is hashed, so the same audio is never imported twice, and filed under a mission.",
      facts: [`${f.recordings} recordings, ${f.audioMinutes} min of audio`, `${f.glossaryTerms} client terms in the glossary`],
      href: "/import",
      cta: "Open the Import page",
    },
    {
      title: "Whisper transcribes, on this machine",
      nodes: ["import", "whisper"],
      edges: ["ingest"],
      what: "Whisper turns the audio into sentences with a start and end time. Nothing leaves the laptop. The glossary and human corrections fix client terms it mishears.",
      facts: [
        `${f.segments} timestamped sentences`,
        f.realtimeFactor ? `${f.realtimeFactor.toFixed(1)} times faster than real time` : "local transcription",
        `word error rate ${pct(f.werEnglish)} in English, ${pct(f.werFrench)} in French`,
      ],
      href: "/library",
      cta: "Read a transcript",
    },
    {
      title: "Passages are indexed two ways",
      nodes: ["whisper", "passage"],
      edges: ["segments"],
      what: "Sentences are grouped into passages of 25 to 40 seconds. Each passage goes into a keyword index (BM25, exact on tickets and acronyms) and a meaning index (multilingual embeddings, so English finds French).",
      facts: [`${f.chunks} passages`, "keyword + meaning, fused by rank"],
      href: "/library",
      cta: "Browse the library",
    },
    {
      title: "Decisions are tracked over time",
      nodes: ["passage", "decision"],
      edges: ["e1"],
      what: "Sentences that decide something go into the decision register. When a later meeting changes a decision, the new one becomes current and the old one is kept as history.",
      facts: [`${f.decisions} decisions found`, `${f.superseded} replaced by a later meeting`],
      href: "/decisions",
      cta: "Open the decision register",
    },
    {
      title: "A question arrives: access first",
      nodes: ["frontend", "access"],
      edges: ["ask"],
      what: "Before any search, passages from missions the person does not belong to are removed. They are not ranked, not scored, and cannot leak into the answer.",
      facts: ["Thomas Girard: 22 of 104 passages removed", "0 leaks in 50 test questions"],
      href: "/assistant",
      cta: "Ask a question",
    },
    {
      title: "Hybrid search and the evidence gate",
      nodes: ["access", "passage", "decision"],
      edges: ["e2"],
      what: "Keyword and meaning search run together over what is left. The evidence gate then decides: if the best sentence is not close enough, or the question's key words never appear, the answer is \"not found\".",
      facts: ["deployment question: best sentence 0.840, minimum 0.78, passed", "CTO question: \"cto\" never mentioned, refused"],
      href: "/assistant?q=Who%20is%20the%20CTO%20of%20TransRail%3F",
      cta: "Try the trap question",
    },
    {
      title: "The answer is written and checked",
      nodes: ["decision", "answer"],
      edges: ["e3"],
      what: "The answer is made of exact quotes, or written by the local Qwen model from the evidence only. Every sentence must match its source or it is dropped. Replaced decisions are shown as history.",
      facts: ["Tuesday current, Thursday history", "1 of 1 sentence kept, match 0.85"],
      href: "/assistant?q=On%20which%20day%20do%20TransRail%20production%20deployments%20go%20out%3F",
      cta: "See this answer",
    },
    {
      title: "The frontend serves it, with the minute",
      nodes: ["answer", "frontend"],
      edges: ["serves"],
      what: "The answer arrives with the meeting, the timecode and the waveform. One click plays the recording from the cited second.",
      facts: ["sources shown first, answer streamed after", "about 9 s with the local model"],
      href: "/assistant",
      cta: "Open the Assistant",
    },
    {
      title: "Quality is measured",
      nodes: ["quality", "passage", "decision", "access", "answer"],
      edges: ["measures"],
      what: "Fifty questions written before tuning, including traps and access tests, are run against the whole engine. Transcription errors, speed and leaks are measured too.",
      facts: [f.modelPassed !== null ? `${f.modelPassed} of ${f.total} passed with the local model` : "50 questions", "every failure listed with its reason"],
      href: "/evaluation",
      cta: "Open the Quality report",
    },
    {
      title: "Thresholds are calibrated, honestly",
      nodes: ["quality", "evalloop"],
      edges: ["results", "calibrates"],
      what: "Results feed the evaluation loop, which tunes the evidence gate on half of the questions only. The other half is never used for tuning, so the report shows how the system does on questions it never saw.",
      facts: ["tuned on 24 questions, reported on 26", "gate minimum 0.78, strong match 0.86"],
      href: "/evaluation",
      cta: "See the results",
    },
  ];
}

const TONE: Record<Tone, { stroke: string; fill: string }> = {
  neutral: { stroke: "#4b5059", fill: "#1b1d22" },
  teal: { stroke: "#0f766e", fill: "#10302d" },
  amber: { stroke: "#b45309", fill: "#33240f" },
  red: { stroke: "#e2352b", fill: "#3a1614" },
};

const STEP_MS = 2500;

export function ArchitecturePlayer({ facts }: { facts: ArchitectureFacts }) {
  const all = steps(facts);
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(false);
  // True once autoplay has shown the last step: the diagram then stays still.
  const [ended, setEnded] = useState(false);
  const [tick, setTick] = useState(0);
  const step = all[at];

  const count = all.length;
  const go = (i: number) => {
    setAt(((i % count) + count) % count);
    setEnded(false);
    setTick((t) => t + 1);
  };

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      if (at === count - 1) {
        setPlaying(false);
        setEnded(true);
      } else {
        setAt(at + 1);
        setTick((n) => n + 1);
      }
    }, STEP_MS);
    return () => clearTimeout(t);
  }, [playing, at, tick, count]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      const move = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (move) {
        setAt((((at + move) % count) + count) % count);
        setEnded(false);
        setTick((n) => n + 1);
      } else if (e.key === " ") {
        e.preventDefault();
        if (!playing && at === count - 1) {
          setAt(0);
          setTick((n) => n + 1);
        }
        setEnded(false);
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [at, count, playing]);

  const lit = new Set(step.nodes);
  const flowing = new Set(step.edges);

  return (
    <div>
      <div className="grid gap-4 xl:grid-cols-[1fr_21rem]">
      <div className="overflow-hidden rounded-hero bg-night p-3 sm:p-4">
        <svg viewBox="40 110 1940 1000" className="block w-full" role="img" aria-label={`Architecture, step ${at + 1}: ${step.title}`}>
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" fill="#80858f" />
            </marker>
            <marker id="arrow-on" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" fill="#e2352b" />
            </marker>
          </defs>

          <rect x="73" y="177" width="396" height="583" rx="18" fill="#101114" stroke="#26282d" strokeWidth="2" />
          <text x="104" y="224" fill="#80858f" fontSize="20" fontWeight="600" letterSpacing="5">SOURCES</text>
          <rect x="979" y="135" width="479" height="729" rx="18" fill="#101114" stroke="#26282d" strokeWidth="2" />
          <text x="1013" y="184" fill="#80858f" fontSize="20" fontWeight="600" letterSpacing="5">KNOWLEDGE ENGINE</text>

          {EDGES.map((e) => {
            const on = flowing.has(e.id);
            const moving = on && !ended;
            return (
              <g key={e.id}>
                <path
                  d={e.d}
                  fill="none"
                  stroke={on ? "#e2352b" : e.id === "ask" ? "transparent" : "#4b5059"}
                  strokeWidth={on ? 4 : 2.5}
                  strokeDasharray={e.dashed || moving ? "10 8" : undefined}
                  markerEnd={e.id === "ask" && !on ? undefined : `url(#${on ? "arrow-on" : "arrow"})`}
                  className={moving ? "kw-flow" : undefined}
                />
                {moving && (
                  <circle key={`${e.id}-${tick}`} r="9" fill="#e2352b">
                    <animateMotion dur="0.8s" repeatCount="indefinite" path={e.d} />
                  </circle>
                )}
                {e.label && (
                  <g>
                    <rect x={(e.lx ?? 0) - e.label.length * 6.2 - 12} y={(e.ly ?? 0) - 17} width={e.label.length * 12.4 + 24} height="32" rx="16" fill={on ? "#e2352b" : "#16181d"} stroke={on ? "#e2352b" : "#26282d"} />
                    <text x={e.lx} y={(e.ly ?? 0) + 6} textAnchor="middle" fill="#fff" fontSize="18">{e.label}</text>
                  </g>
                )}
              </g>
            );
          })}

          {NODES.map((n) => {
            const on = lit.has(n.id);
            const t = TONE[n.tone ?? "neutral"];
            return (
              <g key={n.id} style={{ opacity: on ? 1 : 0.38, transition: "opacity .5s" }}>
                <rect x={n.x} y={n.y} width={n.w} height={n.h} rx="14" fill={t.fill} stroke={on ? (n.tone ? t.stroke : "#f5f5f5") : t.stroke} strokeWidth={on ? 4 : 2} style={{ transition: "stroke .5s" }} />
                <text x={n.x + n.w / 2} y={n.y + n.h / 2 - 4} textAnchor="middle" fill="#fff" fontSize="30" fontWeight="700">{n.title}</text>
                <text x={n.x + n.w / 2} y={n.y + n.h / 2 + 30} textAnchor="middle" fill="#a3a8b1" fontSize="19">{n.sub}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex-1 rounded-card bg-surface p-5">
          <p className="font-mono text-[12px] text-ink-faint">
            Step {at + 1} of {all.length}
          </p>
          <h2 className="display mt-2 text-[1.5rem]">{step.title}</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{step.what}</p>
          <Link href={step.href} className="mt-4 inline-block rounded-full bg-ink px-4 py-2 text-[14px] font-semibold text-white">
            {step.cta}
          </Link>
        </div>
        <div className="rounded-card bg-surface p-5">
          <p className="font-mono text-[12px] text-ink-faint">In this archive</p>
          <ul className="mt-2.5 space-y-2">
            {step.facts.map((f) => (
              <li key={f} className="flex gap-2.5 text-[14px]">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
      </div>

      {/* Transport: play, previous, next, and the steps as a strip of tape segments. */}
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-card bg-surface p-3">
        <button
          type="button"
          onClick={() => {
            if (!playing && at === all.length - 1) go(0);
            setEnded(false);
            setPlaying((p) => !p);
          }}
          className="inline-flex items-center gap-2 rounded-full bg-signal px-5 py-2.5 text-[14px] font-semibold text-white"
          aria-label={playing ? "Pause" : "Play"}
        >
          <span aria-hidden="true">{playing ? "❚❚" : "▶"}</span>
          {playing ? "Pause" : ended ? "Play again" : at === 0 ? "Play the walkthrough" : "Play"}
        </button>
        <button type="button" onClick={() => go(at - 1)} className="rounded-full bg-paper px-4 py-2.5 text-[14px] font-semibold" aria-label="Previous step">
          ←
        </button>
        <button type="button" onClick={() => go(at + 1)} className="rounded-full bg-paper px-4 py-2.5 text-[14px] font-semibold" aria-label="Next step">
          →
        </button>
        <ol className="flex min-w-[260px] flex-1 items-center gap-1" aria-label="Steps">
          {all.map((s, i) => (
            <li key={i} className="flex-1">
              <button
                type="button"
                onClick={() => go(i)}
                aria-label={`Step ${i + 1}: ${s.title}`}
                aria-current={i === at ? "step" : undefined}
                className="relative block h-9 w-full overflow-hidden rounded-[6px] bg-paper"
              >
                <span
                  key={i === at ? `run-${tick}-${playing}` : "idle"}
                  className={`absolute inset-y-0 left-0 ${i < at ? "w-full bg-ink" : i === at ? (playing ? "kw-fill bg-signal" : "w-full bg-signal") : "w-0"}`}
                  style={i === at && playing ? { animationDuration: `${STEP_MS}ms` } : undefined}
                />
                <span className={`relative font-mono text-[12px] ${i <= at ? "text-white" : "text-ink-faint"}`}>{String(i + 1).padStart(2, "0")}</span>
              </button>
            </li>
          ))}
        </ol>
        <span className="hidden text-[12px] text-ink-faint 2xl:inline">Space: play or pause · arrows: step</span>
      </div>

    </div>
  );
}
