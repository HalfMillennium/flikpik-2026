import { Logo } from "@/components/ui/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { GuestOnly } from "@/components/ui/GuestOnly";
import { RoomEntry } from "@/components/rooms/RoomEntry";
import { PackTiles } from "@/components/packs/PackTiles";

export const metadata = { title: "Start a movie night" };

// Pack tiles read from the DB; keep the page fresh with ISR.
export const revalidate = 3600;

export default function NewRoomPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-[var(--color-line)] bg-[var(--color-paper)]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <ButtonLink href="/" variant="ghost" size="sm">
            Home
          </ButtonLink>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-12 text-center">
        <div className="mx-auto w-full max-w-lg">
          <GuestOnly>
            <p className="text-sm font-semibold uppercase tracking-widest text-[var(--color-red)]">
              No account needed
            </p>
          </GuestOnly>
          <h1 className="type-hero mt-2">Movie night, right now.</h1>
          <p className="mx-auto mt-4 max-w-sm text-lg text-[var(--color-ink-soft)]">
            Spin up a room, share the code, everyone swipes. The first movie to
            a majority wins — no sign-ups, nothing to install.
          </p>
          <div className="mt-8 flex justify-center">
            <RoomEntry />
          </div>
        </div>
        <PackTiles />
      </main>
    </div>
  );
}
