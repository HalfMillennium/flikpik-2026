import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";
import { Picker } from "@/components/blog/Picker";

export const metadata: Metadata = {
  title: "Random Movie Picker (No Signup)",
  description:
    "Can't decide? Spin the wheel. A free random movie picker — no account, no ads. Or start a session and let your whole group vote.",
  alternates: { canonical: `${SITE_URL}/picker` },
};

export default function PickerPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 text-center sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-widest text-[var(--color-red)]">
        Free tool · no signup
      </p>
      <h1 className="type-hero mt-2">Random movie picker</h1>
      <p className="mx-auto mt-4 max-w-md text-lg text-[var(--color-ink-soft)]">
        Deciding solo? Hit the button. Deciding as a group is a different problem
        — there&apos;s a fix for that too.
      </p>
      <Picker />
    </div>
  );
}
