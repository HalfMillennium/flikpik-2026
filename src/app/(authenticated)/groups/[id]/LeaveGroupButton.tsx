"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/providers/ToastProvider";

export function LeaveGroupButton({
  groupId,
  groupName,
}: {
  groupId: string;
  groupName: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function leave() {
    setBusy(true);
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "leave", groupId }),
    });
    setBusy(false);
    if (res.ok) {
      toast("Left group");
      router.push("/groups");
      router.refresh();
    } else {
      toast("Could not leave the group", "error");
    }
  }

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
        Leave group
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Leave this group?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Stay
            </Button>
            <Button variant="danger" onClick={leave} disabled={busy}>
              {busy ? "Leaving…" : "Leave group"}
            </Button>
          </>
        }
      >
        <p className="text-[var(--color-ink-soft)]">
          You&apos;ll be removed from <strong>{groupName}</strong>. If you&apos;re
          the leader, leadership passes to the longest-standing member. If
          you&apos;re the last one out, the group is deleted.
        </p>
      </Modal>
    </>
  );
}
