"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, GripVertical, CalendarDays, Link2, Plus } from "lucide-react";
import {
  tack,
  PRIORITY_COLOR,
  type Card as TCard,
  type Column as TColumn,
  type Member,
  type Priority,
} from "@/lib/types";
import type { CardPatch } from "@/lib/actions";
import { AssignPicker } from "./Card";

export type ListGroup = "status" | "assignee" | "priority" | "due";
export type ListSort = "manual" | "due" | "priority" | "created";

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2, none: 3 };
const PRIORITY_LABEL: Record<Priority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
  none: "No priority",
};

function fmtDate(d: string | null) {
  if (!d) return null;
  return new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function dueBucket(d: string | null): { key: string; label: string; order: number } {
  if (!d) return { key: "none", label: "No date", order: 4 };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((new Date(d + "T00:00:00").getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { key: "overdue", label: "Overdue", order: 0 };
  if (diff === 0) return { key: "today", label: "Today", order: 1 };
  if (diff <= 7) return { key: "week", label: "This week", order: 2 };
  return { key: "later", label: "Later", order: 3 };
}

type Group = { key: string; label: string; columnId?: string; cards: TCard[] };

// The list shares the board's data model: `cards` arrives already filtered and
// in board order. `manual` sort preserves that order (so drag-reorder stays
// truthful); any other sort re-orders within each group.
function buildGroups(
  cards: TCard[],
  columns: TColumn[],
  members: Member[],
  group: ListGroup,
  sort: ListSort
): Group[] {
  const colIndex = new Map(columns.map((c, i) => [c.id, i]));
  const cmp = (a: TCard, b: TCard): number => {
    if (sort === "due") {
      if (a.due_date && b.due_date && a.due_date !== b.due_date) return a.due_date < b.due_date ? -1 : 1;
      if (!a.due_date && b.due_date) return 1;
      if (a.due_date && !b.due_date) return -1;
    } else if (sort === "priority") {
      if (PRIORITY_RANK[a.priority] !== PRIORITY_RANK[b.priority])
        return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    } else if (sort === "created") {
      if (a.created_at !== b.created_at) return a.created_at > b.created_at ? -1 : 1; // newest first
    }
    const ci = (colIndex.get(a.column_id) ?? 0) - (colIndex.get(b.column_id) ?? 0);
    return ci !== 0 ? ci : a.position - b.position;
  };

  let groups: Group[] = [];
  if (group === "status") {
    groups = columns.map((c) => ({
      key: c.id,
      label: c.title,
      columnId: c.id,
      cards: cards.filter((x) => x.column_id === c.id),
    }));
  } else if (group === "assignee") {
    const byId = new Map<string, TCard[]>();
    const unassigned: TCard[] = [];
    for (const c of cards) {
      if (!c.assignee) unassigned.push(c);
      else (byId.get(c.assignee) ?? byId.set(c.assignee, []).get(c.assignee)!).push(c);
    }
    for (const m of members) {
      const list = byId.get(m.user_id);
      if (list?.length)
        groups.push({ key: m.user_id, label: m.full_name ?? m.email ?? "Unknown", cards: list });
    }
    if (unassigned.length) groups.push({ key: "__none__", label: "Unassigned", cards: unassigned });
  } else if (group === "priority") {
    for (const p of ["high", "medium", "low", "none"] as Priority[]) {
      const list = cards.filter((c) => c.priority === p);
      if (list.length) groups.push({ key: p, label: PRIORITY_LABEL[p], cards: list });
    }
  } else {
    const buckets = new Map<string, { label: string; order: number; cards: TCard[] }>();
    for (const c of cards) {
      const b = dueBucket(c.due_date);
      const e = buckets.get(b.key) ?? { label: b.label, order: b.order, cards: [] };
      e.cards.push(c);
      buckets.set(b.key, e);
    }
    groups = [...buckets.values()]
      .sort((a, b) => a.order - b.order)
      .map((v) => ({ key: v.label, label: v.label, cards: v.cards }));
  }

  if (sort !== "manual") for (const g of groups) g.cards = [...g.cards].sort(cmp);
  return groups;
}

export default function ListView({
  columns,
  cards,
  members,
  boardPrefix,
  currentUserId,
  group,
  sort,
  dragging = false,
  onCardClick,
  onPatchCard,
  onAddCard,
}: {
  columns: TColumn[];
  cards: TCard[]; // already filtered + in board order
  members: Member[];
  boardPrefix: string;
  currentUserId: string;
  group: ListGroup;
  sort: ListSort;
  dragging?: boolean;
  onCardClick: (card: TCard) => void;
  onPatchCard: (cardId: string, patch: CardPatch) => void;
  onAddCard: (columnId: string, title: string) => void;
}) {
  // Drag is only truthful when the visual order is the stored order, i.e.
  // grouped by status with manual sort. Otherwise rows are static and status
  // changes happen in the card modal.
  const draggable = group === "status" && sort === "manual";
  const groups = buildGroups(cards, columns, members, group, sort);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {groups.map((g) => (
          <Section
            key={g.key}
            group={g}
            draggable={draggable}
            dragging={dragging}
            collapsed={collapsed.has(g.key)}
            onToggle={() => toggle(g.key)}
            members={members}
            boardPrefix={boardPrefix}
            currentUserId={currentUserId}
            onCardClick={onCardClick}
            onPatchCard={onPatchCard}
            onAddCard={onAddCard}
          />
        ))}
      </div>
    </div>
  );
}

function Section({
  group,
  draggable,
  dragging,
  collapsed,
  onToggle,
  members,
  boardPrefix,
  currentUserId,
  onCardClick,
  onPatchCard,
  onAddCard,
}: {
  group: Group;
  draggable: boolean;
  dragging: boolean;
  collapsed: boolean;
  onToggle: () => void;
  members: Member[];
  boardPrefix: string;
  currentUserId: string;
  onCardClick: (card: TCard) => void;
  onPatchCard: (cardId: string, patch: CardPatch) => void;
  onAddCard: (columnId: string, title: string) => void;
}) {
  // A droppable per status group so cards can be dragged into it (incl. empty).
  const { setNodeRef, isOver } = useDroppable({
    id: `col:${group.columnId}`,
    data: { type: "column-drop", columnId: group.columnId },
    disabled: !draggable || !group.columnId,
  });

  // Cards/droppable hide when collapsed — but a drag temporarily expands every
  // group so you can always drop into one. "Add card" stays available even
  // while collapsed (it's inside the contained block below).
  const expanded = !collapsed || dragging;
  const Chevron = collapsed ? ChevronRight : ChevronDown;
  const hasBlock = expanded || !!group.columnId;

  const rows = group.cards.map((card) =>
    draggable ? (
      <SortableRow
        key={card.id}
        card={card}
        members={members}
        boardPrefix={boardPrefix}
        currentUserId={currentUserId}
        onCardClick={onCardClick}
        onPatchCard={onPatchCard}
      />
    ) : (
      <Row
        key={card.id}
        card={card}
        members={members}
        boardPrefix={boardPrefix}
        currentUserId={currentUserId}
        onCardClick={onCardClick}
        onPatchCard={onPatchCard}
      />
    )
  );

  const cardsContent =
    group.cards.length > 0 ? (
      rows
    ) : (
      <p className="px-3 py-3 text-xs" style={{ color: tack.slate }}>
        No cards{draggable ? " — drop one here" : ""}
      </p>
    );

  return (
    <section className="mb-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-1.5 px-1 pb-1.5 text-left"
      >
        <Chevron size={14} style={{ color: tack.slate }} className="shrink-0" />
        <span className="font-display text-sm" style={{ color: tack.ink, fontWeight: 600 }}>
          {group.label}
        </span>
        <span className="font-meta text-[11px]" style={{ color: tack.slate }}>
          {group.cards.length}
        </span>
      </button>

      {hasBlock && (
        <div
          ref={draggable && group.columnId ? setNodeRef : undefined}
          className="rounded-xl overflow-hidden divide-y divide-[color:var(--hairline)] transition-colors"
          style={{
            background: tack.surface,
            border: `1px solid ${isOver ? tack.pin : tack.hairline}`,
          }}
        >
          {expanded &&
            (draggable ? (
              <SortableContext
                items={group.cards.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                {cardsContent}
              </SortableContext>
            ) : (
              cardsContent
            ))}
          {group.columnId && <AddRow columnId={group.columnId} onAddCard={onAddCard} />}
        </div>
      )}
    </section>
  );
}

function SortableRow(props: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.card.id,
  });
  // The whole row is the drag handle (the sensor's distance constraint keeps a
  // click distinct from a drag — same as the board card).
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        cursor: "grab",
      }}
    >
      <Row {...props} draggable />
    </div>
  );
}

