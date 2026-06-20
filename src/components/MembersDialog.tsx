"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { X, UserPlus, Clock } from "lucide-react";
import { addMember, removeMember, revokeInvite } from "@/lib/actions";
import { THEME, tack, type Member } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import Avatar from "./Avatar";
import { useToast } from "./Toast";

type Invite = { email: string; created_at: string };

export default function MembersDialog({
  boardId,
  members,
  isOwner,
  currentUserId,
  onClose,
}: {
  boardId: string;
  members: Member[];
  isOwner: boolean;
  currentUserId: string;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [invites, setInvites] = useState<Invite[]>([]);
  const [pending, start] = useTransition();
  const toast = useToast();

  const loadInvites = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("board_invites")
      .select("email, created_at")
      .eq("board_id", boardId)
      .order("created_at", { ascending: false });
    setInvites((data as Invite[]) ?? []);
  }, [boardId]);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  const add = () => {
    setError("");
    const target = email.trim();
    if (!target) return;
    start(async () => {
      const res = await addMember(boardId, target);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setEmail("");
      if (res.status === "invited") {
        toast(`Invited ${target} — they'll join when they sign in`, "success");
        loadInvites();
      } else {
        toast(`Added ${target} to the board`, "success");
      }
    });
  };

  const revoke = (inviteEmail: string) => {
    const removed = invites.find((i) => i.email === inviteEmail);
    setInvites((prev) => prev.filter((i) => i.email !== inviteEmail));
    start(async () => {
      const res = await revokeInvite(boardId, inviteEmail);
      if (res?.error) {
        // Restore the optimistically-removed invite so the UI matches the server.
        if (removed) setInvites((prev) => [removed, ...prev.filter((i) => i.email !== inviteEmail)]);
        toast(`Couldn't revoke invite for ${inviteEmail}`, "error");
        return;
      }
      toast(`Revoked invite for ${inviteEmail}`, "info");
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(27,27,31,0.35)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl shadow-xl p-5"
        style={{ background: tack.surface, border: `1px solid ${tack.hairline}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display" style={{ color: tack.ink, fontWeight: 600 }}>
            Board members
          </h3>
          <button onClick={onClose} style={{ color: THEME.muted }}>
            <X size={16} />
          </button>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {members.map((m) => {
            const label = m.full_name ?? m.email ?? "Unknown";
            return (
              <div key={m.user_id} className="flex items-center gap-2">
                <Avatar name={label} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate" style={{ color: THEME.ink }}>
                    {label}
                  </p>
                  <p className="text-[11px] font-meta uppercase tracking-[0.06em]" style={{ color: THEME.muted }}>
                    {m.role}
                  </p>
                </div>
                {isOwner && m.user_id !== currentUserId && m.role !== "owner" && (
                  <button
                    onClick={() => removeMember(boardId, m.user_id)}
                    className="text-xs"
                    style={{ color: tack.pin }}
                  >
                    Remove
                  </button>
                )}
              </div>
            );
          })}

          {invites.map((inv) => (
            <div key={inv.email} className="flex items-center gap-2">
              <span
                className="flex items-center justify-center rounded-full shrink-0"
                style={{ width: 28, height: 28, background: tack.wash, color: tack.slate }}
              >
                <Clock size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm truncate" style={{ color: THEME.ink }}>
                  {inv.email}
                </p>
                <p className="text-[11px] font-meta uppercase tracking-[0.06em]" style={{ color: THEME.muted }}>
                  Pending invite
                </p>
              </div>
              {isOwner && (
                <button
                  onClick={() => revoke(inv.email)}
                  className="text-xs"
                  style={{ color: tack.pin }}
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>

        {isOwner && (
          <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${THEME.hair}` }}>
            <label className="block text-[11px] font-meta uppercase tracking-[0.08em] mb-1" style={{ color: THEME.muted }}>
              Add by email
            </label>
            <p className="text-xs mb-2" style={{ color: THEME.muted }}>
              Already have an account? They join instantly. Otherwise we hold the
              invite until they sign in.
            </p>
            <div className="flex gap-2">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && add()}
                placeholder="teammate@company.com"
                className="flex-1 rounded-md px-2 py-1.5 text-sm outline-none border min-w-0"
                style={{ borderColor: THEME.hair }}
              />
              <button
                onClick={add}
                disabled={pending}
                className="flex items-center gap-1 text-sm px-3 rounded-md text-white font-medium disabled:opacity-60"
                style={{ background: tack.pin }}
                aria-label="Add member"
              >
                <UserPlus size={14} />
              </button>
            </div>
            {error && (
              <p className="text-xs mt-2" style={{ color: tack.pin }}>
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
