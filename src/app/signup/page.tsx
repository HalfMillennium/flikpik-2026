import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { SignupForm } from "./SignupForm";

export const metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-raised)] p-7 shadow-[var(--shadow-card)]">
          <h1 className="type-title mb-1">Create your account</h1>
          <p className="mb-6 text-sm text-[var(--color-ink-soft)]">
            Build your list. Start swiping in under a minute.
          </p>
          <SignupForm />
        </div>
        <p className="mt-6 text-center text-sm text-[var(--color-ink-soft)]">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[var(--color-red)]">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
