import { Suspense } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-raised)] p-7 shadow-[var(--shadow-card)]">
          <h1 className="type-title mb-1">Welcome back</h1>
          <p className="mb-6 text-sm text-[var(--color-ink-soft)]">
            Log in to pick tonight&apos;s movie.
          </p>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
        <p className="mt-6 text-center text-sm text-[var(--color-ink-soft)]">
          New here?{" "}
          <Link href="/signup" className="font-semibold text-[var(--color-red)]">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
