"use client";

import { useState } from "react";
import { logoutAction } from "@/app/login/actions";
import {
  ROLE_BADGE_CLASSES,
  ROLE_LABELS,
  type Role,
} from "@/lib/auth/permissions";

export interface SessionUserView {
  name: string;
  email: string;
  role: Role;
}

export function UserMenu({ user }: { user: SessionUserView }) {
  const [signingOut, setSigningOut] = useState(false);

  return (
    <div className="border-t border-slate-200 p-4">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700"
        >
          {user.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900" title={user.email}>
            {user.name}
          </p>
          <span
            className={`mt-0.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 ring-inset ${ROLE_BADGE_CLASSES[user.role]}`}
          >
            {ROLE_LABELS[user.role]}
          </span>
        </div>
      </div>
      <form
        action={logoutAction}
        onSubmit={() => setSigningOut(true)}
        className="mt-3"
      >
        <button
          type="submit"
          disabled={signingOut}
          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60"
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </form>
    </div>
  );
}
