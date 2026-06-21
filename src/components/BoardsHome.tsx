"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Plus,
  Search,
  Star,
  MoreHorizontal,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
} from "lucide-react";
import {
  createBoard,
  createBoardFromTemplate,
  archiveBoard,
  unarchiveBoard,
  setBoardFavorite,
  renameBoard,
  deleteBoard,
} from "@/lib/actions";
import { tack } from "@/lib/theme";
import TopBar from "./TopBar";
import HomeCommandPalette from "./HomeCommandPalette";

export type BoardTile = {
  id: string;
  name: string;
  role: string;
  cardCount: number;
  favorite: boolean;
  archived: boolean;
};

export default function BoardsHome({
  boards,
  me,
}: {
  boards: BoardTile[];
  me: { name: string | null; email: string | null };
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [template, setTemplate] = useState("default");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [search, setSearch] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const filteredBoards = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return boards;
    return boards.filter((b) => b.name.toLowerCase().includes(needle));
  }, [boards, search]);

  const activeBoards = filteredBoards.filter((b) => !b.archived);
  const archivedBoards = filteredBoards.filter((b) => b.archived);

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
    if (!name.trim() || pending) return;
    setError(null);
    start(async () => {
      const res =
        template === "default"
          ? await createBoard(name.trim())
          : await createBoardFromTemplate(name.trim(), template);
      if (res?.error || !res?.id) {
        setError(res?.error ?? "Couldn't create the board. Try again.");
        return;
      }
      setName("");
      setAdding(false);
      router.push(`/boards/${res.id}`);
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
                {activeBoards.length === 0 && archivedBoards.length === 0
                  ? "Nothing pinned yet. Add your first board."
                  : `${activeBoards.length} ${activeBoards.length === 1 ? "board" : "boards"}`}
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
            {activeBoards.map((b) => (
              <BoardCard key={b.id} board={b} />
            ))}

            {adding ? (
              <div
                className="rounded-xl p-4 flex flex-col gap-3 shadow-sm"
                style={{
                  background: tack.surface,
                  border: `1px solid ${tack.hairline}`,
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
                      setTemplate("default");
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
                {error && (
                  <p className="text-xs" style={{ color: tack.pin }}>
                    {error}
                  </p>
                )}
                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={submit}
                    disabled={pending || !name.trim()}
                    className="text-sm px-3 py-1.5 rounded-md text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: tack.pin }}
                  >
                    {pending ? "Creating…" : "Create"}
                  </button>
                  <button
                    onClick={() => {
                      setAdding(false);
                      setName("");
                      setTemplate("default");
                      setError(null);
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

          {/* Archived */}
          {archivedBoards.length > 0 && (
            <div className="mt-8">
              <button
                onClick={() => setShowArchived((v) => !v)}
                className="flex items-center gap-1.5 text-sm font-meta uppercase tracking-[0.06em]"
                style={{ color: tack.slate }}
              >
                <ChevronDown
                  size={14}
                  style={{ transform: showArchived ? "none" : "rotate(-90deg)", transition: "transform .15s" }}
                />
                Archived ({archivedBoards.length})
              </button>
              {showArchived && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {archivedBoards.map((b) => (
                    <BoardCard key={b.id} board={b} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <HomeCommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        boards={boards.filter((b) => !b.archived)}
        onNewBoard={() => setAdding(true)}
      />
    </div>
  );
}

function BoardCard({ board }: { board: BoardTile }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(board.name);
  const [fav, setFav] = useState(board.favorite);
  const isOwner = board.role === "owner";

  // Stop a control click from following the card's link.
  const stop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const toggleFav = (e: React.MouseEvent) => {
    stop(e);
    const next = !fav;
    setFav(next); // optimistic
    start(async () => {
      await setBoardFavorite(board.id, next);
      router.refresh();
    });
  };

  const doRename = () => {
    const v = name.trim();
    setRenaming(false);
    if (!v || v === board.name) {
      setName(board.name);
      return;
    }
    start(async () => {
      await renameBoard(board.id, v);
      router.refresh();
    });
  };

  const run = (fn: () => Promise<unknown>) => {
    setMenuOpen(false);
    start(async () => {
      await fn();
      router.refresh();
    });
  };

  return (
    <Link
      href={`/boards/${board.id}`}
      className="group relative rounded-xl p-4 flex flex-col gap-3 transition-shadow hover:shadow-md"
      style={{
        background: tack.surface,
        border: `1px solid ${tack.hairline}`,
        minHeight: 132,
        opacity: board.archived ? 0.6 : 1,
      }}
    >
      {/* Pin signature on each board tile. */}
      <span
        className="absolute -top-1 -left-1 h-2.5 w-2.5 rounded-full shadow-sm"
        style={{ background: tack.pin }}
        aria-hidden
      />

      {/* Star + menu, top-right */}
      <div className="absolute top-2.5 right-2.5 flex items-center gap-0.5">
        <button
          onClick={toggleFav}
          className={`p-1 rounded-md hover:bg-black/5 transition-opacity ${
            fav ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
          style={{ color: fav ? tack.pin : tack.slate }}
          title={fav ? "Unstar" : "Star"}
          aria-label={fav ? "Unstar board" : "Star board"}
        >
          <Star size={15} fill={fav ? tack.pin : "none"} />
        </button>
        {isOwner && (
          <button
            onClick={(e) => {
              stop(e);
              setMenuOpen((v) => !v);
            }}
            className="p-1 rounded-md hover:bg-black/5 opacity-0 group-hover:opacity-100"
            style={{ color: tack.slate }}
            aria-label="Board menu"
          >
            <MoreHorizontal size={15} />
          </button>
        )}
      </div>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={stop} aria-hidden />
          <div
            className="absolute z-50 top-10 right-2.5 w-40 rounded-xl shadow-lg p-1"
            style={{ background: tack.surface, border: `1px solid ${tack.hairline}` }}
            onClick={stop}
          >
            <MenuItem
              icon={<Pencil size={14} />}
              label="Rename"
              onClick={() => {
                setMenuOpen(false);
                setRenaming(true);
              }}
            />
            {board.archived ? (
              <MenuItem
                icon={<ArchiveRestore size={14} />}
                label="Unarchive"
                onClick={() => run(() => unarchiveBoard(board.id))}
              />
            ) : (
              <MenuItem
                icon={<Archive size={14} />}
                label="Archive"
                onClick={() => run(() => archiveBoard(board.id))}
              />
            )}
            <MenuItem
              icon={<Trash2 size={14} />}
              label="Delete"
              tone="danger"
              onClick={() => {
                setMenuOpen(false);
                if (confirm(`Delete "${board.name}" and all its cards? This can't be undone.`)) {
                  run(() => deleteBoard(board.id));
                }
              }}
            />
          </div>
        </>
      )}

      {renaming ? (
        <input
          autoFocus
          value={name}
          onClick={stop}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") doRename();
            if (e.key === "Escape") {
              setName(board.name);
              setRenaming(false);
            }
          }}
          onBlur={doRename}
          className="text-lg font-display leading-tight pr-6 bg-transparent outline-none border-b"
          style={{ color: tack.ink, fontWeight: 600, borderColor: tack.hairline }}
        />
      ) : (
        <h2
          className="text-lg font-display leading-tight pr-12"
          style={{ color: tack.ink, fontWeight: 600 }}
        >
          {board.name}
        </h2>
      )}

      <div
        className="mt-auto flex items-center justify-between text-[11px] font-meta uppercase tracking-[0.06em]"
        style={{ color: tack.slate }}
      >
        <span>{board.archived ? "Archived" : board.role}</span>
        <span>
          {board.cardCount} {board.cardCount === 1 ? "card" : "cards"}
        </span>
      </div>
    </Link>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone?: "danger";
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 text-left text-sm px-2.5 py-1.5 rounded-md hover:bg-black/[0.04]"
      style={{ color: tone === "danger" ? tack.pin : tack.ink }}
    >
      {icon}
      {label}
    </button>
  );
}
