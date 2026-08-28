import type { Role } from "@/lib/auth/permissions";
import type { DefaultSession } from "next-auth";

// Carry the application role (and a stable user id) on the session and JWT.
// `isDemo` marks the public portfolio demo session — a VIEWER further clamped
// to read-only, non-export access (see lib/auth/demo.ts).
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      isDemo: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    isDemo?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    isDemo?: boolean;
  }
}
