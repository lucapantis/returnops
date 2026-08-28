import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/lib/auth/permissions";

// Edge/proxy-safe Auth.js configuration: no database client, no password
// hashing, no provider `authorize` logic. `proxy.ts` builds a NextAuth
// instance from *only* this object to do the cheap "is there a valid session
// cookie" check on every request. The full configuration in `auth.ts` spreads
// this and adds the Credentials provider.

export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [],
  callbacks: {
    // Used by the proxy wrapper: an optimistic, cookie-only auth check.
    authorized({ auth }) {
      return Boolean(auth?.user);
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role: Role }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
