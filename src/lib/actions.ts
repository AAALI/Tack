"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CardLink, Priority } from "@/lib/types";

async function db() {
  return await createClient();
}

// ---------- Boards ----------

export async function createBoard(name: string) {
  const supabase = await db();
  const { data, error } = await supabase.rpc("create_board", {
    board_name: name.trim() || "Untitled board",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/boards");
  redirect(`/boards/${data}`);
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

export async function addMember(boardId: string, email: string) {
  const supabase = await db();
  const { error } = await supabase.rpc("add_board_member", {
    board: boardId,
    member_email: email.trim(),
  });
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

export async function updateCard(_boardId: string, cardId: string, patch: CardPatch) {
  const supabase = await db();
  await supabase
    .from("cards")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", cardId);
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
