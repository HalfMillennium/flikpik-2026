import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Fully public pages.
const PUBLIC_PATHS = new Set(["/", "/login", "/signup"]);

// Guest-accessible app pages (local-only experience, no account needed).
const GUEST_PREFIXES = ["/watchlist", "/movies/search", "/movies/tmdb"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();
  if (GUEST_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // Everything else (groups, sessions, profile, DB-backed movie detail)
  // requires an account.
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Guard pages only. Every /api route does its own auth (401 JSON for
  // protected routes; movie search/detail allow guests), so exclude all of
  // /api here — otherwise the middleware would 307-redirect API calls to
  // /login and break guest search.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|poster-placeholder.svg|icon.svg|.*\\.png$|.*\\.svg$).*)",
  ],
};
