import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { DUMMY_HASH, verifyPassword } from "@/lib/auth/password";
import { isLocked, registerFailure, registerSuccess } from "@/lib/auth/lockout";

const credentialsSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      // No public sign-up: this only ever *verifies* existing credentials.
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const email = parsed.data.email.trim().toLowerCase();
        const password = parsed.data.password;

        const user = await prisma.user.findUnique({ where: { email } });

        // Run a bcrypt comparison on every path (even "no such user" and
        // "disabled") so response time doesn't reveal whether the account
        // exists. The caller only ever sees a generic failure.
        if (!user || !user.isActive) {
          await verifyPassword(password, DUMMY_HASH);
          return null;
        }

        if (isLocked(user)) {
          await verifyPassword(password, DUMMY_HASH);
          return null;
        }

        const ok = await verifyPassword(password, user.passwordHash);

        if (!ok) {
          await prisma.user.update({
            where: { id: user.id },
            data: registerFailure(user),
          });
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { ...registerSuccess(), lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
});
