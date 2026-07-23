import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { Logo } from "@/components/ui/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { Footer } from "@/components/layout/Footer";
import { GuestEntryButton } from "@/components/layout/GuestEntryButton";

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/watchlist");

  return (
    <div className="relative">
      {/* Navbar */}
      <header className="sticky top-0 z-30 border-b border-[var(--color-line)] bg-[var(--color-paper)]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-[15px] font-medium hover:bg-[var(--color-paper-tint)]"
            >
              Log in
            </Link>
            <ButtonLink href="/signup" size="sm">
              Sign up
            </ButtonLink>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pb-16 pt-20 text-center sm:pt-28">
        <h1 className="type-hero">
          Every movie night
          <br />
          needs a <span className="sticker">flikpik</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-[var(--color-ink-soft)]">
          No more 40-minute debates about what to watch. Everyone votes. One
          movie wins. That&apos;s it.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <ButtonLink href="/signup" size="lg">
            Get started — it&apos;s free
          </ButtonLink>
          <GuestEntryButton />
        </div>
        <div className="mt-4">
          <ButtonLink href="#how" variant="ghost" size="sm">
            See how it works
          </ButtonLink>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how"
        className="mx-auto max-w-5xl scroll-mt-20 px-6 py-16"
      >
        <h2 className="type-display mb-3 text-center">
          Add movies. Swipe together.
          <br />
          Watch the winner.
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {[
            {
              n: "01",
              title: "Build your list",
              body: "Search TMDB and stack up everything you want to watch.",
              icon: "list",
            },
            {
              n: "02",
              title: "Swipe together",
              body: "Start a session with your crew. Yay or nay, one movie at a time.",
              icon: "swipe",
            },
            {
              n: "03",
              title: "Watch the pick",
              body: "First movie to a majority wins. Lights down, no arguments.",
              icon: "play",
            },
          ].map((step) => (
            <div
              key={step.n}
              className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-raised)] p-6 shadow-[var(--shadow-card)]"
            >
              <StepIcon kind={step.icon} />
              <div className="mt-4 text-sm font-bold tracking-widest text-[var(--color-red)]">
                {step.n}
              </div>
              <h3 className="type-title mt-1">{step.title}</h3>
              <p className="mt-2 text-[var(--color-ink-soft)]">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature section */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <h2 className="type-display">
              Your list. Your rules.
              <br />
              Everyone votes.
            </h2>
            <p className="mt-4 text-lg text-[var(--color-ink-soft)]">
              flikpik combines every member&apos;s watch list into one pool,
              filters by rating, and lets the group decide in real time.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              "Build your watch list",
              "Create a crew",
              "Swipe to decide",
              "Real-time results",
            ].map((label) => (
              <div
                key={label}
                className="rounded-xl border border-[var(--color-line)] bg-[var(--color-paper-raised)] p-4 font-semibold shadow-[var(--shadow-card)]"
              >
                <span className="text-[var(--color-red)]">→</span> {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TextureBand sendoff */}
      <section className="mx-auto my-8 max-w-6xl px-6">
        <div className="grain relative overflow-hidden rounded-3xl bg-[var(--color-ink-panel)] px-8 py-16 text-center">
          <h2 className="type-display text-[var(--color-paper-on-dark)]">
            Stop arguing. Start watching.
          </h2>
          <div className="mt-8">
            <ButtonLink href="/signup" size="lg">
              Sign up free
            </ButtonLink>
          </div>
          {/* CardFan of poster placeholders */}
          <div className="mt-12 flex items-end justify-center gap-[-20px]">
            {[-15, -7, 0, 7, 15].map((rot, i) => (
              <div
                key={i}
                className="aspect-[2/3] w-20 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[var(--color-paper-tint)] shadow-xl sm:w-24"
                style={{
                  transform: `rotate(${rot}deg) translateY(${Math.abs(rot)}px)`,
                  marginInline: "-8px",
                }}
              >
                <img
                  src="/poster-placeholder.svg"
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function StepIcon({ kind }: { kind: string }) {
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-red-tint)]">
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
        {kind === "list" && (
          <path
            d="M7 6h10M7 11h10M7 16h6"
            stroke="var(--color-red-deep)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        )}
        {kind === "swipe" && (
          <path
            d="M4 11h14m0 0l-4-4m4 4l-4 4"
            stroke="var(--color-red-deep)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {kind === "play" && (
          <path
            d="M8 6l9 5-9 5V6z"
            stroke="var(--color-red-deep)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </div>
  );
}
