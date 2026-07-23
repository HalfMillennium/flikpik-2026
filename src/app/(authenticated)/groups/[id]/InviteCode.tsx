"use client";

import { useToast } from "@/components/providers/ToastProvider";

export function InviteCode({ code }: { code: string }) {
  const toast = useToast();

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      toast("Code copied", "success");
    } catch {
      toast("Couldn't copy", "error");
    }
  }

  return (
    <button
      onClick={copy}
      className="group flex items-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-paper-raised)] px-4 py-2 transition-colors hover:border-[var(--color-red)]"
      aria-label={`Copy invite code ${code}`}
    >
      <div className="text-left">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ink-soft)]">
          Invite code
        </div>
        <div className="font-mono text-lg font-bold tracking-[0.2em]">{code}</div>
      </div>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="text-[var(--color-ink-soft)] group-hover:text-[var(--color-red)]">
        <rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 11V4a1 1 0 011-1h7" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </button>
  );
}
