// Demo identity. The team shares one machine, so the header lets you switch between the demo
// users to see the access rules in action. In production this is replaced by the company
// sign-in (see the "sso" feature): the user and their missions come from the directory.
import { cookies } from "next/headers";
import { getCatalog } from "./engine/data";
import type { User } from "./engine/types";

export const USER_COOKIE = "kw_user";
const DEFAULT_LOGIN = "thomas.girard";

export async function currentUser(): Promise<User> {
  const store = await cookies();
  const login = store.get(USER_COOKIE)?.value ?? DEFAULT_LOGIN;
  const users = getCatalog().users;
  return users.find((u) => u.login === login) ?? users.find((u) => u.login === DEFAULT_LOGIN)!;
}
