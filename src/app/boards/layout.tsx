import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Minimal layout: just the auth gate. Each page owns its own TopBar so it can
 * render context-specific controls (home shows nothing extra, board view shows
 * the board name + members chip). No persistent sidebar.
 */
export default async function BoardsLayout({ children }: { children: React.ReactNode }) {
  // Middleware already validates the JWT and redirects unauthenticated users,
  // so reading the cookie session here avoids an extra round-trip to Supabase
  // auth on every navigation under /boards.
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) redirect("/login");

  return <div className="h-screen overflow-hidden">{children}</div>;
}
