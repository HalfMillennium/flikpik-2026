"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";
import { useToast } from "@/components/providers/ToastProvider";
import { saveRoomCreds } from "@/lib/room-client";

/**
 * The whole point of the content: a reader arriving from search leaves having
 * *used* the product. Seeds a room with the list and drops them into the
 * lobby. Guests pick a nickname; signed-in users start as their account (the
 * server derives the name and links the seat to the account).
 */
export function ImportListCTA({
  tmdbIds,
  count,
  variant = "band",
}: {
  tmdbIds: number[];
  count: number;
  variant?: "band" | "inline";
}) {
  const router = useRouter();
  const toast = useToast();
  const { data: session } = useSession();
  const user = session?.user;
  const accountName = user ? (user.name ?? user.username) : null;

  const [open, setOpen] = useState(false);
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function start() {
    setError("");
    if (!accountName && !nickname.trim()) return setError("Enter a nickname.");
    setBusy(true);
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nickname: accountName ? undefined : nickname.trim(),
        tmdbIds,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || "Could not start the session.");
    saveRoomCreds(data.code, {
      participantId: data.participantId,
      participantToken: data.participantToken,
      nickname: data.nickname ?? accountName ?? nickname.trim(),
      hostToken: data.hostToken,
    });
    toast("Session ready — share the code", "success");
    router.push(`/rooms/${data.code}`);
  }

  const trigger =
    variant === "band" ? (
      <div className="rounded-2xl bg-[var(--color-ink-panel)] px-6 py-8 text-center">
        <p className="text-[var(--color-paper-on-dark)]">
          Swipe these {count} with your crew. First to a majority wins
          {accountName ? "." : " — no account needed."}
        </p>
        <div className="mt-4 flex justify-center">
          <Button size="lg" onClick={() => setOpen(true)}>
            Start a session with this list
          </Button>
        </div>
      </div>
    ) : (
      <Button onClick={() => setOpen(true)}>Start a session with this list</Button>
    );

  return (
    <>
      {trigger}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Start a movie night"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={start} disabled={busy}>
              {busy ? "Starting…" : "Start"}
            </Button>
          </>
        }
      >
        <p className="mb-4 text-sm text-[var(--color-ink-soft)]">
          We&apos;ll load all {count} movies into a room and give you a code to
          share. Everyone swipes; the majority wins.
          {!accountName && " No account needed."}
        </p>
        {accountName ? (
          <>
            <p className="text-sm">
              You&apos;ll host as{" "}
              <span className="font-semibold">{accountName}</span>.
            </p>
            {error && (
              <p className="mt-2 text-sm text-[var(--color-red-deep)]">{error}</p>
            )}
          </>
        ) : (
          <Field
            label="Your nickname"
            value={nickname}
            onChange={setNickname}
            placeholder="e.g. Alex"
            error={error}
            maxLength={40}
          />
        )}
      </Modal>
    </>
  );
}
