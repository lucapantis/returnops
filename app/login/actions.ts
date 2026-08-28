"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/auth";
import { safeCallbackUrl } from "@/lib/auth/callbackUrl";

export interface LoginState {
  error?: string;
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const callbackUrl = safeCallbackUrl(formData.get("callbackUrl"));

  try {
    await signIn("credentials", { email, password, redirectTo: callbackUrl });
  } catch (error) {
    // A successful sign-in throws a redirect (NEXT_REDIRECT) which must
    // propagate. Only real auth failures are turned into a generic message
    // that never reveals whether the account exists or is locked.
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw error;
  }

  return {};
}

/**
 * Sign in as the public portfolio demo account. The credentials never leave
 * the server — they are read from `DEMO_USER_*` env vars here and passed
 * straight to Auth.js. The account is a VIEWER further clamped to read-only,
 * non-export access (see `lib/auth/demo.ts` and `lib/auth/guard.ts`).
 *
 * On success Auth.js throws a redirect to `/`. Any failure sends the user back
 * to `/login?demo=unavailable`, which renders a short notice — no credential
 * detail is ever surfaced.
 */
export async function demoLoginAction(): Promise<void> {
  const email = process.env.DEMO_USER_EMAIL;
  const password = process.env.DEMO_USER_PASSWORD;

  if (!email || !password) {
    redirect("/login?demo=unavailable");
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?demo=unavailable");
    }
    throw error;
  }
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
