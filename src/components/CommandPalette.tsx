"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, Plus, LogOut, CornerDownLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/lib/actions";
import { tack, type Card } from "@/lib/types";

type BoardLite = { id: string; name: string; prefix: string };

type Action =
  | { kind: "card"; id: string; label: string; sublabel: string }
  | { kind: "board"; id: string; label: string; sublabel: string }
  | { kind: "new-board"; label: string }
  | { kind: "sign-out"; label: string };

/**
 * Cmd/Ctrl+K palette. Scoped to the current board: cards come from props (the
 * board's live state), other boards are lazy-fetched on first open via the
 * browser supabase client (RLS scopes the result to the user).
 *
 * Selecting:
 *   - a card  → opens it via the `?card=` URL param (caller wires).
 *   - a board → navigates to /boards/<id>.
 *   - new-board / sign-out → action.
 */
export default function CommandPalette({
  open,
  onClose,
  cards,
  boardPrefix,
  currentBoardId,
  onOpenCard,
  onNewBoard,
}: {
  open: boolean;
  onClose: () => void;
  cards: Card[];
  boardPrefix: string;
  currentBoardId: string;
  onOpenCard: (cardId: string) => void;
  onNewBoard: () => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [boards, setBoards] = useState<BoardLite[] | null>(null);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset transient state each open + focus the input.
  useEffect(() => {
    if (!open) return;
    setQ("");
    setCursor(0);
    // Defer focus so the autofocus survives any layout shifts.
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  // Lazy-load the user's other boards once per mount.
  useEffect(() => {
    if (!open || boards !== null) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("board_members")
        .select("boards(id, name, prefix)");
      if (cancelled) return;
      type Row = { boards: BoardLite | null };
      const rows = (data ?? []) as unknown as Row[];
      const list: BoardLite[] = rows
        .map((r) => r.boards)
        .filter((b): b is BoardLite => !!b)
        .sort((a, b) => a.name.localeCompare(b.name));
      setBoards(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, boards]);

  // Compute the flat ranked list of actions to render. Stable across renders
  // for a given query — keyboard navigation indexes into this array.
  const items = useMemo<Action[]>(() => {
    const needle = q.trim().toLowerCase();
    const cardMatches = (cards ?? [])
      .filter((c) => {
        if (!needle) return true;
        if (c.number !== null) {
          const id = `${boardPrefix}-${c.number}`.toLowerCase();
          if (id.includes(needle)) return true;
        }
        return c.title.toLowerCase().includes(needle);
      })
      .slice(0, 8)
      .map<Action>((c) => ({
        kind: "card",
        id: c.id,
        label: c.title || "Untitled",
        sublabel: c.number !== null ? `${boardPrefix}-${c.number}` : "",
      }));

    const otherBoards = (boards ?? [])
      .filter((b) => b.id !== currentBoardId)
      .filter((b) => !needle || b.name.toLowerCase().includes(needle))
      .slice(0, 8)
      .map<Action>((b) => ({
        kind: "board",
        id: b.id,
        label: b.name,
        sublabel: b.prefix,
      }));

    const actions: Action[] = [
      { kind: "new-board", label: "New board" },
      { kind: "sign-out", label: "Sign out" },
    ].filter((a) =>
      !needle ? true : a.label.toLowerCase().includes(needle)
    ) as Action[];

    return [...cardMatches, ...otherBoards, ...actions];
  }, [q, cards, boardPrefix, boards, currentBoardId]);

  // Keep the cursor in bounds as the list shrinks/grows.
  useEffect(() => {
    if (cursor > items.length - 1) setCursor(Math.max(0, items.length - 1));
  }, [items.length, cursor]);

  // Scroll the active row into view as the user arrows.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-i="${cursor}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor, open]);

  if (!open) return null;

  const run = (a: Action) => {
    onClose();
    switch (a.kind) {
      case "card":
        onOpenCard(a.id);
        return;
      case "board":
        router.push(`/boards/${a.id}`);
        return;
      case "new-board":
        onNewBoard();
        return;
      case "sign-out":
        // Server action; no need to await — page will redirect.
        signOut();
        return;
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((i) => Math.min(items.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const a = items[cursor];
      if (a) run(a);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  // Group headers for visual scanning. We compute on the fly; cheap.
  const sectionAt = (i: number): string | null => {
    const a = items[i];
    if (!a) return null;
    const prev = items[i - 1];
    if (a.kind === "card" && (!prev || prev.kind !== "card")) return "On this board";
    if (a.kind === "board" && (!prev || prev.kind !== "board")) return "Other boards";
    if ((a.kind === "new-board" || a.kind === "sign-out") &&
        (!prev || (prev.kind !== "new-board" && prev.kind !== "sign-out"))) {
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
            placeholder="Find a card, jump to a board…"
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
            <p
              className="text-sm px-3 py-6 text-center"
              style={{ color: tack.slate }}
            >
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
  if (kind === "card") return <Search size={14} style={c} aria-hidden />;
  if (kind === "board") return <ArrowRight size={14} style={c} aria-hidden />;
  if (kind === "new-board") return <Plus size={14} style={c} aria-hidden />;
  return <LogOut size={14} style={c} aria-hidden />;
}
