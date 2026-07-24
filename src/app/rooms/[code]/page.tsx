import { Logo } from "@/components/ui/Logo";
import { RoomView } from "./RoomView";

export const metadata = { title: "Movie night" };

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-[var(--color-line)] bg-[var(--color-paper)]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-ink-soft)]">
            no account needed
          </span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <RoomView code={code.toUpperCase()} />
      </main>
    </div>
  );
}
