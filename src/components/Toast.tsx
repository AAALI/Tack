"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Check, AlertCircle, Info, X } from "lucide-react";
import { tack } from "@/lib/theme";

type ToastKind = "success" | "error" | "info";
type Toast = { id: number; message: string; kind: ToastKind };

type ToastFn = (message: string, kind?: ToastKind) => void;

const ToastContext = createContext<ToastFn | null>(null);

/**
 * App-wide toaster. One concern: transient feedback for actions that happen
 * away from a form (copying a link, saving a card, an RLS error). Colour means
 * something — success/info stay neutral; only errors borrow the Pin.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback<ToastFn>((message, kind = "info") => {
    const id = ++seq.current;
    setToasts((prev) => [...prev, { id, message, kind }]);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        className="fixed z-[100] bottom-4 right-4 flex flex-col gap-2 max-w-[calc(100vw-2rem)]"
        aria-live="polite"
        role="status"
      >
        {toasts.map((t) => (
          <ToastRow key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastRow({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const accent =
    toast.kind === "error" ? tack.pin : toast.kind === "success" ? tack.pins[2] : tack.slate;
  const Icon = toast.kind === "error" ? AlertCircle : toast.kind === "success" ? Check : Info;

  return (
    <div
      className="fade-up flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 shadow-lg text-sm w-80 max-w-full"
      style={{
        background: tack.surface,
        border: `1px solid ${tack.hairline}`,
        color: tack.ink,
      }}
    >
      <Icon size={16} style={{ color: accent, flexShrink: 0, marginTop: 1 }} />
      <span className="flex-1 leading-snug">{toast.message}</span>
      <button
        onClick={onDismiss}
        className="p-0.5 rounded hover:bg-black/5 shrink-0"
        style={{ color: tack.slate }}
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function useToast(): ToastFn {
  const ctx = useContext(ToastContext);
  // No-op fallback keeps components usable outside the provider (e.g. tests).
  return ctx ?? (() => {});
}
