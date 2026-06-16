"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ChevronDown, Plus, Search } from "lucide-react";
import { createBoard, createBoardFromTemplate } from "@/lib/actions";
import { tack } from "@/lib/theme";
import TopBar from "./TopBar";
import HomeCommandPalette from "./HomeCommandPalette";

export type BoardTile = {
  id: string;
  name: string;
  role: string;
  cardCount: number;
};

export default function BoardsHome({
  boards,
  me,
}: {
  boards: BoardTile[];
  me: { name: string | null; email: string | null };
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [template, setTemplate] = useState("default");
  const [pending, start] = useTransition();
  const [search, setSearch] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);

  const filteredBoards = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return boards;
    return boards.filter((b) => b.name.toLowerCase().includes(needle));
  }, [boards, search]);

  // Cmd/Ctrl+K global shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (e.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submit = () => {
    if (!name.trim()) return;
    start(async () => {
      if (template === "default") {
        await createBoard(name.trim());
      } else {
        await createBoardFromTemplate(name.trim(), template);
      }
      setName("");
      setAdding(false);
    });
  };

  return (
    <div className="h-full flex flex-col" style={{ background: tack.paper }}>
      <TopBar me={me} />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="flex items-center justify-between mb-6 gap-4">
            <div>
              <h1
                className="text-3xl font-display"
                style={{ color: tack.ink, fontWeight: 600 }}
              >
                Your boards
              </h1>
              <p className="text-sm mt-1 font-meta" style={{ color: tack.slate }}>
                {boards.length === 0
                  ? "Nothing pinned yet. Add your first board."
                  : `${boards.length} ${boards.length === 1 ? "board" : "boards"}`}
              </p>
            </div>

            {/* Search bar */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm flex-1 max-w-xs"
              style={{
                background: tack.surface,
                border: `1px solid ${tack.hairline}`,
              }}
            >
              <Search size={14} style={{ color: tack.slate, flexShrink: 0 }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter boards…"
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: tack.ink }}
              />
              <button
                onClick={() => setPaletteOpen(true)}
                className="font-meta text-[10px] uppercase tracking-[0.08em] px-1.5 py-0.5 rounded hidden sm:block"
                style={{ background: tack.wash, color: tack.slate }}
                aria-label="Open command palette"
              >
                ⌘K
              </button>
            </div>
          </div>

          {/* Empty search state */}
          {filteredBoards.length === 0 && search && (
            <p className="text-sm py-8 text-center" style={{ color: tack.slate }}>
              No boards match &ldquo;{search}&rdquo;
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBoards.map((b) => (
              <BoardCard key={b.id} board={b} />
            ))}

            {adding ? (
              <div
                className="rounded-xl p-4 flex flex-col gap-3"
                style={{
                  background: tack.surface,
                  border: `1px solid ${tack.pin}`,
                  minHeight: 160,
                }}
              >
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submit();
                    if (e.key === "Escape") {
                      setAdding(false);
                      setName("");
                    }
                  }}
                  placeholder="Name this board"
                  className="w-full bg-transparent outline-none text-base font-display"
                  style={{ color: tack.ink, fontWeight: 600 }}
                />
                {/* Template picker */}
                <div className="relative">
                  <select
                    value={template}
                    onChange={(e) => setTemplate(e.target.value)}
                    className="w-full text-xs rounded-md px-2.5 py-1.5 pr-7 appearance-none outline-none"
                    style={{
                      background: tack.wash,
                      color: tack.ink,
                      border: `1px solid ${tack.hairline}`,
                    }}
                  >
                    <option value="default">Default (Backlog → Done)</option>
                    <option value="engineering">Engineering sprint</option>
                    <option value="marketing">Marketing pipeline</option>
                    <option value="personal">Personal (3 columns)</option>
                  </select>
                  <ChevronDown
                    size={12}
                    className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2"
                    style={{ color: tack.slate }}
                  />
                </div>
                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={submit}
                    disabled={pending}
                    className="text-sm px-3 py-1.5 rounded-md text-white font-medium disabled:opacity-60"
                    style={{ background: tack.pin }}
                  >
                    {pending ? "Creating…" : "Create"}
                  </button>
                  <button
                    onClick={() => {
                      setAdding(false);
                      setName("");
                      setTemplate("default");
                    }}
                    className="text-sm px-3 py-1.5 rounded-md"
                    style={{ color: tack.slate }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="rounded-xl flex flex-col items-center justify-center gap-2 text-sm transition-colors hover:bg-black/[0.02]"
                style={{
                  border: `1px dashed ${tack.hairline}`,
                  color: tack.slate,
                  minHeight: 132,
                }}
              >
                <Plus size={20} />
                New board
              </button>
            )}
          </div>
        </div>
      </main>

      <HomeCommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        boards={boards}
        onNewBoard={() => setAdding(true)}
      />
    </div>
  );
}

function BoardCard({ board }: { board: BoardTile }) {
  return (
    <Link
      href={`/boards/${board.id}`}
      className="relative rounded-xl p-4 flex flex-col gap-3 transition-shadow hover:shadow-md"
      style={{
        background: tack.surface,
        border: `1px solid ${tack.hairline}`,
        minHeight: 132,
      }}
    >
      {/* Pin signature on each board tile. */}
      <span
        className="absolute -top-1 -left-1 h-2.5 w-2.5 rounded-full shadow-sm"
        style={{ background: tack.pin }}
        aria-hidden
      />
      <h2
        className="text-lg font-display leading-tight pr-6"
        style={{ color: tack.ink, fontWeight: 600 }}
      >
        {board.name}
      </h2>
      <div className="mt-auto flex items-center justify-between text-[11px] font-meta uppercase tracking-[0.06em]"
        style={{ color: tack.slate }}>
        <span>{board.role}</span>
        <span>
          {board.cardCount} {board.cardCount === 1 ? "card" : "cards"}
        </span>
      </div>
    </Link>
  );
}
