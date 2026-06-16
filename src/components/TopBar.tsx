"use client";

import Link from "next/link";
import { tack } from "@/lib/theme";
import TackMark from "./TackMark";
import UserMenu from "./UserMenu";

/**
 * Single source of truth for the top chrome. No persistent sidebar — instead,
 * every page renders a TopBar with the same skeleton:
 *   [ tack mark (link home) | centerSlot ........... | rightSlot | user menu ]
 *
 * The board page passes the board name + members chip into the center / right
 * slots; the home page leaves them empty.
 */
export default function TopBar({
  me,
  centerSlot,
  rightSlot,
  homeHref = "/boards",
}: {
  me: { name: string | null; email: string | null };
  centerSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  homeHref?: string;
}) {
  return (
    <header
      className="flex items-center gap-4 px-5 h-14 shrink-0"
      style={{ borderBottom: `1px solid ${tack.hairline}`, background: tack.surface }}
    >
      <Link href={homeHref} className="shrink-0" aria-label="Tack home">
        <TackMark size={24} withWordmark />
      </Link>
      <div className="flex-1 min-w-0 flex items-center">{centerSlot}</div>
      <div className="flex items-center gap-3 shrink-0">
        {rightSlot}
        <UserMenu name={me.name} email={me.email} />
      </div>
    </header>
  );
}
