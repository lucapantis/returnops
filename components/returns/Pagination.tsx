import Link from "next/link";

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  buildHref,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  buildHref: (page: number) => string;
}) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row">
      <p className="text-sm text-slate-500">
        Showing <span className="font-medium text-slate-700">{start}</span>–
        <span className="font-medium text-slate-700">{end}</span> of{" "}
        <span className="font-medium text-slate-700">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <PageLink href={buildHref(page - 1)} disabled={page <= 1} label="Previous" />
        <span className="px-2 text-sm text-slate-500">
          Page {page} of {totalPages}
        </span>
        <PageLink href={buildHref(page + 1)} disabled={page >= totalPages} label="Next" />
      </div>
    </div>
  );
}

function PageLink({ href, disabled, label }: { href: string; disabled: boolean; label: string }) {
  const classes =
    "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors " +
    (disabled
      ? "cursor-not-allowed text-slate-300"
      : "text-slate-700 hover:bg-slate-100");

  if (disabled) {
    return (
      <span className={classes} aria-disabled="true">
        {label}
      </span>
    );
  }
  return (
    <Link href={href} className={classes}>
      {label}
    </Link>
  );
}
