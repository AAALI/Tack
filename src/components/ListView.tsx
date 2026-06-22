"use client";

import { useEffect, useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  CalendarDays,
  Link2,
  Plus,
  Check,
} from "lucide-react";
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

export type ListGroup = "none" | "status" | "assignee" | "priority" | "due";
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
  if (group === "none") {
    groups = [{ key: "__all__", label: "", cards: [...cards] }];
  } else if (group === "status") {
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
  onSetColumn,
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
  onSetColumn: (cardId: string, columnId: string) => void;
  onAddCard: (columnId: string, title: string) => void;
}) {
  // Stage colour comes from the Pin set, keyed by column order — stable per
  // board, so a stage reads as the same hue everywhere (colour = meaning).
  const stageColor = (columnId: string) => {
    const i = columns.findIndex((c) => c.id === columnId);
    return i >= 0 ? tack.pins[i % tack.pins.length] : tack.slate;
  };
  const stageName = (columnId: string) => columns.find((c) => c.id === columnId)?.title ?? "—";

  // Drag (reorder) is only truthful when grouped by status with manual sort.
  const draggable = group === "status" && sort === "manual";
  // Show the status pill on every row except when the list is *grouped* by
  // status (the header already says it). This is what makes the row tell you
  // its stage at a glance — the whole point of v3.
  const showStatus = group !== "status";

  const groups = buildGroups(cards, columns, members, group, sort);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const rowProps = {
    members,
    boardPrefix,
    currentUserId,
    columns,
    stageColor,
    stageName,
    showStatus,
    onCardClick,
    onPatchCard,
    onSetColumn,
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {group === "none" ? (
          // Pure flat list — "just a list", every row carries its stage.
          <>
            <div className="rounded-lg divide-y divide-[color:var(--hairline)]">
              {(groups[0]?.cards ?? []).map((card) => (
                <Row key={card.id} card={card} {...rowProps} />
              ))}
            </div>
            {columns[0] && (
              <div className="mt-0.5">
                <AddRow columnId={columns[0].id} onAddCard={onAddCard} />
              </div>
            )}
          </>
        ) : (
          groups.map((g) => (
            <Section
              key={g.key}
              group={g}
              draggable={draggable}
              dragging={dragging}
              collapsed={collapsed.has(g.key)}
              onToggle={() => toggle(g.key)}
              headerDot={g.columnId ? stageColor(g.columnId) : null}
              rowProps={rowProps}
              onAddCard={onAddCard}
            />
          ))
        )}
      </div>
    </div>
  );
}

type RowProps = {
  card: TCard;
  members: Member[];
  boardPrefix: string;
  currentUserId: string;
  columns: TColumn[];
  stageColor: (columnId: string) => string;
  stageName: (columnId: string) => string;
  showStatus: boolean;
  onCardClick: (card: TCard) => void;
  onPatchCard: (cardId: string, patch: CardPatch) => void;
  onSetColumn: (cardId: string, columnId: string) => void;
};

function Section({
  group,
  draggable,
  dragging,
  collapsed,
  onToggle,
  headerDot,
  rowProps,
  onAddCard,
}: {
  group: Group;
  draggable: boolean;
  dragging: boolean;
  collapsed: boolean;
  onToggle: () => void;
  headerDot: string | null;
  rowProps: Omit<RowProps, "card">;
  onAddCard: (columnId: string, title: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `col:${group.columnId}`,
    data: { type: "column-drop", columnId: group.columnId },
    disabled: !draggable || !group.columnId,
  });

  const expanded = !collapsed || dragging;
  const Chevron = collapsed ? ChevronRight : ChevronDown;
  const empty = group.cards.length === 0;

  const rows = group.cards.map((card) =>
    draggable ? (
      <SortableRow key={card.id} card={card} {...rowProps} />
    ) : (
      <Row key={card.id} card={card} {...rowProps} />
    )
  );

  return (
    <section className="mb-5">
      {/* Sticky so the stage you're looking at stays visible as you scroll. */}
      <button
        onClick={onToggle}
        className="sticky top-0 z-10 w-full flex items-center gap-1.5 px-1.5 py-1.5 text-left"
        style={{ background: tack.paper }}
      >
        <Chevron size={14} style={{ color: tack.slate }} className="shrink-0" />
        {headerDot && (
          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: headerDot }} aria-hidden />
        )}
        <span className="font-display text-sm" style={{ color: tack.ink, fontWeight: 600 }}>
          {group.label}
        </span>
        <span className="font-meta text-[11px]" style={{ color: tack.slate }}>
          {group.cards.length}
        </span>
      </button>

      {expanded && !empty && (
        <div
          ref={draggable && group.columnId ? setNodeRef : undefined}
          className="rounded-lg divide-y divide-[color:var(--hairline)] transition-colors"
          style={isOver ? { background: tack.wash } : undefined}
        >
          {draggable ? (
            <SortableContext
              items={group.cards.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              {rows}
            </SortableContext>
          ) : (
            rows
          )}
        </div>
      )}

      {dragging && empty && draggable && group.columnId && (
        <div
          ref={setNodeRef}
          className="h-11 rounded-lg border border-dashed flex items-center justify-center text-xs transition-colors"
          style={{
            borderColor: isOver ? tack.pin : tack.hairline,
            background: isOver ? tack.wash : "transparent",
            color: tack.slate,
          }}
        >
          Drop here
        </div>
      )}

      {group.columnId && (
        <div className="mt-0.5">
          <AddRow columnId={group.columnId} onAddCard={onAddCard} />
        </div>
      )}
    </section>
  );
}

