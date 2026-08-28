import { describe, expect, it } from "vitest";
import { parseCsv, parseCsvToRecords, toCsv } from "./csv";

describe("parseCsv", () => {
  it("parses simple comma-separated rows", () => {
    const rows = parseCsv("a,b,c\n1,2,3\n");
    expect(rows).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("handles quoted fields with embedded commas", () => {
    const rows = parseCsv('name,note\nAlice,"Hello, world"\n');
    expect(rows).toEqual([
      ["name", "note"],
      ["Alice", "Hello, world"],
    ]);
  });

  it("handles escaped quotes inside quoted fields", () => {
    const rows = parseCsv('note\n"She said ""hi"""\n');
    expect(rows).toEqual([["note"], ['She said "hi"']]);
  });

  it("handles embedded newlines inside quoted fields", () => {
    const rows = parseCsv('note\n"line1\nline2"\n');
    expect(rows).toEqual([["note"], ["line1\nline2"]]);
  });

  it("handles a file with no trailing newline", () => {
    const rows = parseCsv("a,b\n1,2");
    expect(rows).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("parseCsvToRecords", () => {
  it("maps rows to header-keyed records", () => {
    const { headers, records } = parseCsvToRecords("a,b\n1,2\n3,4\n");
    expect(headers).toEqual(["a", "b"]);
    expect(records).toEqual([
      { a: "1", b: "2" },
      { a: "3", b: "4" },
    ]);
  });

  it("returns empty output for empty input", () => {
    const { headers, records } = parseCsvToRecords("");
    expect(headers).toEqual([]);
    expect(records).toEqual([]);
  });

  it("fills missing trailing cells with empty strings", () => {
    const { records } = parseCsvToRecords("a,b,c\n1,2\n");
    expect(records).toEqual([{ a: "1", b: "2", c: "" }]);
  });
});

describe("toCsv", () => {
  it("serializes rows with a header line", () => {
    const csv = toCsv(
      [
        { key: "name", header: "Name" },
        { key: "age", header: "Age" },
      ],
      [{ name: "Alice", age: 30 }]
    );
    expect(csv).toBe("Name,Age\nAlice,30\n");
  });

  it("quotes fields containing commas", () => {
    const csv = toCsv([{ key: "note", header: "Note" }], [{ note: "a, b" }]);
    expect(csv).toBe('Note\n"a, b"\n');
  });

  it("renders null/undefined as empty string", () => {
    const csv = toCsv([{ key: "note", header: "Note" }], [{ note: null }]);
    expect(csv).toBe("Note\n\n");
  });

  it("neutralizes leading formula characters (CSV injection)", () => {
    const csv = toCsv(
      [{ key: "note", header: "Note" }],
      [
        { note: "=1+1" },
        { note: "+49123" },
        { note: "-2+3" },
        { note: "@SUM(A1:A2)" },
        { note: "safe value" },
      ]
    );
    const rows = parseCsv(csv);
    expect(rows.slice(1)).toEqual([
      ["'=1+1"],
      ["'+49123"],
      ["'-2+3"],
      ["'@SUM(A1:A2)"],
      ["safe value"],
    ]);
  });

  it("neutralizes a formula even when the field also needs quoting", () => {
    const csv = toCsv([{ key: "note", header: "Note" }], [{ note: "=HYPERLINK(x), y" }]);
    expect(csv).toBe("Note\n\"'=HYPERLINK(x), y\"\n");
  });

  it("round-trips through parseCsv", () => {
    const csv = toCsv(
      [
        { key: "name", header: "Name" },
        { key: "note", header: "Note" },
      ],
      [{ name: "Bob", note: 'Says "hi", often' }]
    );
    const rows = parseCsv(csv);
    expect(rows[1]).toEqual(["Bob", 'Says "hi", often']);
  });
});
