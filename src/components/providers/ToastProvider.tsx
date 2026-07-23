"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

type ToastVariant = "default" | "success" | "error";
type Toast = { id: number; message: string; variant: ToastVariant };

type ToastContextValue = {
  toast: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, variant: ToastVariant = "default") => {
    const id = nextId++;
    setToasts((t) => [...t, { id, message, variant }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="fixed bottom-5 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="fade-up flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium shadow-[var(--shadow-raised)]"
            style={{
              background:
                t.variant === "error"
                  ? "var(--color-ink-panel)"
                  : "var(--color-paper-raised)",
              color:
                t.variant === "error"
                  ? "var(--color-paper-on-dark)"
                  : "var(--color-ink)",
              borderColor:
                t.variant === "success"
                  ? "var(--color-red)"
                  : "var(--color-line)",
            }}
          >
            {t.variant === "success" && (
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: "var(--color-red)" }}
                aria-hidden
              />
            )}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx.toast;
}
