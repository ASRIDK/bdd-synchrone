"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUser, isAllowedEmail } from "@/lib/engine/data";
import { createSessionValue, SESSION_COOKIE } from "@/lib/session";

export type SignInState = { error?: string; email?: string };

export async function signIn(_prev: SignInState, form: FormData): Promise<SignInState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Enter your Synchrone email address.", email };
  if (!isAllowedEmail(email)) return { error: "Use your Synchrone address, ending in @synchrone.fr.", email };
  const user = getUser(email);
  if (!user) return { error: "This address cannot sign in.", email };

  (await cookies()).set(SESSION_COOKIE, createSessionValue(user.email), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.KW_INSECURE_COOKIE !== "1",
    path: "/",
    maxAge: 12 * 3600,
  });
  const next = String(form.get("next") ?? "/");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function signOut() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
