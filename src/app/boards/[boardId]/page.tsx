import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Board from "@/components/Board";
import type { Card, Column, Member } from "@/lib/types";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  const supabase = await createClient();

  // Middleware already verified the JWT and redirected unauthenticated users,
  // so reading the session from the cookie here avoids an extra round-trip to
  // Supabase auth on every board load. We still need user.id for ownership /
  // "me" computation below.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) redirect("/login");

  // Fire all board-scoped reads in parallel. They're independent and RLS makes
  // any of them safe to attempt even if the board id is bogus / not a member.
  const [
    { data: board, error: boardErr },
    { data: columns },
    { data: cards },
    { data: memberRows },
  ] = await Promise.all([
    // .maybeSingle() returns { data: null, error: null } on zero rows.
    supabase.from("boards").select("id, name, prefix").eq("id", boardId).maybeSingle(),
    supabase.from("columns").select("*").eq("board_id", boardId).order("position"),
    supabase.from("cards").select("*").eq("board_id", boardId).order("position"),
    supabase.from("board_members").select("user_id, role").eq("board_id", boardId),
  ]);

  if (boardErr) {
    console.error("[boards/[boardId]] select error:", {
      message: boardErr.message,
      code: boardErr.code,
      details: boardErr.details,
      hint: boardErr.hint,
    });
    throw new Error(`Supabase: ${boardErr.message} (code ${boardErr.code})`);
  }
  if (!board) {
    // Either the id is wrong or RLS hid it (cookie/session race after create).
    // Send the user back to the index rather than a hard 404; the layout
    // refetches their membership list and they can click in again.
    console.warn("[boards/[boardId]] no row visible for", boardId, "as", user.id);
    redirect("/boards");
  }

  // Merge member profiles (no direct FK between board_members and profiles).
  const ids = (memberRows ?? []).map((m) => m.user_id);
  const { data: profiles } = ids.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", ids)
    : { data: [] as { id: string; full_name: string | null; email: string | null }[] };

  const members: Member[] = (memberRows ?? []).map((m) => {
    const p = (profiles ?? []).find((x) => x.id === m.user_id);
    return {
      user_id: m.user_id,
      role: m.role as Member["role"],
      full_name: p?.full_name ?? null,
      email: p?.email ?? null,
    };
  });

  const isOwner = members.some((m) => m.user_id === user.id && m.role === "owner");

  const myProfile = (profiles ?? []).find((p) => p.id === user.id);
  const me = {
    name: myProfile?.full_name ?? null,
    email: myProfile?.email ?? user.email ?? null,
  };

  return (
    <Board
      boardId={board.id}
      boardName={board.name}
      boardPrefix={board.prefix}
      initialColumns={(columns ?? []) as Column[]}
      initialCards={(cards ?? []) as Card[]}
      members={members}
      currentUserId={user.id}
      isOwner={isOwner}
      me={me}
    />
  );
}