type RowProps = {
  card: TCard;
  members: Member[];
  boardPrefix: string;
  currentUserId: string;
  onCardClick: (card: TCard) => void;
  onPatchCard: (cardId: string, patch: CardPatch) => void;
};

function Row({
  card,
  members,
  boardPrefix,
  currentUserId,
  onCardClick,
  onPatchCard,
  draggable,
}: RowProps & { draggable?: boolean }) {
  const due = fmtDate(card.due_date);
  const overdue = card.due_date ? dueBucket(card.due_date).key === "overdue" : false;
  const assigneeName =
    card.assignee != null
      ? members.find((m) => m.user_id === card.assignee)?.full_name ??
        members.find((m) => m.user_id === card.assignee)?.email ??
        null
      : null;

  return (
    <div
      onClick={() => onCardClick(card)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onCardClick(card);
        }
      }}
      className="group/row flex items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-black/[0.02] transition-colors"
    >
      {draggable && (
        <GripVertical
          size={14}
          className="shrink-0 opacity-0 group-hover/row:opacity-40 transition-opacity -ml-1"
          style={{ color: tack.slate }}
          aria-hidden
        />
      )}

      {/* priority — fixed slot so titles align whether or not a dot shows */}
      <span className="shrink-0 flex w-2 justify-center" aria-hidden>
        {card.priority !== "none" && (
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: PRIORITY_COLOR[card.priority] }}
            title={`${card.priority} priority`}
          />
        )}
      </span>

      {card.number !== null && (
        <span
          className="shrink-0 font-meta text-[11px] tracking-[0.02em] tabular-nums w-12"
          style={{ color: tack.slate }}
        >
          {boardPrefix}-{card.number}
        </span>
      )}

      <span className="flex-1 min-w-0 truncate text-sm" style={{ color: tack.ink, fontWeight: 450 }}>
        {card.title}
      </span>

      {card.labels.slice(0, 2).map((l, i) => (
        <span
          key={i}
          className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded-full shrink-0 max-w-[8rem] truncate"
          style={{ background: tack.wash, color: tack.slate }}
        >
          {l}
        </span>
      ))}

      {card.links.length > 0 && (
        <span
          className="hidden sm:flex items-center gap-0.5 font-meta text-[11px] shrink-0"
          style={{ color: tack.slate }}
        >
          <Link2 size={12} />
          {card.links.length}
        </span>
      )}

      {due && (
        <span
          className="flex items-center gap-1 font-meta text-[11px] uppercase shrink-0"
          style={{ color: overdue ? tack.pin : tack.slate }}
          title={overdue ? "Overdue" : undefined}
        >
          <CalendarDays size={12} />
          {due}
        </span>
      )}

      <span className="shrink-0">
        <AssignPicker
          card={card}
          members={members}
          currentUserId={currentUserId}
          assigneeName={assigneeName}
          onAssign={(uid) => onPatchCard(card.id, { assignee: uid })}
        />
      </span>
    </div>
  );
}

function AddRow({
  columnId,
  onAddCard,
}: {
  columnId: string;
  onAddCard: (columnId: string, title: string) => void;
}) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);

  const submit = () => {
    const v = text.trim();
    if (v) onAddCard(columnId, v);
    setText("");
    // keep open for rapid entry
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm px-3 py-2 w-full hover:bg-black/[0.02] transition-colors"
        style={{ color: tack.slate }}
      >
        <Plus size={14} /> Add card
      </button>
    );
  }
  return (
    <div className="px-2.5 py-2">
      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") {
            setText("");
            setOpen(false);
          }
        }}
        onBlur={() => setOpen(false)}
        placeholder="Card title…  (Enter to add)"
        className="w-full rounded-md px-2 py-1.5 text-sm outline-none border"
        style={{ borderColor: tack.hairline, background: tack.paper, color: tack.ink }}
      />
    </div>
  );
}
