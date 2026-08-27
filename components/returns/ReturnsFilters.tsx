"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RETURN_REASONS, RETURN_STATUSES, REASON_LABELS, STATUS_LABELS } from "@/lib/constants";

export function ReturnsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      params.delete("page"); // any filter change resets pagination
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (search !== (searchParams.get("search") ?? "")) {
        updateParams({ search: search || null });
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const hasActiveFilters =
    searchParams.get("status") ||
    searchParams.get("reason") ||
    searchParams.get("dateFrom") ||
    searchParams.get("dateTo") ||
    searchParams.get("search");

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <label htmlFor="search" className="mb-1 block text-xs font-medium text-slate-600">
            Search
          </label>
          <input
            id="search"
            type="search"
            placeholder="Return ID, order #, product, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>

        <div>
          <label htmlFor="status" className="mb-1 block text-xs font-medium text-slate-600">
            Status
          </label>
          <select
            id="status"
            value={searchParams.get("status") ?? ""}
            onChange={(e) => updateParams({ status: e.target.value || null })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="">All statuses</option>
            {RETURN_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="reason" className="mb-1 block text-xs font-medium text-slate-600">
            Reason
          </label>
          <select
            id="reason"
            value={searchParams.get("reason") ?? ""}
            onChange={(e) => updateParams({ reason: e.target.value || null })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="">All reasons</option>
            {RETURN_REASONS.map((r) => (
              <option key={r} value={r}>
                {REASON_LABELS[r]}
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
      </div>

      {hasActiveFilters && (
        <div className="mt-3">
          <button
            onClick={() => {
              setSearch("");
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
