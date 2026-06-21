"use client";

import { memo, useEffect, useRef, useState, type SyntheticEvent } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronLeft, ChevronRight, Link2, CalendarDays, UserPlus, Check } from "lucide-react";
import { tack, PRIORITY_COLOR, type Card as TCard, type Member } from "@/lib/types";
import Avatar from "./Avatar";

function memberName(members: Member[], id: string | null) {
  if (!id) return null;
  const m = members.find((x) => x.user_id === id);
  return m?.full_name ?? m?.email ?? null;
}

function fmtDate(d: string | null) {
  if (!d) return null;
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function CardItemImpl({
  card,
  members,
  boardPrefix,
  isFirst,
  isLast,
  onClick,
  onMove,
  onAssign,
  currentUserId,
}: {
  card: TCard;
  members: Member[];
  boardPrefix: string;
  isFirst: boolean;
  isLast: boolean;
  onClick: () => void;
  onMove: (dir: -1 | 1) => void;
  onAssign: (userId: string | null) => void;
  currentUserId: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });

  const assigneeName = memberName(members, card.assignee);
  const due = fmtDate(card.due_date);

  return (
    <div
      ref={setNodeRef}
      // Make the whole card the drag handle + click target. dnd-kit's 6px
      // distance constraint cleanly separates a click from a drag.
      {...attributes}
      {...listeners}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        background: tack.surface,
        border: `1px solid ${tack.hairline}`,
        boxShadow: "0 1px 0 rgba(27,27,31,0.03)",
      }}
      className="relative rounded-xl p-3 group cursor-pointer hover:border-[color:var(--ink)]/15 transition-colors"
    >
      {/* priority Pin — kept fully inside the card so it can't be clipped by
          the column's overflow container. */}
      {card.priority !== "none" && (
        <span
          className="absolute top-1.5 left-1.5 h-2 w-2 rounded-full tack-in"
          style={{ background: PRIORITY_COLOR[card.priority] }}
          title={`${card.priority} priority`}
          aria-label={`${card.priority} priority`}
        />
      )}
      {/* Per-board identifier, e.g. `ENG-42`. Quiet meta type, top-right.
          Hidden until the server trigger has assigned a number. */}
      {card.number !== null && (
        <span
          className="absolute top-1.5 right-2 font-meta text-[10px] tracking-[0.04em] select-none"
          style={{ color: tack.slate }}
          aria-label={`Card ${boardPrefix}-${card.number}`}
        >
          {boardPrefix}-{card.number}
        </span>
      )}
      {/* labels */}
      {card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5 pl-3.5">
          {card.labels.map((l, i) => (
            <span
              key={i}
              className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={{ background: tack.wash, color: tack.slate }}
            >
              {l}
            </span>
          ))}
        </div>
      )}

      {/* title */}
      <p
        className={`text-sm leading-snug ${card.priority !== "none" ? "pl-3.5" : ""}`}
        style={{ color: tack.ink, fontWeight: 500 }}
      >
        {card.title}
      </p>

      {/* meta row */}
      <div className="flex items-center gap-2.5 mt-2 text-[11px]" style={{ color: tack.slate }}>
        {due && (
          <span className="flex items-center gap-1 font-meta uppercase">
            <CalendarDays size={12} />
            {due}
          </span>
        )}
        {card.links.length > 0 && (
          <span className="flex items-center gap-1 font-meta">
            <Link2 size={12} />
            {card.links.length}
          </span>
        )}
        <span className="flex-1" />
        <AssignPicker
          card={card}
          members={members}
          currentUserId={currentUserId}
          assigneeName={assigneeName}
          onAssign={onAssign}
        />
      </div>

      {/* mobile-friendly move controls — hidden on fine pointers (BRAND: keep it calm). */}
      <div
        className="flex items-center justify-end gap-0.5 mt-1 [@media(pointer:fine)]:hidden"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          disabled={isFirst}
          onClick={() => onMove(-1)}
          className="p-1 rounded hover:bg-black/5 disabled:opacity-20"
          style={{ color: tack.slate }}
          title="Move left"
          aria-label="Move card left"
        >
          <ChevronLeft size={14} />
        </button>
        <button
          disabled={isLast}
          onClick={() => onMove(1)}
          className="p-1 rounded hover:bg-black/5 disabled:opacity-20"
          style={{ color: tack.slate }}
          title="Move right"
          aria-label="Move card right"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// Memoized so unrelated parent re-renders (e.g. opening the modal, typing in
