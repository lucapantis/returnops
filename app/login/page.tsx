import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/guard";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign in — ReturnOps",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; expired?: string }>;
}) {
  const user = await getSessionUser();
  if (user) redirect("/");

  const { callbackUrl, expired } = await searchParams;

  return (
    <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-base font-bold text-white">
            R
          </span>
          <h1 className="mt-3 text-xl font-semibold tracking-tight text-slate-900">
            Sign in to ReturnOps
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Returns &amp; operational-record management
          </p>
        </div>

        {expired && (
          <div
            role="status"
            className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
          >
            Your session has expired. Please sign in again.
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <LoginForm callbackUrl={callbackUrl ?? "/"} />
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Accounts are provisioned by an administrator. There is no public
          sign-up.
        </p>
      </div>
    </div>
  );
}
