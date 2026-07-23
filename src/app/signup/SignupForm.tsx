"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

type FieldErrors = Record<string, string[] | undefined>;

export function SignupForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    displayName: "",
    username: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setFormError("");
    setLoading(true);

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setLoading(false);
      if (data.details) setErrors(data.details);
      setFormError(data.error || "Could not create your account.");
      return;
    }

    // Auto-login after signup.
    const login = await signIn("credentials", {
      username: form.username,
      password: form.password,
      redirect: false,
    });
    setLoading(false);
    if (login?.error) {
      router.push("/login");
      return;
    }
    router.push("/watchlist");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field
        label="Display name"
        value={form.displayName}
        onChange={set("displayName")}
        error={errors.displayName?.[0]}
        autoComplete="name"
        required
      />
      <Field
        label="Username"
        value={form.username}
        onChange={set("username")}
        error={errors.username?.[0]}
        hint="Letters, numbers and underscores. This can't be changed later."
        autoComplete="username"
        autoCapitalize="none"
        required
      />
      <Field
        label="Email"
        type="email"
        value={form.email}
        onChange={set("email")}
        error={errors.email?.[0]}
        autoComplete="email"
        required
      />
      <Field
        label="Password"
        type="password"
        value={form.password}
        onChange={set("password")}
        error={errors.password?.[0]}
        hint="At least 8 characters."
        autoComplete="new-password"
        required
      />
      {formError && (
        <p role="alert" className="text-sm font-medium text-[var(--color-red-deep)]">
          {formError}
        </p>
      )}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