// the filter chips) don't re-render every card on the board.
const CardItem = memo(CardItemImpl);
export default CardItem;

// ---- Quick-assign popover ---------------------------------------------------

export function AssignPicker({
  card,
  members,
  currentUserId,
  assigneeName,
  onAssign,
}: {
  card: TCard;
  members: Member[];
  currentUserId: string;
  assigneeName: string | null;
  onAssign: (userId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (!r) return;
      // Anchor menu bottom-right against the trigger.
      setPos({ left: Math.max(8, r.right - 200), top: r.bottom + 6 });
    };
    place();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  const stop = (e: SyntheticEvent) => {
    e.stopPropagation();
  };

  return (
    <>
      <button
        ref={btnRef}
        onPointerDown={stop}
        onMouseDown={stop}
        onClick={(e) => {
          stop(e);
          setOpen((v) => !v);
        }}
        className="rounded-full transition-transform hover:scale-105 focus:outline-none"
        title={assigneeName ? `Assigned to ${assigneeName} — click to change` : "Assign someone"}
        aria-label="Assign"
      >
        {assigneeName ? (
          <Avatar name={assigneeName} size={20} />
        ) : (
          <span
            className="flex items-center justify-center h-5 w-5 rounded-full border border-dashed"
            style={{ borderColor: tack.hairline, color: tack.slate }}
          >
            <UserPlus size={11} />
          </span>
        )}
      </button>
      {open && pos && (
        <div
          ref={menuRef}
          onClick={stop}
          onPointerDown={stop}
          onMouseDown={stop}
          className="fixed w-56 rounded-xl shadow-lg p-1 z-50 max-h-72 overflow-y-auto"
          style={{
            left: pos.left,
            top: pos.top,
            background: tack.surface,
            border: `1px solid ${tack.hairline}`,
          }}
        >
          <div
            className="px-2 py-1 text-[10px] font-meta uppercase tracking-[0.08em]"
            style={{ color: tack.slate }}
          >
            Assign
          </div>
          {currentUserId && card.assignee !== currentUserId && (
            <AssignRow
              label="Assign to me"
              onClick={() => {
                onAssign(currentUserId);
                setOpen(false);
              }}
            />
          )}
          {members.map((m) => {
            const name = m.full_name ?? m.email ?? "Unknown";
            const active = card.assignee === m.user_id;
            return (
              <button
                key={m.user_id}
                onClick={() => {
                  onAssign(active ? null : m.user_id);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 text-left text-sm px-2 py-1.5 rounded-md hover:bg-black/[0.04]"
                style={{ color: tack.ink }}
              >
                <Avatar name={name} size={20} />
                <span className="flex-1 truncate">{name}</span>
                {active && <Check size={13} style={{ color: tack.pin }} />}
              </button>
            );
          })}
          {card.assignee && (
            <>
              <div className="my-1 h-px" style={{ background: tack.hairline }} />
              <AssignRow
                label="Unassign"
                tone="danger"
                onClick={() => {
                  onAssign(null);
                  setOpen(false);
                }}
              />
            </>
          )}
        </div>
      )}
    </>
  );
}

function AssignRow({
  label,
  onClick,
  tone,
}: {
  label: string;
  onClick: () => void;
  tone?: "danger";
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left text-sm px-2 py-1.5 rounded-md hover:bg-black/[0.04]"
      style={{ color: tone === "danger" ? tack.pin : tack.ink }}
    >
      {label}
    </button>
  );
}
