import Link from "next/link";
import type { Metadata } from "next";
import { Schibsted_Grotesk, Source_Serif_4 } from "next/font/google";
import { Nav } from "@/components/Nav";
import { UserSwitcher } from "@/components/UserSwitcher";
import { getCatalog } from "@/lib/engine/data";
import { isEnabled } from "@/lib/flags";
import { currentUser } from "@/lib/session";
import "./globals.css";

const ui = Schibsted_Grotesk({ variable: "--font-ui", subsets: ["latin"] });
const spoken = Source_Serif_4({ variable: "--font-spoken", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Knowledge Warranty",
  description: "Find what Synchrone already knows, in its own recordings, with the minute that proves it.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await currentUser();
  const users = getCatalog().users;
  const beta = ["experts", "review", "digest"].filter(isEnabled);

  return (
    <html lang="en" className={`${ui.variable} ${spoken.variable} antialiased`}>
      <body className="min-h-screen">
        <div className="mx-auto flex min-h-screen max-w-[1400px]">
          <aside className="hidden w-60 shrink-0 border-r border-line px-5 py-6 md:block">
            <Link href="/" className="block">
              <span className="text-lg font-semibold tracking-tight">Knowledge Warranty</span>
              <span className="mt-0.5 block text-sm text-ink-faint">Synchrone recordings</span>
            </Link>
            <Nav beta={beta} />
          </aside>
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-3 md:px-8">
              <Link href="/" className="shrink-0 font-semibold md:hidden">Knowledge Warranty</Link>
              <p className="hidden text-sm text-ink-faint md:block">
                Demo data: fictional clients, real audio and real transcription.
              </p>
              <UserSwitcher users={users.map((u) => ({ login: u.login, name: u.name, role: u.role }))} current={user.login} />
            </header>
            <nav className="border-b border-line px-5 py-2 md:hidden">
              <Nav beta={beta} compact />
            </nav>
            <main className="flex-1 px-5 py-8 md:px-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
