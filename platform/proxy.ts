import { NextResponse, type NextRequest } from "next/server";

// Sends visitors without a session to the sign-in page. This only checks that a session cookie
// exists; every page and API route then verifies its signature (lib/session.ts).
export function proxy(request: NextRequest) {
  if (request.cookies.has("kw_session")) return NextResponse.next();
  const url = new URL("/login", request.url);
  const next = request.nextUrl.pathname + request.nextUrl.search;
  if (next !== "/") url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except the sign-in page, API routes (they answer 401 themselves) and static files.
  matcher: ["/((?!login|api|_next/static|_next/image|favicon.ico).*)"],
};
