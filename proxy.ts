import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

// Next.js 16 renamed Middleware to Proxy. This runs on every matched request
// as an *optimistic* first line of defence: it reads the session cookie only
// (no database round-trip) and bounces obviously-unauthenticated traffic.
//
// It is deliberately NOT the only check. Every page re-verifies the session,
// and every API route / server mutation independently enforces authentication
// and role permissions against the database (see lib/auth/guard.ts).

const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = new Set<string>(["/login"]);

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const isLoggedIn = Boolean(req.auth?.user);

  // Auth.js's own endpoints must always be reachable.
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  const isPublic = PUBLIC_PATHS.has(pathname);
  const isApi = pathname.startsWith("/api/");

  if (!isLoggedIn && !isPublic) {
    if (isApi) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    // A stale/expired session cookie (present but no longer valid) gets a
    // friendlier "your session expired" message than a first-time visitor.
    const hadSession =
      req.cookies.has("authjs.session-token") ||
      req.cookies.has("__Secure-authjs.session-token");
    if (hadSession) loginUrl.searchParams.set("expired", "1");
    return NextResponse.redirect(loginUrl);
  }

  // Already signed in and hitting the login page — send them home.
  if (isLoggedIn && isPublic) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // Run on everything except Next internals and static asset files. API routes
  // are intentionally included so unauthenticated API calls get a 401 here too.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
