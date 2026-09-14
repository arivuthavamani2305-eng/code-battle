// Client-only helper: turns an array of flat objects into a CSV file and
// triggers a browser download. No dependency needed - just Blob + a
// temporary <a> tag. Handles commas/quotes/newlines in values correctly.
export function downloadCSV(filename: string, rows: Record<string, string | number | null | undefined>[]) {
  if (typeof window === "undefined" || rows.length === 0) return;

  const headers = Object.keys(rows[0]);

  function escape(value: unknown) {
    const str = value === null || value === undefined ? "" : String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  const lines = [headers.join(","), ...rows.map((row) => headers.map((h) => escape(row[h])).join(","))];
  const csvContent = lines.join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}