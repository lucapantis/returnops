"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, LinkButton } from "@/components/ui/Button";
import { ALL_CSV_COLUMNS, REQUIRED_CSV_COLUMNS } from "@/lib/validation";
import type { ImportPreviewResult } from "@/lib/import";

type Stage = "upload" | "previewing" | "preview" | "committing" | "done";

interface CommitResult {
  imported: number;
  skipped: number;
  totalRows: number;
}

const SAMPLE_ROWS = [
  [
    "RET-2026-SAMPLE1",
    "ORD-100001",
    "Wireless Mouse",
    "SKU-WM-001",
    "Jane Doe",
    "DEFECTIVE",
    "RECEIVED",
    "2026-08-01",
    "",
    "Left click double-fires",
  ],
];

function buildTemplateCsv(): string {
  const header = ALL_CSV_COLUMNS.join(",");
  const lines = SAMPLE_ROWS.map((row) => row.join(","));
  return [header, ...lines].join("\n") + "\n";
}

function downloadTemplate() {
  const blob = new Blob([buildTemplateCsv()], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "returnops-import-template.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function ImportWizard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("upload");
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setFileName(file.name);
    const text = await file.text();
    setCsvText(text);
    setStage("previewing");

    try {
      const res = await fetch("/api/returns/import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText: text }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Could not preview this file.");
        setStage("upload");
        return;
      }
      setPreview(body.data as ImportPreviewResult);
      setStage("preview");
    } catch {
      setError("Network error while previewing the file.");
      setStage("upload");
    }
  }

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  async function commit() {
    if (!csvText) return;
    setStage("committing");
    setError(null);
    try {
      const res = await fetch("/api/returns/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Could not import this file.");
        setStage("preview");
        return;
      }
      setCommitResult(body.data as CommitResult);
      setStage("done");
      router.refresh();
    } catch {
      setError("Network error while importing the file.");
      setStage("preview");
    }
  }

  function reset() {
    setStage("upload");
    setFileName(null);
    setCsvText(null);
    setPreview(null);
    setError(null);
    setCommitResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">CSV format</h2>
            <p className="mt-1 text-sm text-slate-500">
              Required columns: {REQUIRED_CSV_COLUMNS.join(", ")}. Optional: completedDate,
              operatorNotes.
            </p>
          </div>
          <Button variant="secondary" onClick={downloadTemplate}>
            Download template
          </Button>
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {(stage === "upload" || stage === "previewing") && (
        <section
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white px-6 py-16 text-center"
        >
          <p className="text-sm font-medium text-slate-700">
            Drag and drop a CSV file here, or
          </p>
          <label className="mt-3 inline-flex cursor-pointer items-center justify-center rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-700">
            {stage === "previewing" ? "Reading file..." : "Choose file"}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              disabled={stage === "previewing"}
              onChange={onFileInputChange}
            />
          </label>
          {fileName && <p className="mt-3 text-xs text-slate-500">{fileName}</p>}
        </section>
      )}

      {(stage === "preview" || stage === "committing") && preview && (
        <ImportPreview
          preview={preview}
          fileName={fileName}
          onCommit={commit}
          onCancel={reset}
          committing={stage === "committing"}
        />
      )}

      {stage === "done" && commitResult && (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <h2 className="text-base font-semibold text-emerald-900">Import complete</h2>
          <p className="mt-2 text-sm text-emerald-800">
            Imported <span className="font-semibold">{commitResult.imported}</span> of{" "}
            {commitResult.totalRows} rows
            {commitResult.skipped > 0 && (
              <> · {commitResult.skipped} skipped (invalid or duplicate)</>
            )}
            .
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <LinkButton href="/returns">View returns</LinkButton>
            <Button variant="secondary" onClick={reset}>
              Import another file
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

function ImportPreview({
  preview,
  fileName,
  onCommit,
  onCancel,
  committing,
}: {
  preview: ImportPreviewResult;
  fileName: string | null;
  onCommit: () => void;
  onCancel: () => void;
  committing: boolean;
}) {
  const canCommit = preview.validRows.length > 0 && preview.missingColumns.length === 0;

  return (
    <section className="space-y-4">
      {preview.missingColumns.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Missing required column(s): {preview.missingColumns.join(", ")}. Fix the file header
          and re-upload.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryStat label="Total rows" value={preview.totalRows} tone="neutral" />
        <SummaryStat label="Ready to import" value={preview.validRows.length} tone="good" />
        <SummaryStat label="Invalid" value={preview.invalidRows.length} tone="bad" />
        <SummaryStat label="Duplicates" value={preview.duplicateRows.length} tone="warn" />
      </div>

      {preview.invalidRows.length > 0 && (
        <RowIssueTable
          title="Invalid rows"
          description="These rows will be skipped."
          rows={preview.invalidRows.map((r) => ({
            rowNumber: r.rowNumber,
            detail: r.errors.join("; "),
          }))}
        />
      )}

      {preview.duplicateRows.length > 0 && (
        <RowIssueTable
          title="Duplicate rows"
          description="These match an existing return or another row in this file, and will be skipped."
          rows={preview.duplicateRows.map((r) => ({
            rowNumber: r.rowNumber,
            detail: r.duplicateReason ?? "Duplicate",
          }))}
        />
      )}

      <div className="flex items-center gap-2">
        <Button onClick={onCommit} disabled={!canCommit || committing}>
          {committing
            ? "Importing..."
            : `Import ${preview.validRows.length} row${preview.validRows.length === 1 ? "" : "s"}`}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={committing}>
          {fileName ? "Choose a different file" : "Cancel"}
        </Button>
      </div>
    </section>
  );
}

const TONE_CLASSES = {
  neutral: "text-slate-900",
  good: "text-emerald-600",
  bad: "text-red-600",
  warn: "text-amber-600",
} as const;

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: keyof typeof TONE_CLASSES;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${TONE_CLASSES[tone]}`}>{value}</p>
    </div>
  );
}

function RowIssueTable({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: { rowNumber: number; detail: string }[];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <div className="max-h-64 overflow-y-auto">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.rowNumber}>
                <td className="whitespace-nowrap px-4 py-2 font-medium text-slate-500">
                  Row {r.rowNumber}
                </td>
                <td className="px-4 py-2 text-slate-700">{r.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
