import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { MeetingLine } from "@/components/MeetingLine";
import { Logo } from "@/components/SiteNav";
import { getCatalog, getIndex, indexExists } from "@/lib/engine/data";
import { formatDuration } from "@/lib/engine/text";
import { sessionUser } from "@/lib/session";

export const metadata = { title: "Sign in | Knowledge Warranty" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await sessionUser()) redirect("/");
  const { next } = await searchParams;
  const catalog = getCatalog();
  const idx = indexExists() ? getIndex() : null;
  const dates = idx ? idx.recordings.map((r) => r.date) : [];
  const accounts = catalog.users.map((u) => ({ email: u.email, name: u.name, role: u.role }));

  return (
    <div className="min-h-screen bg-night text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-6 sm:px-8">
        <Logo light />

        <div className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <h1 className="display text-[2.8rem] sm:text-[4.2rem]">
              Find what Synchrone <span className="text-signal">already knows</span>
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-white/75">
              Every recorded meeting, training and troubleshooting session, searchable in plain words. The answer comes
              with the minute that proves it, and it tells you when a later meeting changed it.
            </p>
            {idx && (
              <div className="mt-10 max-w-xl">
                <MeetingLine dates={dates} />
                <p className="mt-3 text-sm text-white/55 tabular">
                  {idx.stats.recordings} recordings in the archive, {formatDuration(idx.stats.audioSeconds)} of audio,{" "}
                  {idx.stats.decisions} decisions tracked.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-surface p-6 text-ink shadow-[0_20px_60px_rgba(0,0,0,0.4)] sm:p-8">
            <h2 className="text-xl font-bold">Sign in</h2>
            <p className="mt-1 text-ink-soft">Use your Synchrone email address.</p>
            <LoginForm next={next ?? "/"} accounts={accounts} />
          </div>
        </div>

        <p className="text-sm text-white/45">
          Demo platform with fictional clients. In production, sign-in goes through Synchrone&apos;s company account.
        </p>
      </div>
    </div>
  );
}
