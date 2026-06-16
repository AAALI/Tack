"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createBoard } from "@/lib/actions";
import { tack } from "@/lib/theme";
import TopBar from "./TopBar";

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
  const [pending, start] = useTransition();

  const submit = () => {
    if (!name.trim()) return;
    start(async () => {
      await createBoard(name.trim());
      setName("");
      setAdding(false);
    });
  };

  return (
    <div className="h-full flex flex-col" style={{ background: tack.paper }}>
      <TopBar me={me} />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="flex items-end justify-between mb-6">
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map((b) => (
              <BoardCard key={b.id} board={b} />
            ))}

            {adding ? (
              <div
                className="rounded-xl p-4 flex flex-col gap-3"
                style={{
                  background: tack.surface,
                  border: `1px solid ${tack.pin}`,
                  minHeight: 132,
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
