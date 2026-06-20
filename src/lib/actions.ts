"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CardLink, Priority } from "@/lib/types";

async function db() {
  return await createClient();
}

// ---------- Boards ----------

// Returns the new board id (or an error message) rather than redirecting.
// `redirect()` thrown from a Server Action is swallowed when the action is
// awaited inside a React `useTransition` — the navigation never happens, which
// is why board creation appeared to "do nothing". Callers navigate client-side.
export async function createBoard(name: string): Promise<{ id?: string; error?: string }> {
  const supabase = await db();
  const { data, error } = await supabase.rpc("create_board", {
    board_name: name.trim() || "Untitled board",
  });
  if (error) return { error: error.message };
  revalidatePath("/boards");
  return { id: data as string };
}

export async function renameBoard(boardId: string, name: string) {
  const supabase = await db();
  await supabase.from("boards").update({ name: name.trim() || "Board" }).eq("id", boardId);
  revalidatePath(`/boards/${boardId}`);
  revalidatePath("/boards");
}

export async function deleteBoard(boardId: string) {
  const supabase = await db();
  await supabase.from("boards").delete().eq("id", boardId);
  revalidatePath("/boards");
  redirect("/boards");
}

// ---------- Members ----------

export async function addMember(
  boardId: string,
  email: string
): Promise<{ error: string | null; status?: "added" | "invited" }> {
  const supabase = await db();
  const { data, error } = await supabase.rpc("add_board_member", {
    board: boardId,
    member_email: email.trim(),
  });
  if (error) return { error: error.message };
  revalidatePath(`/boards/${boardId}`);
  return { error: null, status: (data as "added" | "invited") ?? "added" };
}

export async function revokeInvite(
  boardId: string,
  email: string
): Promise<{ error: string | null }> {
  const supabase = await db();
  const { error } = await supabase
    .from("board_invites")
    .delete()
    .eq("board_id", boardId)
    .eq("email", email.toLowerCase());
  if (error) return { error: error.message };
  revalidatePath(`/boards/${boardId}`);
  return { error: null };
}

export async function removeMember(boardId: string, userId: string) {
  const supabase = await db();
  await supabase.from("board_members").delete().eq("board_id", boardId).eq("user_id", userId);
  revalidatePath(`/boards/${boardId}`);
}

// ---------- Columns ----------
// NOTE: column/card writes deliberately skip `revalidatePath`. The board UI is
// fully optimistic and listens to Supabase Realtime — re-rendering the whole
// page on every keystroke / drag would be a huge perf hit for no UX gain.

export async function addColumn(boardId: string, position: number) {
  const supabase = await db();
  await supabase.from("columns").insert({ board_id: boardId, title: "New stage", position });
}

export async function renameColumn(_boardId: string, columnId: string, title: string) {
  const supabase = await db();
  await supabase.from("columns").update({ title: title.trim() || "Untitled" }).eq("id", columnId);
}

export async function deleteColumn(_boardId: string, columnId: string) {
  const supabase = await db();
  await supabase.from("columns").delete().eq("id", columnId);
}

// Persist a new column order after a horizontal drag.
export async function reorderColumns(
  _boardId: string,
  updates: { id: string; position: number }[]
) {
  const supabase = await db();
  await Promise.all(
    updates.map((u) =>
      supabase.from("columns").update({ position: u.position }).eq("id", u.id)
    )
  );
}

// ---------- Cards ----------

export async function createCard(
  boardId: string,
  columnId: string,
  title: string,
  position: number
) {
  const supabase = await db();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase.from("cards").insert({
    board_id: boardId,
    column_id: columnId,
    title: title.trim(),
    position,
    created_by: user?.id ?? null,
    assignee: user?.id ?? null,
  });
}

export type CardPatch = {
  title?: string;
  description?: string;
  assignee?: string | null;
  due_date?: string | null;
  priority?: Priority;
  labels?: string[];
  links?: CardLink[];
};

// Optimistic concurrency: when `expectedUpdatedAt` is supplied (modal edits),
// the write only lands if the row still carries that version. A 0-row result
// means someone else saved first — we report a conflict instead of clobbering.
// Inline board actions omit the guard and just overwrite (realtime reconciles).
export async function updateCard(
  _boardId: string,
  cardId: string,
  patch: CardPatch,
  expectedUpdatedAt?: string | null
): Promise<{ conflict: boolean; updated_at?: string }> {
  const supabase = await db();
  let q = supabase
    .from("cards")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", cardId);
  if (expectedUpdatedAt) q = q.eq("updated_at", expectedUpdatedAt);
  const { data, error } = await q.select("updated_at").maybeSingle();
  if (error) return { conflict: false }; // transient/other — let realtime settle
  if (expectedUpdatedAt && !data) return { conflict: true };
  return { conflict: false, updated_at: data?.updated_at };
}

export async function deleteCard(_boardId: string, cardId: string) {
  const supabase = await db();
  await supabase.from("cards").delete().eq("id", cardId);
}

// Persist a new order after a drag. `updates` covers only the moved/affected cards.
export async function reorderCards(
  _boardId: string,
  updates: { id: string; column_id: string; position: number }[]
) {
  const supabase = await db();
  await Promise.all(
    updates.map((u) =>
      supabase.from("cards").update({ column_id: u.column_id, position: u.position }).eq("id", u.id)
    )
  );
}

// ---------- Auth ----------

export async function signOut() {
  const supabase = await db();
  await supabase.auth.signOut();
  redirect("/login");
}

// ---------- Export ----------

export async function exportBoardData(boardId: string) {
  const supabase = await db();
  const [
    { data: board, error: boardErr },
    { data: columns, error: colsErr },
    { data: cards, error: cardsErr },
    { data: members, error: membersErr },
  ] = await Promise.all([
    supabase.from("boards").select("id, name, prefix, created_at").eq("id", boardId).single(),
    supabase.from("columns").select("*").eq("board_id", boardId).order("position"),
    supabase.from("cards").select("*").eq("board_id", boardId).order("position"),
    supabase.from("board_members").select("role, profiles(id, full_name, email)").eq("board_id", boardId),
  ]);
  const firstError = boardErr ?? colsErr ?? cardsErr ?? membersErr;
  if (firstError) throw new Error(firstError.message);
  return { board, columns: columns ?? [], cards: cards ?? [], members: members ?? [] };
}

// ---------- Board templates ----------

export async function createBoardFromTemplate(
  name: string,
  template: string
): Promise<{ id?: string; error?: string }> {
  const supabase = await db();
  const { data: boardId, error } = await supabase.rpc("create_board", {
    board_name: name.trim() || "Untitled board",
  });
  if (error) return { error: error.message };

  const templates: Record<string, string[]> = {
    engineering: ["Backlog", "Up Next", "In Progress", "In Review", "Done"],
    marketing: ["Ideas", "Planned", "In Progress", "Review", "Published"],
    personal: ["To Do", "In Progress", "Done"],
  };

  const cols = templates[template];
  if (cols) {
    // create_board RPC always inserts its own default columns — remove them
    // before seeding the template columns to avoid duplicates.
    await supabase.from("columns").delete().eq("board_id", boardId);
    await Promise.all(
      cols.map((title, position) =>
        supabase.from("columns").insert({ board_id: boardId, title, position })
      )
    );
  }

  revalidatePath("/boards");
  return { id: boardId as string };
}
