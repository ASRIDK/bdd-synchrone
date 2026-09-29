import type { Metadata } from "next";
import { Montserrat, Source_Serif_4 } from "next/font/google";
import { SiteNav } from "@/components/SiteNav";
import { sessionUser } from "@/lib/session";
import "./globals.css";

const ui = Montserrat({ variable: "--font-ui", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
const spoken = Source_Serif_4({ variable: "--font-spoken", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Knowledge Warranty",
  description: "Find what Synchrone already knows, in its own recordings, with the minute that proves it.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await sessionUser();

  return (
    <html lang="en" className={`${ui.variable} ${spoken.variable} antialiased`}>
      <body className="min-h-screen bg-paper">
        {user && <SiteNav name={user.name} email={user.email} />}
        <main>{children}</main>
      </body>
    </html>
  );
}
