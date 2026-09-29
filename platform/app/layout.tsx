import type { Metadata } from "next";
import { DM_Mono, DM_Sans, Source_Serif_4 } from "next/font/google";
import { SiteNav } from "@/components/SiteNav";
import { sessionUser } from "@/lib/session";
import "./globals.css";

const ui = DM_Sans({ variable: "--font-ui", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const code = DM_Mono({ variable: "--font-code", subsets: ["latin"], weight: ["400", "500"] });
const spoken = Source_Serif_4({ variable: "--font-spoken", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Knowledge Warranty",
  description: "Find what Synchrone already knows, in its own recordings, with the minute that proves it.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await sessionUser();

  return (
    <html lang="en" className={`${ui.variable} ${code.variable} ${spoken.variable} antialiased`}>
      <body className="min-h-screen bg-paper">
        {user && <SiteNav name={user.name} email={user.email} />}
        <main>{children}</main>
      </body>
    </html>
  );
}
