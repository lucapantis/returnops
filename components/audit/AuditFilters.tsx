"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AUDIT_ACTIONS, AUDIT_ACTION_LABELS } from "@/lib/auditActions";

const ACTION_LABELS: Record<string, string> = AUDIT_ACTION_LABELS;

export function AuditFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [actor, setActor] = useState(searchParams.get("actor") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      params.delete("page");
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (actor !== (searchParams.get("actor") ?? "")) {
        updateParams({ actor: actor || null });
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actor]);

  const hasActiveFilters =
    searchParams.get("action") ||
    searchParams.get("actor") ||
    searchParams.get("entityId") ||
    searchParams.get("dateFrom") ||
    searchParams.get("dateTo");

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <label htmlFor="actor" className="mb-1 block text-xs font-medium text-slate-600">
            Actor email
          </label>
          <input
            id="actor"
            type="search"
            placeholder="user@example.com"
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>

        <div>
          <label htmlFor="action" className="mb-1 block text-xs font-medium text-slate-600">
            Action
          </label>
          <select
            id="action"
            value={searchParams.get("action") ?? ""}
            onChange={(e) => updateParams({ action: e.target.value || null })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="">All actions</option>
            {AUDIT_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {ACTION_LABELS[a] ?? a}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label htmlFor="dateFrom" className="mb-1 block text-xs font-medium text-slate-600">
              From
            </label>
            <input
              id="dateFrom"
              type="date"
              value={searchParams.get("dateFrom") ?? ""}
              onChange={(e) => updateParams({ dateFrom: e.target.value || null })}
              className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="dateTo" className="mb-1 block text-xs font-medium text-slate-600">
              To
            </label>
            <input
              id="dateTo"
              type="date"
              value={searchParams.get("dateTo") ?? ""}
              onChange={(e) => updateParams({ dateTo: e.target.value || null })}
              className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
        </div>

        <div>
          <label htmlFor="entityId" className="mb-1 block text-xs font-medium text-slate-600">
            Entity ID
          </label>
          <input
            id="entityId"
            type="search"
            placeholder="Return / batch id"
            defaultValue={searchParams.get("entityId") ?? ""}
            onBlur={(e) => updateParams({ entityId: e.target.value || null })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
      </div>

      {hasActiveFilters && (
        <div className="mt-3">
          <button
            onClick={() => {
              setActor("");
              router.push(pathname);
            }}
            className="text-xs font-medium text-slate-500 hover:text-slate-700 hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
