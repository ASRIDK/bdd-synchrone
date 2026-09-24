// The signed session cookie and the sign-in rules.
import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.KW_SESSION_SECRET = "test-secret-not-used-anywhere-else";
});

describe("session cookie", async () => {
  const { createSessionValue, readSessionValue } = await import("../lib/session");

  it("round-trips a valid session", () => {
    const value = createSessionValue("thomas.girard@synchrone.fr");
    expect(readSessionValue(value)).toBe("thomas.girard@synchrone.fr");
  });

  it("rejects a cookie whose email was edited", () => {
    const [, signature] = createSessionValue("thomas.girard@synchrone.fr").split(".");
    const forged = Buffer.from(JSON.stringify({ email: "marc.delorme@synchrone.fr", exp: Date.now() + 3_600_000 })).toString("base64url");
    expect(readSessionValue(`${forged}.${signature}`)).toBeNull();
  });

  it("rejects an expired session and garbage", () => {
    const old = createSessionValue("thomas.girard@synchrone.fr", Date.now() - 13 * 3_600_000);
    expect(readSessionValue(old)).toBeNull();
    expect(readSessionValue("not-a-session")).toBeNull();
    expect(readSessionValue(undefined)).toBeNull();
  });
});

describe("sign-in rules", async () => {
  const { allowedMissions, getUser, isAllowedEmail } = await import("../lib/engine/data");

  it("accepts Synchrone addresses only", () => {
    expect(isAllowedEmail("camille.moreau@synchrone.fr")).toBe(true);
    expect(isAllowedEmail("someone@gmail.com")).toBe(false);
    expect(isAllowedEmail("synchrone.fr")).toBe(false);
  });

  it("gives an unknown Synchrone address the open missions only", () => {
    const guest = getUser("new.person@synchrone.fr");
    expect(guest?.guest).toBe(true);
    const missions = allowedMissions("new.person@synchrone.fr");
    expect(missions).toContain("practice-data-ai");
    expect(missions).not.toContain("nova-soc");
  });

  it("keeps restricted missions to their team", () => {
    expect(allowedMissions("nadia.benali@synchrone.fr")).toContain("nova-soc");
    expect(allowedMissions("thomas.girard@synchrone.fr")).not.toContain("nova-soc");
  });
});