function SortableRow(props: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.card.id,
  });
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

function Row({
  card,
  members,
  boardPrefix,
  currentUserId,
  columns,
  stageColor,
  stageName,
  showStatus,
  onCardClick,
  onPatchCard,
  onSetColumn,
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
      className="group/row flex items-center gap-2.5 px-2.5 py-2.5 cursor-pointer hover:bg-black/[0.03] transition-colors"
    >
      {draggable && (
        <GripVertical
          size={14}
          className="shrink-0 opacity-0 group-hover/row:opacity-40 transition-opacity -ml-1"
          style={{ color: tack.slate }}
          aria-hidden
        />
      )}

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
          className="hidden md:inline text-[10px] px-1.5 py-0.5 rounded-full shrink-0 max-w-[7rem] truncate"
          style={{ background: tack.wash, color: tack.slate }}
        >
          {l}
        </span>
      ))}

      {card.links.length > 0 && (
        <span
          className="hidden md:flex items-center gap-0.5 font-meta text-[11px] shrink-0"
          style={{ color: tack.slate }}
        >
          <Link2 size={12} />
          {card.links.length}
        </span>
      )}

      {due && (
        <span
          className="hidden sm:flex items-center gap-1 font-meta text-[11px] uppercase shrink-0"
          style={{ color: overdue ? tack.pin : tack.slate }}
          title={overdue ? "Overdue" : undefined}
        >
          <CalendarDays size={12} />
          {due}
        </span>
      )}

      {showStatus && (
        <StatusPicker
          columns={columns}
          currentColumnId={card.column_id}
          stageColor={stageColor}
          stageName={stageName}
          onSelect={(colId) => onSetColumn(card.id, colId)}
        />
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

// Inline stage control — shows the card's stage as a coloured pill and moves it
// to another stage on select (the list's equivalent of dragging across columns).
function StatusPicker({
  columns,
  currentColumnId,
  stageColor,
  stageName,
  onSelect,
}: {
  columns: TColumn[];
  currentColumnId: string;
  stageColor: (columnId: string) => string;
  stageName: (columnId: string) => string;
  onSelect: (columnId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (r) setPos({ left: Math.max(8, r.right - 180), top: r.bottom + 6 });
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

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <>
      <button
        ref={btnRef}
        onPointerDown={stop}
        onClick={(e) => {
          stop(e);
          setOpen((v) => !v);
        }}
        className="shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs hover:opacity-80"
        style={{ background: tack.wash, color: tack.slate, border: `1px solid ${tack.hairline}` }}
        title="Change stage"
      >
        <span className="h-2 w-2 rounded-full" style={{ background: stageColor(currentColumnId) }} />
        <span className="hidden sm:inline max-w-[7rem] truncate">{stageName(currentColumnId)}</span>
      </button>
      {open && pos && (
        <div
          ref={menuRef}
          onClick={stop}
          onPointerDown={stop}
          className="fixed w-44 rounded-xl shadow-lg p-1 z-50 max-h-72 overflow-y-auto"
          style={{ left: pos.left, top: pos.top, background: tack.surface, border: `1px solid ${tack.hairline}` }}
        >
          <div
            className="px-2 py-1 text-[10px] font-meta uppercase tracking-[0.08em]"
            style={{ color: tack.slate }}
          >
            Move to stage
          </div>
          {columns.map((c) => {
            const active = c.id === currentColumnId;
            return (
              <button
                key={c.id}
                onClick={() => {
                  if (!active) onSelect(c.id);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 text-left text-sm px-2 py-1.5 rounded-md hover:bg-black/[0.04]"
                style={{ color: tack.ink }}
              >
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: stageColor(c.id) }} />
                <span className="flex-1 truncate">{c.title}</span>
                {active && <Check size={13} style={{ color: tack.pin }} />}
              </button>
            );
          })}
        </div>
      )}
    </>
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
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm px-2.5 py-2 w-full hover:bg-black/[0.02] rounded-lg transition-colors"
        style={{ color: tack.slate }}
      >
        <Plus size={14} /> Add card
      </button>
    );
  }
  return (
    <div className="px-2 py-1.5">
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
