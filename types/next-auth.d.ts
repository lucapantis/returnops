import type { Role } from "@/lib/auth/permissions";
import type { DefaultSession } from "next-auth";

// Carry the application role (and a stable user id) on the session and JWT.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}
