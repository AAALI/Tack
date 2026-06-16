"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, LogOut } from "lucide-react";
import { createBoard, signOut } from "@/lib/actions";
import { THEME, tack, type BoardSummary } from "@/lib/types";
import Avatar from "./Avatar";
import TackMark from "./TackMark";

export default function Sidebar({
  boards,
  me,
}: {
  boards: BoardSummary[];
  me: { name: string | null; email: string | null };
}) {
  const pathname = usePathname();
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
    <aside
      className="w-60 shrink-0 flex flex-col h-full"
      style={{ background: THEME.surface, borderRight: `1px solid ${THEME.hair}` }}
    >
      <div className="flex items-center gap-2 px-4 py-4">
        <TackMark size={26} withWordmark />
      </div>

      <div className="px-3 flex-1 overflow-y-auto">
        <p
          className="text-[11px] font-meta uppercase tracking-[0.08em] px-2 mb-1.5"
          style={{ color: THEME.muted }}
        >
          Boards
        </p>
        <nav className="space-y-0.5">
          {boards.map((b) => {
            const active = pathname === `/boards/${b.id}`;
            return (
              <Link
                key={b.id}
                href={`/boards/${b.id}`}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm"
                style={{
                  background: active ? tack.wash : "transparent",
                  color: tack.ink,
                  fontWeight: active ? 600 : 400,
                }}
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ background: active ? tack.pin : tack.hairline }}
                  aria-hidden
                />
                <span className="truncate">{b.name}</span>
              </Link>
            );
          })}
          {boards.length === 0 && (
            <p className="text-sm px-2 py-1.5" style={{ color: THEME.muted }}>
              No boards yet.
            </p>
          )}
        </nav>

        {adding ? (
          <div className="mt-2 px-2">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
                if (e.key === "Escape") setAdding(false);
              }}
              placeholder="Name this board"
              className="w-full rounded-md px-2 py-1.5 text-sm outline-none border"
              style={{ borderColor: tack.pin }}
            />
            <div className="flex gap-2 mt-1.5">
              <button
                onClick={submit}
                disabled={pending}
                className="text-xs px-2.5 py-1 rounded-md text-white font-medium disabled:opacity-60"
                style={{ background: tack.pin }}
              >
                {pending ? "Creating…" : "Create"}
              </button>
              <button
                onClick={() => setAdding(false)}
                className="text-xs px-2 py-1 rounded-md"
                style={{ color: THEME.muted }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="mt-2 w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm hover:bg-black/5"
            style={{ color: THEME.muted }}
          >
            <Plus size={15} /> New board
          </button>
        )}
      </div>

      <div className="p-3" style={{ borderTop: `1px solid ${THEME.hair}` }}>
        <div className="flex items-center gap-2 px-1">
          <Avatar name={me.name ?? me.email} size={28} />
          <div className="min-w-0 flex-1">
            <p className="text-sm truncate" style={{ color: THEME.ink }}>
              {me.name ?? me.email}
            </p>
          </div>
          <form action={signOut}>
            <button
              className="p-1.5 rounded-md hover:bg-black/5"
              style={{ color: THEME.muted }}
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
