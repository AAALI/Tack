import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BoardsHome, { type BoardTile } from "@/components/BoardsHome";

export default async function BoardsIndexPage() {
  const supabase = await createClient();
  // Middleware already validated the session. Read it from the cookie so we
  // don't pay a round-trip to Supabase auth on every page load.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) redirect("/login");

  // Fire all reads in parallel.
  const [{ data: memberships }, { data: allCards }, { data: profile }] = await Promise.all([
    supabase
      .from("board_members")
      .select("role, favorite, boards(id, name, archived_at)")
      .eq("user_id", user.id),
    // RLS scopes this to the user's boards already — a single fetch + JS tally
    // is the cheap path at team scale.
    supabase.from("cards").select("board_id"),
    supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
  ]);

  type Row = {
    role: string;
    favorite: boolean;
    boards: { id: string; name: string; archived_at: string | null } | null;
  };
  const rows = (memberships ?? []) as unknown as Row[];

  const counts = new Map<string, number>();
  for (const c of allCards ?? []) {
    counts.set(c.board_id as string, (counts.get(c.board_id as string) ?? 0) + 1);
  }

  const boards: BoardTile[] = rows
    .filter((r) => r.boards)
    .map((r) => ({
      id: r.boards!.id,
      name: r.boards!.name,
      role: r.role,
      cardCount: counts.get(r.boards!.id) ?? 0,
      favorite: r.favorite ?? false,
      archived: r.boards!.archived_at != null,
    }))
    // Favourites first, then alphabetical.
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name));

  const me = {
    name: profile?.full_name ?? null,
    email: profile?.email ?? user.email ?? null,
  };

  return <BoardsHome boards={boards} me={me} />;
}
