"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { Plus, Users, Pencil, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  addColumn as addColumnAction,
  createBoard,
  createCard,
  deleteCard,
  deleteColumn as deleteColumnAction,
  renameBoard,
  renameColumn as renameColumnAction,
  reorderCards,
  reorderColumns,
  updateCard,
} from "@/lib/actions";
import type { CardPatch } from "@/lib/actions";
import {
  tack,
  PRIORITY_COLOR,
  type Card,
  type Column as TColumn,
  type Member,
  type Priority,
} from "@/lib/types";
import Column from "./Column";
import CardModal from "./CardModal";
import MembersDialog from "./MembersDialog";
import CommandPalette from "./CommandPalette";
import ExportButton from "./ExportButton";
import Avatar from "./Avatar";
import TopBar from "./TopBar";
import { useToast } from "./Toast";

const tmp = () => "tmp_" + Math.random().toString(36).slice(2, 9);

export default function Board({
  boardId,
  boardName,
  boardPrefix,
  initialColumns,
  initialCards,
  members,
  currentUserId,
  isOwner,
  me,
}: {
  boardId: string;
  boardName: string;
  boardPrefix: string;
  initialColumns: TColumn[];
  initialCards: Card[];
  members: Member[];
  currentUserId: string;
  isOwner: boolean;
  me: { name: string | null; email: string | null };
}) {
  const [columns, setColumns] = useState<TColumn[]>(initialColumns);
  const [cards, setCards] = useState<Card[]>(initialCards);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<"card" | "column" | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  // Which column (if any) currently has its inline composer open. Only one
  // can be open at a time; opening another closes the previous.
  const [composingCol, setComposingCol] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Fired when ?card=<id> points at a card we don't have. Auto-clears.
  const [cardNotFound, setCardNotFound] = useState<string | null>(null);
  // < 768px renders one column at a time with a picker; drag is not primary,
  // the ◀ ▶ buttons are. Gated in JS (not CSS) so only one column tree mounts —
  // mounting both would register duplicate dnd-kit ids.
  const [isMobile, setIsMobile] = useState(false);
  const [mobileColId, setMobileColId] = useState<string | null>(null);
  const dragFrom = useRef<string | null>(null);
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Optimistic concurrency for the card modal ----
  // The modal edits against a base version captured when it opened. Writes are
  // serialised so our own rapid edits thread the new version; if someone else
  // saved first, the guarded write affects 0 rows and we freeze with a banner.
  const [editConflict, setEditConflict] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0); // bumped to re-seed the modal
  const editBaseRef = useRef<string | null>(null);
  const editConflictRef = useRef(false);
  const editWriteChain = useRef<Promise<void>>(Promise.resolve());
  const editSessionRef = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // ---- URL state (single source of truth for shareable view) ----
  // `editing`, filters, and the open card live in the query string so links
  // round-trip cleanly. User actions push via `setParam`; effects below react.
  const router = useRouter();
  const toast = useToast();
  const pathname = usePathname();
  const sp = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(sp.toString());
      if (value == null || value === "") next.delete(key);
      else next.set(key, value);
      const qs = next.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [sp, pathname, router]
  );

  // Batched clear: each setParam call captures the same stale `sp`, so chaining
  // four of them would lose three of the four edits. One replace fixes that.
  const clearParams = useCallback(
    (...keys: string[]) => {
      const next = new URLSearchParams(sp.toString());
      keys.forEach((k) => next.delete(k));
      const qs = next.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [sp, pathname, router]
  );

  const cardParam = sp.get("card");
  const filterAssignee = sp.get("assignee");
  const filterPriority = sp.get("priority") as Priority | null;
  const filterLabel = sp.get("label");
  const filterDue = sp.get("due");

  // Derive the modal-target card from the URL. Falls back to null if the id
  // was deleted under us; the effect below flags that to the user.
  const editing = useMemo<Card | null>(
    () => (cardParam ? cards.find((c) => c.id === cardParam) ?? null : null),
    [cardParam, cards]
  );

  // Compatibility shim for existing call sites: setting null clears the param,
  // setting a real card sets it. Temp (optimistic) ids are not link-worthy.
  const setEditing = useCallback(
    (c: Card | null) => {
      if (!c) return setParam("card", null);
      if (c.id.startsWith("tmp_")) return;
      setParam("card", c.id);
    },
    [setParam]
  );

  // If ?card=<id> points at nothing visible (deleted, RLS-hidden, typo), show
  // a brief banner and strip the param so the URL doesn't keep re-triggering.
  useEffect(() => {
    if (!cardParam) {
      setCardNotFound(null);
      return;
    }
    if (editing) {
      setCardNotFound(null);
      return;
    }
    setCardNotFound(cardParam);
    setParam("card", null);
    const t = setTimeout(() => setCardNotFound(null), 4000);
    return () => clearTimeout(t);
  }, [cardParam, editing, setParam]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ---- live refetch (debounced; skipped while dragging) ----
  const refetch = useCallback(async () => {
    if (activeId) return;
    const supabase = createClient();
    const [{ data: cols }, { data: cds }] = await Promise.all([
      supabase.from("columns").select("*").eq("board_id", boardId).order("position"),
      supabase.from("cards").select("*").eq("board_id", boardId).order("position"),
    ]);
    if (cols) setColumns(cols as TColumn[]);
    if (cds) setCards(cds as Card[]);
  }, [boardId, activeId]);

  const scheduleRefetch = useCallback(() => {
    if (refetchTimer.current) clearTimeout(refetchTimer.current);
    refetchTimer.current = setTimeout(refetch, 250);
  }, [refetch]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`board:${boardId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cards", filter: `board_id=eq.${boardId}` },
        scheduleRefetch
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "columns", filter: `board_id=eq.${boardId}` },
        scheduleRefetch
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [boardId, scheduleRefetch]);

  // ---- helpers ----
  const colOf = useCallback(
    (id: string): string | null => {
      if (id.startsWith("col:")) return id.slice(4);
      if (id.startsWith("colsort:")) return id.slice(8);
      return cards.find((c) => c.id === id)?.column_id ?? null;
    },
    [cards]
  );

  const cardsIn = (colId: string) => cards.filter((c) => c.column_id === colId);

  const persistColumns = (next: Card[], colIds: string[]) => {
    const updates: { id: string; column_id: string; position: number }[] = [];
    for (const colId of colIds) {
      next
        .filter((c) => c.column_id === colId)
        .forEach((c, i) => updates.push({ id: c.id, column_id: colId, position: i }));
    }
    if (updates.length) reorderCards(boardId, updates);
  };

  // ---- drag handlers ----
  const isColumnDrag = (id: string) => id.startsWith("colsort:");

  const onDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    setActiveId(id);
    dragFrom.current = null;
    if (isColumnDrag(id)) {
      setActiveType("column");
      return;
    }
    setActiveType("card");
    dragFrom.current = colOf(id);
  };

  const onDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    // Column drags are handled at drop time only — no inter-frame swap needed.
    if (isColumnDrag(String(active.id))) return;
    const from = colOf(String(active.id));
    const to = colOf(String(over.id));
    if (!from || !to || from === to) return;

    setCards((prev) => {
      const moving = prev.find((c) => c.id === active.id);
      if (!moving) return prev;
      const without = prev.filter((c) => c.id !== active.id);
      let insertIndex: number;
      if (String(over.id) === `col:${to}`) {
        insertIndex = without.length;
      } else {
        insertIndex = without.findIndex((c) => c.id === over.id);
        if (insertIndex < 0) insertIndex = without.length;
      }
      const next = [...without];
      next.splice(insertIndex, 0, { ...moving, column_id: to });
      return next;
    });
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    const from = dragFrom.current;
    const wasColumn = activeType === "column";
    setActiveId(null);
    setActiveType(null);
    dragFrom.current = null;
    if (!over) return;

    // Column drags: only act when dropped on another column slot. Anywhere
    // else (over a card, in dead space) snaps back without persisting.
    if (wasColumn) {
      if (!isColumnDrag(String(over.id))) return;
      const activeColId = String(active.id).replace("colsort:", "");
      const overColId = String(over.id).replace("colsort:", "");
      if (activeColId === overColId) return;
      const oldIndex = columns.findIndex((c) => c.id === activeColId);
      const newIndex = columns.findIndex((c) => c.id === overColId);
      if (oldIndex < 0 || newIndex < 0) return;
      const next = arrayMove(columns, oldIndex, newIndex).map((c, i) => ({
        ...c,
        position: i,
      }));
      setColumns(next);
      reorderColumns(
        boardId,
        next.map(({ id, position }) => ({ id, position }))
      );
      return;
    }

    // Card reorder / move.
    let next = cards;
    const overId = String(over.id);
    if (active.id !== over.id && !overId.startsWith("col:") && !overId.startsWith("colsort:")) {
      const oldIndex = cards.findIndex((c) => c.id === active.id);
      const newIndex = cards.findIndex((c) => c.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) next = arrayMove(cards, oldIndex, newIndex);
    }
    setCards(next);
    const to = colOf(String(active.id));
    const affected = Array.from(new Set([from, to].filter(Boolean))) as string[];
    persistColumns(next, affected);
  };

  // ---- mobile move ----
  const moveCard = (cardId: string, dir: -1 | 1) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    const idx = columns.findIndex((c) => c.id === card.column_id);
    const target = columns[idx + dir];
    if (!target) return;
    const next = cards.map((c) => (c.id === cardId ? { ...c, column_id: target.id } : c));
    setCards(next);
    persistColumns(next, [card.column_id, target.id]);
  };

  // ---- card CRUD ----
  const addCard = useCallback(
    async (columnId: string, title: string) => {
      const position = cards.filter((c) => c.column_id === columnId).length;
      const temp: Card = {
        id: tmp(),
        board_id: boardId,
        column_id: columnId,
        // Trigger assigns the real number on insert; refetch reconciles.
        number: null,
        title,
        description: "",
        assignee: currentUserId,
        due_date: null,
        priority: "none",
        labels: [],
        links: [],
        position,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setCards((prev) => [...prev, temp]);
      await createCard(boardId, columnId, title, position);
      scheduleRefetch();
    },
    [boardId, cards, currentUserId, scheduleRefetch]
  );

  const patchCard = useCallback(
    (cardId: string, patch: CardPatch) => {
      setCards((prev) => prev.map((c) => (c.id === cardId ? ({ ...c, ...patch } as Card) : c)));
      if (!cardId.startsWith("tmp_")) updateCard(boardId, cardId, patch);
    },
    [boardId]
  );

  // Capture the base version when a card is opened in the modal, and reset any
  // prior conflict. Keyed on the card id so it doesn't re-run on every save.
  useEffect(() => {
    editSessionRef.current += 1;
    editConflictRef.current = false;
    setEditConflict(false);
    editBaseRef.current = editing?.updated_at ?? null;
    editWriteChain.current = Promise.resolve();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.id]);

  const refetchCard = useCallback(async (cardId: string) => {
    const supabase = createClient();
    return await supabase.from("cards").select("*").eq("id", cardId).maybeSingle();
  }, []);

  const handleSaveFailure = async (cardId: string, session: number) => {
    try {
      const { data } = await refetchCard(cardId);
      if (session !== editSessionRef.current) return;
      if (data) {
        const fresh = data as Card;
        setCards((prev) => prev.map((c) => (c.id === fresh.id ? fresh : c)));
        editBaseRef.current = fresh.updated_at;
      } else {
        void refetch();
      }
    } catch {
      if (session !== editSessionRef.current) return;
      void refetch();
    }
    if (session !== editSessionRef.current) return;
    editConflictRef.current = true;
    setEditConflict(true);
    toast("Couldn't save the card. Reload before continuing.", "error");
  };

  const saveCard = (patch: CardPatch) => {
    if (!editing) return;
    const id = editing.id;
    const session = editSessionRef.current;
    // Optimistic update is unconditional so the UI stays responsive.
    setCards((prev) => prev.map((c) => (c.id === id ? ({ ...c, ...patch } as Card) : c)));
    if (id.startsWith("tmp_")) return; // not persisted yet; nothing to guard

    // Serialise writes per modal session: each one waits for the previous so it
    // reads the freshly-advanced base version and never conflicts with itself.
    editWriteChain.current = editWriteChain.current.then(async () => {
      if (session !== editSessionRef.current || editConflictRef.current) return;
      try {
        const res = await updateCard(boardId, id, patch, editBaseRef.current);
        if (session !== editSessionRef.current) return;
        if (res.error) {
          await handleSaveFailure(id, session);
          return;
        }
        if (res.conflict) {
          editConflictRef.current = true;
          setEditConflict(true);
          refetch(); // pull the other edit into state so Reload shows the latest
          return;
        }
        if (res.updated_at) {
          editBaseRef.current = res.updated_at;
          setCards((prev) =>
            prev.map((c) => (c.id === id ? ({ ...c, updated_at: res.updated_at! } as Card) : c))
          );
        }
      } catch {
        await handleSaveFailure(id, session);
      }
    });
  };

  // "Reload to edit": pull the latest row, re-seed the modal from it (via a key
  // bump), and clear the conflict so editing resumes against the new version.
  const reloadEditingCard = useCallback(async () => {
    if (!editing) return;
    const { data, error } = await refetchCard(editing.id);
    if (error) {
      editConflictRef.current = true;
      setEditConflict(true);
      toast("Couldn't reload the card. Try again.", "error");
      return;
    }
    if (!data) {
      // The card was deleted out from under us.
      setEditing(null);
      setParam("card", null);
      return;
    }
    const fresh = data as Card;
    editSessionRef.current += 1;
    setCards((prev) => prev.map((c) => (c.id === fresh.id ? fresh : c)));
    editBaseRef.current = fresh.updated_at;
    editConflictRef.current = false;
    editWriteChain.current = Promise.resolve();
    setEditConflict(false);
    setEditing(fresh);
    setReloadNonce((n) => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, refetchCard, setEditing, setParam, toast]);

  const removeCard = () => {
    if (!editing) return;
    const id = editing.id;
    setCards((prev) => prev.filter((c) => c.id !== id));
    if (!id.startsWith("tmp_")) deleteCard(boardId, id);
    // Clear the URL param so a stale ?card=<deleted> doesn't bounce back.
    setParam("card", null);
  };

  // ---- column CRUD ----
  const addColumn = async () => {
    const position = columns.length;
    setColumns((prev) => [...prev, { id: tmp(), board_id: boardId, title: "New stage", position }]);
    await addColumnAction(boardId, position);
    scheduleRefetch();
  };

  const renameColumn = (columnId: string, title: string) => {
    setColumns((prev) => prev.map((c) => (c.id === columnId ? { ...c, title } : c)));
    if (!columnId.startsWith("tmp_")) renameColumnAction(boardId, columnId, title);
  };

  const deleteColumn = (columnId: string) => {
    if (cardsIn(columnId).length > 0 && !confirm("Delete this stage and its cards?")) return;
    setColumns((prev) => prev.filter((c) => c.id !== columnId));
    setCards((prev) => prev.filter((c) => c.column_id !== columnId));
    if (!columnId.startsWith("tmp_")) deleteColumnAction(boardId, columnId);
  };

  const activeCard = useMemo(
    () => (activeType === "card" ? cards.find((c) => c.id === activeId) ?? null : null),
    [cards, activeId, activeType]
  );
  const activeColumn = useMemo(
    () =>
      activeType === "column"
        ? columns.find((c) => `colsort:${c.id}` === activeId) ?? null
        : null,
    [columns, activeId, activeType]
  );

  // ---- filters ----
  const allLabels = useMemo(
    () => Array.from(new Set(cards.flatMap((c) => c.labels))).sort(),
    [cards]
  );
  const filterActive =
    filterAssignee !== null ||
    filterPriority !== null ||
    filterLabel !== null ||
    filterDue !== null;

  const todayIso = () => new Date().toISOString().slice(0, 10);
  const inDueRange = (d: string | null, mode: string | null): boolean => {
    if (!mode) return true;
    if (mode === "no-date") return d === null;
    if (d === null) return false;
    const today = todayIso();
    if (mode === "overdue") return d < today;
    if (mode === "this-week") {
      const t = new Date(today + "T00:00:00");
      const wk = new Date(t);
      wk.setDate(t.getDate() + 7);
      const wkIso = wk.toISOString().slice(0, 10);
      return d >= today && d <= wkIso;
    }
    return true;
  };

  const matchesFilters = (c: Card) => {
    if (filterAssignee === "__unassigned__" && c.assignee !== null) return false;
    if (filterAssignee === "__me__" && c.assignee !== currentUserId) return false;
    if (
      filterAssignee &&
      filterAssignee !== "__unassigned__" &&
      filterAssignee !== "__me__" &&
      c.assignee !== filterAssignee
    )
      return false;
    if (filterPriority && c.priority !== filterPriority) return false;
    if (filterLabel && !c.labels.includes(filterLabel)) return false;
    if (filterDue && !inDueRange(c.due_date, filterDue)) return false;
    return true;
  };
  const visibleCardsIn = (colId: string) => cardsIn(colId).filter(matchesFilters);
  const visibleCount = cards.filter(matchesFilters).length;

  // Active column for the single-column mobile view; falls back to the first
  // column if the selected one was deleted.
  const mobileCol = columns.find((c) => c.id === mobileColId) ?? columns[0] ?? null;
  const mobileColIndex = mobileCol ? columns.findIndex((c) => c.id === mobileCol.id) : -1;

  // ---- keyboard shortcuts ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't intercept when the user is typing in an input/textarea/contenteditable.
      const t = e.target as HTMLElement | null;
      const inField =
        !!t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          (t as HTMLElement).isContentEditable);

      // Cmd/Ctrl+K — palette. Works even while typing in a field.
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if (e.key === "Escape") {
        if (paletteOpen) setPaletteOpen(false);
        else if (helpOpen) setHelpOpen(false);
        else if (editing) setEditing(null);
        else if (membersOpen) setMembersOpen(false);
        return;
      }
      if (inField) return;
      // C or N — new card in the first column.
      if (e.key === "c" || e.key === "C" || e.key === "n" || e.key === "N") {
        const first = columns[0];
        if (first) {
          e.preventDefault();
          setComposingCol(first.id);
        }
      }
      // / — open the palette pre-focused for searching.
      if (e.key === "/") {
        e.preventDefault();
        setPaletteOpen(true);
      }
      if (e.key === "?") {
        e.preventDefault();
        setHelpOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [columns, editing, membersOpen, helpOpen, paletteOpen, setEditing]);

  // New-board trigger fired from the palette. Tiny prompt; navigate to the
  // freshly-created board once the action returns its id.
  const newBoardFromPalette = useCallback(async () => {
    const name = window.prompt("Name this board");
    if (!name?.trim()) return;
    const res = await createBoard(name.trim());
    if (res?.id) router.push(`/boards/${res.id}`);
    else toast(res?.error ?? "Couldn't create the board", "error");
  }, [router, toast]);

  const centerSlot = (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-sm" style={{ color: tack.slate }} aria-hidden>
        /
      </span>
      {editingName ? (
        <input
          autoFocus
          defaultValue={boardName}
          onBlur={(e) => {
            renameBoard(boardId, e.target.value);
            setEditingName(false);
          }}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className="text-base font-display outline-none border-b bg-transparent min-w-0"
          style={{ borderColor: tack.hairline, fontWeight: 600, color: tack.ink }}
        />
      ) : (
        <button
          onClick={() => isOwner && setEditingName(true)}
          className="group flex items-center gap-1.5 min-w-0"
          title={isOwner ? "Rename board" : undefined}
        >
          <span
            className="text-base font-display truncate"
            style={{ color: tack.ink, fontWeight: 600 }}
          >
            {boardName}
          </span>
          {isOwner && <Pencil size={12} className="opacity-0 group-hover:opacity-40 shrink-0" />}
        </button>
      )}
    </div>
  );

  const rightSlot = (
    <div className="flex items-center gap-2">
      <ExportButton boardId={boardId} boardName={boardName} />
      <button
        onClick={() => setMembersOpen(true)}
        className="flex items-center gap-2 rounded-full pl-1.5 pr-3 py-1 border text-sm"
        style={{ borderColor: tack.hairline, color: tack.slate, background: tack.surface }}
        aria-label="Members"
      >
        <div className="flex -space-x-1.5">
          {members.slice(0, 3).map((m) => (
            <Avatar key={m.user_id} name={m.full_name ?? m.email} size={20} />
          ))}
        </div>
        <Users size={13} />
        <span className="font-meta">{members.length}</span>
      </button>
    </div>
  );

  return (
    <div className="h-full flex flex-col" style={{ background: tack.paper, color: tack.ink }}>
      <TopBar me={me} centerSlot={centerSlot} rightSlot={rightSlot} />

      {/* filter chips */}
      <div
        className="flex items-center gap-2 px-5 py-2 overflow-x-auto"
        style={{ borderBottom: `1px solid ${tack.hairline}`, background: tack.surface }}
      >
        <span
          className="text-[11px] font-meta uppercase tracking-[0.08em] shrink-0"
          style={{ color: tack.slate }}
        >
          Filter
        </span>
        <FilterSelect
          label="Assignee"
          value={filterAssignee}
          onChange={(v) => setParam("assignee", v)}
          options={[
            { value: "__me__", label: "Mine" },
            { value: "__unassigned__", label: "Unassigned" },
            ...members
              .filter((m) => m.user_id !== currentUserId)
              .map((m) => ({
                value: m.user_id,
                label: m.full_name ?? m.email ?? "Unknown",
              })),
          ]}
        />
        <FilterSelect
          label="Priority"
          value={filterPriority}
          onChange={(v) => setParam("priority", v)}
          options={[
            { value: "high", label: "High", dot: PRIORITY_COLOR.high },
            { value: "medium", label: "Medium", dot: PRIORITY_COLOR.medium },
            { value: "low", label: "Low", dot: PRIORITY_COLOR.low },
            { value: "none", label: "None", dot: PRIORITY_COLOR.none },
          ]}
        />
        <FilterSelect
          label="Due"
          value={filterDue}
          onChange={(v) => setParam("due", v)}
          options={[
            { value: "overdue", label: "Overdue", dot: tack.pin },
            { value: "this-week", label: "This week" },
            { value: "no-date", label: "No date" },
          ]}
        />
        {allLabels.length > 0 && (
          <FilterSelect
            label="Label"
            value={filterLabel}
            onChange={(v) => setParam("label", v)}
            options={allLabels.map((l) => ({ value: l, label: l }))}
          />
        )}
        {filterActive && (
          <button
            onClick={() => clearParams("assignee", "priority", "label", "due")}
            className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
            style={{ color: tack.pin }}
          >
            <X size={12} /> Clear
          </button>
        )}
        {cardNotFound && (
          <span
            className="ml-auto font-meta text-[11px] uppercase tracking-[0.08em] shrink-0"
            style={{ color: tack.pin }}
            role="status"
          >
            Card not found
          </span>
        )}
      </div>

      {/* board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        {!isMobile ? (
          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <div className="flex gap-4 p-5 h-full items-start" style={{ minWidth: "min-content" }}>
              <SortableContext
                items={columns.map((c) => `colsort:${c.id}`)}
                strategy={horizontalListSortingStrategy}
              >
                {columns.map((col, i) => (
                  <Column
                    key={col.id}
                    column={col}
                    cards={visibleCardsIn(col.id)}
                    members={members}
                    boardPrefix={boardPrefix}
                    isFirstCol={i === 0}
                    isLastCol={i === columns.length - 1}
                    onAddCard={addCard}
                    onCardClick={setEditing}
                    onMoveCard={moveCard}
                    onPatchCard={patchCard}
                    currentUserId={currentUserId}
                    onRename={renameColumn}
                    onDelete={deleteColumn}
                    isComposing={composingCol === col.id}
                    onOpenCompose={() => setComposingCol(col.id)}
                    onCloseCompose={() => setComposingCol((c) => (c === col.id ? null : c))}
                  />
                ))}
              </SortableContext>

              <button
                onClick={addColumn}
                className="w-72 shrink-0 rounded-xl flex items-center justify-center gap-2 text-sm py-3 border border-dashed hover:bg-black/[0.03]"
                style={{ borderColor: tack.hairline, color: tack.slate }}
              >
                <Plus size={15} /> Add stage
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Column picker — horizontally scrollable chips. */}
            <div
              className="flex gap-2 overflow-x-auto px-4 py-3 shrink-0"
              style={{ borderBottom: `1px solid ${tack.hairline}` }}
            >
              {columns.map((col) => {
                const active = mobileCol?.id === col.id;
                const count = visibleCardsIn(col.id).length;
                return (
                  <button
                    key={col.id}
                    onClick={() => setMobileColId(col.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap shrink-0"
                    style={{
                      background: active ? tack.ink : tack.surface,
                      color: active ? tack.surface : tack.ink,
                      border: `1px solid ${active ? tack.ink : tack.hairline}`,
                    }}
                  >
                    {col.title}
                    <span
                      className="font-meta text-[11px]"
                      style={{ color: active ? tack.surface : tack.slate }}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
              <button
                onClick={addColumn}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm whitespace-nowrap shrink-0 border border-dashed"
                style={{ borderColor: tack.hairline, color: tack.slate }}
                aria-label="Add stage"
              >
                <Plus size={14} /> Stage
              </button>
            </div>

            {/* The single active column, full width. */}
            <div className="flex-1 min-h-0 px-4 pt-3 pb-4">
              {mobileCol && (
                <Column
                  key={mobileCol.id}
                  column={mobileCol}
                  cards={visibleCardsIn(mobileCol.id)}
                  members={members}
                  boardPrefix={boardPrefix}
                  isFirstCol={mobileColIndex === 0}
                  isLastCol={mobileColIndex === columns.length - 1}
                  onAddCard={addCard}
                  onCardClick={setEditing}
                  onMoveCard={moveCard}
                  onPatchCard={patchCard}
                  currentUserId={currentUserId}
                  onRename={renameColumn}
                  onDelete={deleteColumn}
                  isComposing={composingCol === mobileCol.id}
                  onOpenCompose={() => setComposingCol(mobileCol.id)}
                  onCloseCompose={() => setComposingCol((c) => (c === mobileCol.id ? null : c))}
                  fullWidth
                />
              )}
            </div>
          </div>
        )}

        <DragOverlay>
          {activeCard ? (
            <div
              className="rounded-xl p-3 shadow-lg w-72"
              style={{ background: tack.surface, border: `1px solid ${tack.pin}` }}
            >
              <p className="text-sm" style={{ color: tack.ink }}>
                {activeCard.title}
              </p>
            </div>
          ) : activeColumn ? (
            <div
              className="w-72 rounded-xl shadow-lg p-3"
              style={{ background: tack.surface, border: `1px solid ${tack.pin}` }}
            >
              <p className="text-sm font-semibold" style={{ color: tack.ink }}>
                {activeColumn.title}
              </p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* footer */}
      <footer
        className="px-5 py-2 text-xs flex items-center justify-between"
        style={{ borderTop: `1px solid ${tack.hairline}`, background: tack.surface, color: tack.slate }}
      >
        <span className="font-meta">
          {filterActive ? (
            <>
              {visibleCount} of {cards.length} cards shown
            </>
          ) : (
            <>
              {cards.length} {cards.length === 1 ? "card" : "cards"} · live for everyone on this board
            </>
          )}
        </span>
        <button
          onClick={() => setHelpOpen(true)}
          className="font-meta uppercase tracking-[0.08em] hover:underline"
          style={{ color: tack.slate }}
        >
          ? shortcuts
        </button>
      </footer>

      {editing && (
        <CardModal
          key={`${editing.id}:${reloadNonce}`}
          card={cards.find((c) => c.id === editing.id) ?? editing}
          members={members}
          boardPrefix={boardPrefix}
          conflict={editConflict}
          onReload={reloadEditingCard}
          onSave={saveCard}
          onDelete={removeCard}
          onClose={() => setEditing(null)}
        />
      )}

      {membersOpen && (
        <MembersDialog
          boardId={boardId}
          members={members}
          isOwner={isOwner}
          currentUserId={currentUserId}
          onClose={() => setMembersOpen(false)}
        />
      )}

      {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        cards={cards}
        boardPrefix={boardPrefix}
        currentBoardId={boardId}
        onOpenCard={(id) => setParam("card", id)}
        onNewBoard={newBoardFromPalette}
      />
    </div>
  );
}

// -------- Quick-filter dropdown --------
function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  options: { value: string; label: string; dot?: string }[];
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (r) setPos({ left: r.left, top: r.bottom + 4 });
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

  const active = options.find((o) => o.value === value);
  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border shrink-0"
        style={{
          borderColor: value ? tack.pin : tack.hairline,
          color: value ? tack.ink : tack.slate,
          background: tack.surface,
        }}
      >
        {active?.dot && (
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: active.dot }}
            aria-hidden
          />
        )}
        <span>{value ? `${label}: ${active?.label ?? value}` : label}</span>
      </button>
      {open && pos && (
        <div
          ref={menuRef}
          className="fixed min-w-44 rounded-xl shadow-lg p-1 z-50"
          style={{
            left: pos.left,
            top: pos.top,
            background: tack.surface,
            border: `1px solid ${tack.hairline}`,
          }}
        >
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => {
                onChange(value === o.value ? null : o.value);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 text-left text-sm px-2.5 py-1.5 rounded-md hover:bg-black/[0.03]"
              style={{ color: tack.ink }}
            >
              {o.dot && (
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: o.dot }}
                  aria-hidden
                />
              )}
              <span className="flex-1 truncate">{o.label}</span>
              {value === o.value && (
                <span className="text-[10px] font-meta" style={{ color: tack.pin }}>
                  ON
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

// -------- Keyboard help --------
function HelpDialog({ onClose }: { onClose: () => void }) {
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
        <h3 className="font-display" style={{ color: tack.ink, fontWeight: 600 }}>
          Shortcuts
        </h3>
        <ul className="mt-3 space-y-2 text-sm" style={{ color: tack.ink }}>
          <Shortcut k="⌘K" desc="Find a card or jump to a board" />
          <Shortcut k="/" desc="Open the palette to search" />
          <Shortcut k="C" desc="Add a card to the first stage" />
          <Shortcut k="Esc" desc="Close a dialog or composer" />
          <Shortcut k="?" desc="Open this help" />
        </ul>
      </div>
    </div>
  );
}

function Shortcut({ k, desc }: { k: string; desc: string }) {
  return (
    <li className="flex items-center justify-between">
      <span style={{ color: tack.slate }}>{desc}</span>
      <kbd
        className="font-meta text-[11px] px-2 py-0.5 rounded"
        style={{ background: tack.wash, border: `1px solid ${tack.hairline}`, color: tack.ink }}
      >
        {k}
      </kbd>
    </li>
  );
}
