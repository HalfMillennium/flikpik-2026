"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";
import { useToast } from "@/components/providers/ToastProvider";

export function GroupActions() {
  const router = useRouter();
  const toast = useToast();
  const [mode, setMode] = useState<"none" | "create" | "join">("none");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function close() {
    setMode("none");
    setName("");
    setCode("");
    setError("");
  }

  async function create() {
    setError("");
    if (!name.trim()) return setError("Enter a group name.");
    setBusy(true);
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", name: name.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || "Could not create the group.");
    toast("Group created", "success");
    close();
    router.push(`/groups/${data.group.id}`);
  }

  async function join() {
    setError("");
    if (code.length !== 6) return setError("Invite codes are 6 characters.");
    setBusy(true);
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "join", inviteCode: code.toUpperCase() }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || "Could not join that group.");
    toast("Joined group", "success");
    close();
    router.push(`/groups/${data.group.id}`);
  }

  return (
    <div className="flex gap-2">
      <Button variant="secondary" size="sm" onClick={() => setMode("join")}>
        Join group
      </Button>
      <Button size="sm" onClick={() => setMode("create")}>
        + Create group
      </Button>

      <Modal
        open={mode === "create"}
        onClose={close}
        title="Create a group"
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button onClick={create} disabled={busy}>
              {busy ? "Creating…" : "Create"}
            </Button>
          </>
        }
      >
        <Field
          label="Group name"
          value={name}
          onChange={setName}
          placeholder="Movie Night Crew"
          error={error}
          required
        />
      </Modal>

      <Modal
        open={mode === "join"}
        onClose={close}
        title="Join a group"
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button onClick={join} disabled={busy}>
              {busy ? "Joining…" : "Join"}
            </Button>
          </>
        }
      >
        <Field
          label="Invite code"
          value={code}
          onChange={(v) => setCode(v.toUpperCase().slice(0, 6))}
          placeholder="ABC123"
          hint="Ask the group leader for the 6-character code."
          error={error}
          maxLength={6}
          autoCapitalize="characters"
          required
        />
      </Modal>
    </div>
  );
}
