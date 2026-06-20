"use client";

import { useEffect, useState } from "react";
import { X, Trash2, Plus, ExternalLink, Link2 } from "lucide-react";
import {
  THEME,
  tack,
  PRIORITY_COLOR,
  timeAgo,
  type Card as TCard,
  type CardEvent,
  type CardLink,
  type Member,
  type Priority,
} from "@/lib/types";
import type { CardPatch } from "@/lib/actions";
import { createClient } from "@/lib/supabase/client";
import Avatar from "./Avatar";
import { useToast } from "./Toast";

function describeEvent(ev: CardEvent, actorName: string): string {
  switch (ev.kind) {
    case "created":
      return `${actorName} created this card`;
    case "moved":
      return `${actorName} moved this from ${ev.payload.from ?? "—"} to ${ev.payload.to ?? "—"}`;
    case "updated":
      return `${actorName} updated ${(ev.payload.fields ?? []).join(", ") || "this card"}`;
  }
}

const PRIORITIES: Priority[] = ["none", "low", "medium", "high"];

export default function CardModal({
  card,
  members,
  boardPrefix,
  onSave,
  onDelete,
  onClose,
}: {
  card: TCard;
  members: Member[];
  boardPrefix: string;
  onSave: (patch: CardPatch) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [assignee, setAssignee] = useState<string | null>(card.assignee);
  const [due, setDue] = useState<string>(card.due_date ?? "");
  const [priority, setPriority] = useState<Priority>(card.priority);
  const [labels, setLabels] = useState<string[]>(card.labels);
  const [links, setLinks] = useState<CardLink[]>(card.links);
  const [labelDraft, setLabelDraft] = useState("");
  const [events, setEvents] = useState<CardEvent[]>([]);
  const toast = useToast();

  // Activity log. Optimistic temp cards (tmp_…) have no server row yet, so
  // there's nothing to fetch. Refetch on any card_events change for this card.
  const isPersisted = !card.id.startsWith("tmp_");
  useEffect(() => {
    if (!isPersisted) return;
    const supabase = createClient();
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("card_events")
        .select("*")
        .eq("card_id", card.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (!cancelled && data) setEvents(data as CardEvent[]);
    };
    load();
    const channel = supabase
      .channel(`card_events:${card.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "card_events", filter: `card_id=eq.${card.id}` },
        load
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [card.id, isPersisted]);

  const actorName = (id: string | null): string => {
    if (!id) return "Someone";
    const m = members.find((x) => x.user_id === id);
    return m?.full_name ?? m?.email ?? "Someone";
  };

  const copyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}?card=${card.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast(
        card.number !== null ? `Link to ${boardPrefix}-${card.number} copied` : "Link copied",
        "success"
      );
    } catch {
      toast("Couldn't copy the link", "error");
    }
  };

  const commit = (extra: CardPatch = {}) =>
    onSave({
      title: title.trim() || "Untitled",
      description,
      assignee,
      due_date: due || null,
      priority,
      labels,
      links: links.filter((l) => l.url.trim()),
      ...extra,
    });

  const close = () => {
    commit();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
      style={{ background: "rgba(27,27,31,0.35)" }}
      onClick={close}
    >
      <div
        className="w-full max-w-lg rounded-2xl shadow-xl my-8"
        style={{ background: tack.surface, border: `1px solid ${tack.hairline}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5">
          <div className="flex items-center gap-2 mb-1">
            {card.number !== null && (
              <p
                className="font-meta text-[11px] tracking-[0.08em] uppercase"
                style={{ color: tack.slate }}
              >
                {boardPrefix}-{card.number}
              </p>
            )}
            <button
              onClick={copyLink}
              className="flex items-center gap-1 font-meta text-[11px] uppercase tracking-[0.08em] hover:opacity-70"
              style={{ color: tack.slate }}
              title="Copy link to this card"
            >
              <Link2 size={12} /> Copy link
            </button>
          </div>
          <div className="flex items-start justify-between gap-3">
            <textarea
              rows={2}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 text-lg font-display resize-none outline-none bg-transparent"
              style={{ color: tack.ink, fontWeight: 600 }}
            />
            <button onClick={close} className="p-1 rounded hover:bg-black/5" style={{ color: THEME.muted }}>
              <X size={16} />
            </button>
          </div>

          {/* Description */}
          <label className="block text-[11px] font-meta uppercase tracking-[0.08em] mt-4 mb-1.5" style={{ color: THEME.muted }}>
            Notes
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Context, acceptance criteria, decisions…"
            className="w-full rounded-md px-3 py-2 text-sm outline-none border resize-none"
            style={{ borderColor: THEME.hair, color: THEME.ink }}
          />

          {/* Links */}
          <label className="block text-[11px] font-meta uppercase tracking-[0.08em] mt-4 mb-1.5" style={{ color: THEME.muted }}>
            Links
          </label>
          <div className="space-y-2">
            {links.map((l, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={l.label}
                  onChange={(e) =>
                    setLinks(links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                  }
                  placeholder="Label"
                  className="w-28 rounded-md px-2 py-1.5 text-sm outline-none border shrink-0"
                  style={{ borderColor: THEME.hair }}
                />
                <input
                  value={l.url}
                  onChange={(e) =>
                    setLinks(links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))
                  }
                  placeholder="https://…"
                  className="flex-1 rounded-md px-2 py-1.5 text-sm outline-none border min-w-0"
                  style={{ borderColor: THEME.hair }}
                />
                {l.url && (
                  <a href={l.url} target="_blank" rel="noreferrer" style={{ color: THEME.muted }}>
                    <ExternalLink size={15} />
                  </a>
                )}
                <button
                  onClick={() => setLinks(links.filter((_, j) => j !== i))}
                  style={{ color: THEME.muted }}
                >
                  <X size={15} />
                </button>
              </div>
            ))}
            <button
              onClick={() => setLinks([...links, { label: "", url: "" }])}
              className="flex items-center gap-1.5 text-sm"
              style={{ color: tack.pin }}
            >
              <Plus size={14} /> Add link
            </button>
          </div>

          {/* Labels */}
          <label className="block text-[11px] font-meta uppercase tracking-[0.08em] mt-4 mb-1.5" style={{ color: THEME.muted }}>
            Labels
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            {labels.map((l, i) => (
              <span
                key={i}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
                style={{ background: tack.wash, color: tack.ink }}
              >
                {l}
                <button onClick={() => setLabels(labels.filter((_, j) => j !== i))}>
                  <X size={11} />
                </button>
              </span>
            ))}
            <input
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && labelDraft.trim()) {
                  setLabels([...labels, labelDraft.trim()]);
                  setLabelDraft("");
                }
              }}
              placeholder="+ label"
              className="text-xs px-2 py-1 rounded-full border outline-none"
              style={{ borderColor: THEME.hair, width: 90 }}
            />
          </div>

          {/* Assignee */}
          <label className="block text-[11px] font-meta uppercase tracking-[0.08em] mt-4 mb-1.5" style={{ color: THEME.muted }}>
            Assignee
          </label>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setAssignee(null)}
              className="text-xs px-2.5 py-1 rounded-full border"
              style={{ borderColor: assignee === null ? tack.pin : THEME.hair, color: THEME.muted }}
            >
              Unassigned
            </button>
            {members.map((m) => {
              const label = m.full_name ?? m.email ?? "Unknown";
              const on = assignee === m.user_id;
              return (
                <button
                  key={m.user_id}
                  onClick={() => setAssignee(m.user_id)}
                  className="flex items-center gap-1.5 text-xs pl-1 pr-2.5 py-1 rounded-full border"
                  style={{ borderColor: on ? tack.pin : THEME.hair, color: THEME.ink }}
                >
                  <Avatar name={label} size={16} />
                  {label}
                </button>
              );
            })}
          </div>

          {/* Due + priority */}
          <div className="flex gap-6 mt-4">
            <div>
              <label className="block text-[11px] font-meta uppercase tracking-[0.08em] mb-1.5" style={{ color: THEME.muted }}>
                Due date
              </label>
              <input
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                className="rounded-md px-2 py-1.5 text-sm outline-none border"
                style={{ borderColor: THEME.hair, color: THEME.ink }}
              />
            </div>
            <div>
              <label className="block text-[11px] font-meta uppercase tracking-[0.08em] mb-1.5" style={{ color: THEME.muted }}>
                Priority
              </label>
              <div className="flex gap-1">
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className="text-xs px-2 py-1 rounded-md border capitalize"
                    style={{
                      borderColor: priority === p ? PRIORITY_COLOR[p] : THEME.hair,
                      color: priority === p ? PRIORITY_COLOR[p] : THEME.muted,
                      fontWeight: priority === p ? 600 : 400,
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Activity */}
          {isPersisted && events.length > 0 && (
            <>
              <label className="block text-[11px] font-meta uppercase tracking-[0.08em] mt-5 mb-2" style={{ color: THEME.muted }}>
                Activity
              </label>
              <ul className="space-y-2">
                {events.map((ev) => (
                  <li key={ev.id} className="flex items-start gap-2 text-xs" style={{ color: tack.slate }}>
                    <span
                      className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ background: tack.hairline }}
                      aria-hidden
                    />
                    <span className="flex-1 leading-snug">
                      <span style={{ color: tack.ink }}>{describeEvent(ev, actorName(ev.actor))}</span>
                      <span className="font-meta"> · {timeAgo(ev.created_at)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="flex justify-between items-center mt-6">
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 text-sm"
              style={{ color: tack.slate }}
            >
              <Trash2 size={14} /> Delete
            </button>
            <button
              onClick={close}
              className="text-sm px-4 py-2 rounded-lg text-white font-medium"
              style={{ background: tack.pin }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
