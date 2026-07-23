"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { useToast } from "@/components/providers/ToastProvider";

export function ProfileEditor({
  initialDisplayName,
  initialEmail,
  username,
}: {
  initialDisplayName: string;
  initialEmail: string;
  username: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const dirty = displayName !== initialDisplayName || email !== initialEmail;

  async function save() {
    setError("");
    setBusy(true);
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, email }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || "Could not update your profile.");
    toast("Profile updated", "success");
    router.refresh();
  }

  return (
    <div className="max-w-md space-y-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-raised)] p-5">
      <Field
        label="Username"
        value={username}
        onChange={() => {}}
        hint="Usernames can't be changed."
      />
      <Field label="Display name" value={displayName} onChange={setDisplayName} />
      <Field label="Email" type="email" value={email} onChange={setEmail} />
      {error && (
        <p role="alert" className="text-sm text-[var(--color-red-deep)]">
          {error}
        </p>
      )}
      <Button onClick={save} disabled={!dirty || busy}>
        {busy ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}
