"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/components/providers/ToastProvider";
import { useGuest } from "@/components/providers/GuestProvider";
import { saveRoomCreds } from "@/lib/room-client";

/**
 * Host / join entry for anonymous rooms. No account required — hosting mints a
 * room + host token (stored client-side) and drops you into the lobby; joining
 * just navigates to the room, which prompts for a nickname.
 */
export function RoomEntry({
  layout = "row",
}: {
  layout?: "row" | "stack";
}) {
  const router = useRouter();
  const toast = useToast();
  const guest = useGuest();
  const { data: session } = useSession();
  const user = session?.user;
  const accountName = user ? (user.name ?? user.username) : null;

  const [mode, setMode] = useState<"none" | "host" | "join">("none");
  const [nickname, setNickname] = useState("");
  const [seedList, setSeedList] = useState(true);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function close() {
    setMode("none");
    setError("");
    setNickname("");
    setCode("");
  }

  async function host() {
    setError("");
    if (!accountName && !nickname.trim()) return setError("Enter a nickname.");
    setBusy(true);
    const tmdbIds =
      seedList && guest.list.length
        ? guest.list.map((m) => m.tmdbId)
        : undefined;
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
    if (!res.ok) return setError(data.error || "Could not create the room.");
    saveRoomCreds(data.code, {
      participantId: data.participantId,
      participantToken: data.participantToken,
      nickname: data.nickname ?? accountName ?? nickname.trim(),
      hostToken: data.hostToken,
    });
    toast("Room created", "success");
    router.push(`/rooms/${data.code}`);
  }

  function join() {
    setError("");
    const c = code.trim().toUpperCase();
    if (c.length < 4) return setError("Enter the room code.");
    router.push(`/rooms/${c}`);
  }

  return (
    <div
      className={
        layout === "stack"
          ? "flex flex-col gap-3"
          : "flex flex-wrap items-center justify-center gap-3"
      }
    >
      <Button size="lg" onClick={() => setMode("host")}>
        Start a movie night
      </Button>
      <Button size="lg" variant="secondary" onClick={() => setMode("join")}>
        Join with a code
      </Button>

      <Modal
        open={mode === "host"}
        onClose={close}
        title="Start a movie night"
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button onClick={host} disabled={busy}>
              {busy ? "Creating…" : "Create room"}
            </Button>
          </>
        }
      >
        <p className="mb-4 text-sm text-[var(--color-ink-soft)]">
          {accountName ? "" : "No account needed. "}You&apos;ll get a short code
          to share — everyone swipes, the majority wins.
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
        {guest.list.length > 0 && (
          <Switch checked={seedList} onChange={setSeedList} className="mt-4">
            Start the pool with my saved list ({guest.list.length})
          </Switch>
        )}
      </Modal>

      <Modal
        open={mode === "join"}
        onClose={close}
        title="Join a movie night"
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button onClick={join} disabled={busy}>
              Join
            </Button>
          </>
        }
      >
        <Field
          label="Room code"
          value={code}
          onChange={(v) => setCode(v.toUpperCase().slice(0, 8))}
          placeholder="ABC123"
          hint="Ask the host for the code."
          error={error}
          maxLength={8}
          autoCapitalize="characters"
        />
      </Modal>
    </div>
  );
}
