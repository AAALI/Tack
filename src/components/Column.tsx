"use client";

import { useEffect, useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Trash2, GripVertical, X } from "lucide-react";
import { THEME, tack, type Card as TCard, type Column as TColumn, type Member } from "@/lib/types";
import type { CardPatch } from "@/lib/actions";
import CardItem from "./Card";

export default function Column({
  column,
  cards,
  members,
  boardPrefix,
  isFirstCol,
  isLastCol,
  onAddCard,
  onCardClick,
  onMoveCard,
  onPatchCard,
  currentUserId,
  onRename,
  onDelete,
  isComposing,
  onOpenCompose,
  onCloseCompose,
}: {
  column: TColumn;
  cards: TCard[];
  members: Member[];
  boardPrefix: string;
  isFirstCol: boolean;
  isLastCol: boolean;
  onAddCard: (columnId: string, title: string) => void;
  onCardClick: (card: TCard) => void;
  onMoveCard: (cardId: string, dir: -1 | 1) => void;
  onPatchCard: (cardId: string, patch: CardPatch) => void;
  currentUserId: string;
  onRename: (columnId: string, title: string) => void;
  onDelete: (columnId: string) => void;
  /** Whether this column's inline composer is open. Controlled by the board so
   * that only one composer can be open at a time. */
  isComposing: boolean;
  onOpenCompose: () => void;
  onCloseCompose: () => void;
}) {
  // Make the column itself sortable along the horizontal axis. The drag handle
  // is the column header — see {...attributes} {...listeners} below.
  const sortable = useSortable({
    id: `colsort:${column.id}`,
    data: { type: "column", columnId: column.id },
  });
  const { setNodeRef: setSortableRef, attributes, listeners, transform, transition, isDragging } =
    sortable;

  // Inner droppable so cards can be dropped into an empty column.
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `col:${column.id}`,
    data: { type: "column-drop", columnId: column.id },
  });

  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset draft when the composer closes (e.g. user opened another column's).
  useEffect(() => {
    if (!isComposing) setText("");
    else textareaRef.current?.focus();
  }, [isComposing]);

  const cancel = () => {
    setText("");
    onCloseCompose();
  };

  const add = () => {
    const v = text.trim();
    if (!v) {
      cancel();
      return;
    }
    onAddCard(column.id, v);
    setText("");
    // Keep the composer open so it's easy to add several in a row.
    textareaRef.current?.focus();
  };

  return (
    <div
      ref={setSortableRef}
      className="w-72 shrink-0 rounded-xl flex flex-col max-h-full transition-colors"
      style={{
        background: isOver ? tack.wash : "#EFEEE9",
        border: `1px solid ${isOver ? tack.pin : tack.hairline}`,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <div
        className="flex items-center gap-2 px-3 pt-3 pb-2 group/header"
        {...attributes}
        {...listeners}
        style={{ cursor: "grab" }}
      >
        <GripVertical
          size={13}
          className="opacity-0 group-hover/header:opacity-40 transition-opacity shrink-0"
          style={{ color: tack.slate }}
          aria-hidden
        />
        <input
          defaultValue={column.title}
          onBlur={(e) => {
            const v = e.target.value;
            if (v !== column.title) onRename(column.id, v);
          }}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          // Stop pointer events from initiating a column drag while editing.
          onPointerDown={(e) => e.stopPropagation()}
          className="flex-1 bg-transparent text-sm font-semibold outline-none min-w-0 cursor-text"
          style={{ color: tack.ink }}
        />
        <span
          className="text-[11px] font-meta px-1.5 py-0.5 rounded-full"
          style={{ background: tack.surface, color: tack.slate, border: `1px solid ${tack.hairline}` }}
        >
          {cards.length}
        </span>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onDelete(column.id)}
          className="p-1 rounded hover:bg-black/5 opacity-0 group-hover/header:opacity-100 transition-opacity"
          style={{ color: THEME.muted }}
          title="Delete stage"
          aria-label="Delete stage"
        >
          <Trash2 size={13} />
        </button>
      </div>

      <div ref={setDropRef} className="flex-1 overflow-y-auto px-2 pb-2 space-y-2 min-h-2">
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              members={members}
              boardPrefix={boardPrefix}
              isFirst={isFirstCol}
              isLast={isLastCol}
              onClick={() => onCardClick(card)}
              onMove={(dir) => onMoveCard(card.id, dir)}
              onAssign={(uid) => onPatchCard(card.id, { assignee: uid })}
              currentUserId={currentUserId}
            />
          ))}
        </SortableContext>

        {isComposing ? (
          <div
            className="composer rounded-xl overflow-hidden"
            style={{
              background: tack.surface,
              border: `1px solid ${tack.hairline}`,
              boxShadow: "0 1px 0 rgba(27,27,31,0.03)",
            }}
          >
            <textarea
              ref={textareaRef}
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  add();
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  cancel();
                }
              }}
              placeholder="Card title…  (Enter to add, Shift+Enter for newline)"
              className="w-full resize-none text-sm bg-transparent px-3 pt-3 pb-2 placeholder:opacity-60 focus:outline-none focus-visible:outline-none"
              style={{ color: tack.ink, outline: "none" }}
            />
            <div
              className="flex items-center justify-between gap-2 px-2 py-1.5"
              style={{ borderTop: `1px solid ${tack.hairline}`, background: tack.wash }}
            >
              <button
                onClick={add}
                disabled={!text.trim()}
                className="text-xs px-2.5 py-1 rounded-md text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: tack.pin }}
              >
                Add card
              </button>
              <button
                onClick={cancel}
                className="p-1 rounded-md hover:bg-black/[0.05]"
                style={{ color: tack.slate }}
                aria-label="Cancel"
                title="Cancel (Esc)"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={onOpenCompose}
            className="w-full flex items-center gap-1.5 text-sm px-2 py-2 rounded-lg hover:bg-black/[0.04] transition-colors"
            style={{ color: tack.slate }}
          >
            <Plus size={15} /> Add card
          </button>
        )}
      </div>
    </div>
  );
}
