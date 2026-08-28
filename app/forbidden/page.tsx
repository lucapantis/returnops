import type { Metadata } from "next";
import { LinkButton } from "@/components/ui/Button";
import { getSessionUser } from "@/lib/auth/guard";
import { ROLE_LABELS } from "@/lib/auth/permissions";

export const metadata: Metadata = {
  title: "Not authorized — ReturnOps",
};

export default async function ForbiddenPage() {
  const user = await getSessionUser();

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex max-w-md flex-col items-center rounded-xl border border-amber-200 bg-amber-50 px-6 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="h-6 w-6 text-amber-600"
          >
            <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
          </svg>
        </div>
        <h1 className="mt-4 text-base font-semibold text-amber-900">
          You don&apos;t have access to this page
        </h1>
        <p className="mt-1 text-sm text-amber-800">
          {user
            ? `Your role (${ROLE_LABELS[user.role]}) isn't permitted to view this area. Contact an administrator if you need access.`
            : "Please sign in to continue."}
        </p>
        <div className="mt-4">
          <LinkButton href="/">Back to dashboard</LinkButton>
        </div>
      </div>
    </div>
  );
}
