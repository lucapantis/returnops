"use server";

import { AuthError } from "next-auth";
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

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
