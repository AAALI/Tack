"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Layout, Plus, LogOut, CornerDownLeft } from "lucide-react";
import { signOut } from "@/lib/actions";
import { tack } from "@/lib/theme";
import type { BoardTile } from "./BoardsHome";

type Action =
  | { kind: "board"; id: string; label: string; sublabel: string }
  | { kind: "new-board"; label: string }
  | { kind: "sign-out"; label: string };

export default function HomeCommandPalette({
  open,
  onClose,
  boards,
  onNewBoard,
}: {
  open: boolean;
  onClose: () => void;
  boards: BoardTile[];
  onNewBoard: () => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setCursor(0);
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  const items = useMemo<Action[]>(() => {
    const needle = q.trim().toLowerCase();
    const boardItems = boards
      .filter((b) => !needle || b.name.toLowerCase().includes(needle))
      .map<Action>((b) => ({
        kind: "board",
        id: b.id,
        label: b.name,
        sublabel: b.role,
      }));

    const actions: Action[] = [
      { kind: "new-board", label: "New board" },
      { kind: "sign-out", label: "Sign out" },
    ].filter((a) => !needle || a.label.toLowerCase().includes(needle)) as Action[];

    return [...boardItems, ...actions];
  }, [q, boards]);

  useEffect(() => {
    if (cursor > items.length - 1) setCursor(Math.max(0, items.length - 1));
  }, [items.length, cursor]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-i="${cursor}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor, open]);

  if (!open) return null;

  const run = (a: Action) => {
    onClose();
    switch (a.kind) {
      case "board":
        router.push(`/boards/${a.id}`);
        return;
      case "new-board":
        onNewBoard();
        return;
      case "sign-out":
        signOut();
        return;
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (items.length > 0) setCursor((i) => Math.min(items.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (items.length > 0) setCursor((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const a = items[cursor];
      if (a) run(a);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const sectionAt = (i: number): string | null => {
    const a = items[i];
    if (!a) return null;
    const prev = items[i - 1];
    if (a.kind === "board" && (!prev || prev.kind !== "board")) return "Your boards";
    if (
      (a.kind === "new-board" || a.kind === "sign-out") &&
      (!prev || (prev.kind !== "new-board" && prev.kind !== "sign-out"))
    ) {
      return "Actions";
    }
    return null;
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] px-4"
      style={{ background: "rgba(27,27,31,0.35)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="w-full max-w-lg rounded-2xl shadow-xl overflow-hidden"
        style={{ background: tack.surface, border: `1px solid ${tack.hairline}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center gap-2 px-4 py-3"
          style={{ borderBottom: `1px solid ${tack.hairline}` }}
        >
          <Search size={15} style={{ color: tack.slate }} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setCursor(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Jump to a board…"
            className="flex-1 text-sm bg-transparent outline-none"
            style={{ color: tack.ink }}
          />
          <span
            className="font-meta text-[10px] tracking-[0.08em] uppercase px-1.5 py-0.5 rounded"
            style={{ background: tack.wash, color: tack.slate }}
          >
            Esc
          </span>
        </div>

        <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-1">
          {items.length === 0 ? (
            <p className="text-sm px-3 py-6 text-center" style={{ color: tack.slate }}>
              Nothing matches.
            </p>
          ) : (
            items.map((a, i) => {
              const header = sectionAt(i);
              const active = i === cursor;
              return (
                <div key={`${a.kind}-${"id" in a ? a.id : a.label}-${i}`}>
                  {header && (
                    <p
                      className="px-3 pt-2 pb-1 font-meta text-[10px] uppercase tracking-[0.08em]"
                      style={{ color: tack.slate }}
                    >
                      {header}
                    </p>
                  )}
                  <button
                    data-i={i}
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => run(a)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-left"
                    style={{
                      background: active ? tack.wash : "transparent",
                      color: tack.ink,
                    }}
                  >
                    <PaletteIcon kind={a.kind} />
                    <span className="flex-1 truncate text-sm">{a.label}</span>
                    {"sublabel" in a && a.sublabel && (
                      <span
                        className="font-meta text-[10px] tracking-[0.04em]"
                        style={{ color: tack.slate }}
                      >
                        {a.sublabel}
                      </span>
                    )}
                    {active && (
                      <CornerDownLeft size={12} style={{ color: tack.slate }} />
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function PaletteIcon({ kind }: { kind: Action["kind"] }) {
  const c = { color: tack.slate } as const;
  if (kind === "board") return <Layout size={14} style={c} aria-hidden />;
  if (kind === "new-board") return <Plus size={14} style={c} aria-hidden />;
  return <LogOut size={14} style={c} aria-hidden />;
}
