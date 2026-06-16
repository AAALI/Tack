"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { exportBoardData } from "@/lib/actions";
import { tack } from "@/lib/theme";

export default function ExportButton({ boardId, boardName }: { boardId: string; boardName: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const download = async (format: "json" | "csv") => {
    setLoading(true);
    setOpen(false);
    try {
      const data = await exportBoardData(boardId);
      if (format === "json") {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        trigger(blob, `${boardName.toLowerCase().replace(/\s+/g, "-")}-export.json`);
      } else {
        const rows: string[] = [
          ["ID", "Title", "Column", "Priority", "Assignee", "Due date", "Labels", "Created"].join(","),
          ...data.cards.map((c) => {
            const col = data.columns.find((col) => col.id === c.column_id);
            return [
              c.number ? `${data.board?.prefix}-${c.number}` : c.id,
              csvEscape(c.title),
              csvEscape(col?.title ?? ""),
              c.priority ?? "none",
              csvEscape(c.assignee ?? ""),
              c.due_date ?? "",
              csvEscape((c.labels ?? []).join("; ")),
              c.created_at ? c.created_at.slice(0, 10) : "",
            ].join(",");
          }),
        ];
        const blob = new Blob([rows.join("\n")], { type: "text/csv" });
        trigger(blob, `${boardName.toLowerCase().replace(/\s+/g, "-")}-cards.csv`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border"
        style={{
          borderColor: tack.hairline,
          color: tack.slate,
          background: tack.surface,
        }}
        aria-label="Export board"
      >
        <Download size={13} />
        {loading ? "Exporting…" : "Export"}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 mt-1 w-40 rounded-xl shadow-lg p-1 z-50"
            style={{ background: tack.surface, border: `1px solid ${tack.hairline}` }}
          >
            {(["json", "csv"] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => download(fmt)}
                className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-black/[0.03]"
                style={{ color: tack.ink }}
              >
                Download as {fmt.toUpperCase()}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function csvEscape(s: string): string {
  if (!s) return "";
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function trigger(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
