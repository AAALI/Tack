"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { signOut } from "@/lib/actions";
import { tack } from "@/lib/theme";
import Avatar from "./Avatar";
import { ThemeToggle } from "./ThemeProvider";

export default function UserMenu({
  name,
  email,
}: {
  name: string | null;
  email: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label = name ?? email ?? "Me";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-full"
        aria-label="Account menu"
        aria-expanded={open}
      >
        <Avatar name={label} size={30} />
      </button>
      {open && (
        <div
          className="absolute right-0 mt-2 w-56 rounded-xl shadow-lg p-1 z-50"
          style={{ background: tack.surface, border: `1px solid ${tack.hairline}` }}
        >
          <div className="px-3 py-2">
            <p className="text-sm truncate" style={{ color: tack.ink, fontWeight: 500 }}>
              {label}
            </p>
            {email && name && (
              <p className="text-xs truncate font-meta" style={{ color: tack.slate }}>
                {email}
              </p>
            )}
          </div>
          <div className="h-px mx-2 my-1" style={{ background: tack.hairline }} />
          <ThemeToggle />
          <div className="h-px mx-2 my-1" style={{ background: tack.hairline }} />
          <form action={signOut}>
            <button
              type="submit"
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-black/[0.03]"
              style={{ color: tack.ink }}
            >
              <LogOut size={14} style={{ color: tack.slate }} /> Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
