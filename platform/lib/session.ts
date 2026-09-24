// Sign-in with a Synchrone email address.
//
// The session is a cookie holding the email and an expiry time, signed with a secret kept on
// the server (HMAC-SHA256). Changing the email in the cookie breaks the signature, so nobody can
// read another person's missions by editing it.
//
// This is the demo sign-in: it trusts the address typed in. In production the same session is
// created after the company sign-in (Microsoft Entra ID, see the "sso" add-on), and mission
// access comes from directory groups.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { allowedMissions, getUser } from "./engine/data";
import { DATA_DIR } from "./engine/paths";
import type { User } from "./engine/types";

export const SESSION_COOKIE = "kw_session";
const SESSION_HOURS = 12;

function secret(): string {
  if (process.env.KW_SESSION_SECRET) return process.env.KW_SESSION_SECRET;
  const file = path.join(DATA_DIR, ".secrets", "session-key");
  if (!fs.existsSync(file)) {
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    fs.writeFileSync(file, crypto.randomBytes(32).toString("hex"), { mode: 0o600 });
  }
  return fs.readFileSync(file, "utf8").trim();
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionValue(email: string, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ email, exp: now + SESSION_HOURS * 3_600_000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readSessionValue(value: string | undefined, now = Date.now()): string | null {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const { email, exp } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { email: string; exp: number };
    return exp > now ? email : null;
  } catch {
    return null;
  }
}

// The signed-in user with every mission they can see, or null.
export async function sessionUser(): Promise<User | null> {
  const email = readSessionValue((await cookies()).get(SESSION_COOKIE)?.value);
  if (!email) return null;
  const user = getUser(email);
  return user ? { ...user, missions: allowedMissions(user.email) } : null;
}

// For pages: the signed-in user, or a redirect to the sign-in page.
export async function currentUser(): Promise<User> {
  const user = await sessionUser();
  if (!user) redirect("/login");
  return user;
}
