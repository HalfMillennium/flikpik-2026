import { Navbar } from "@/components/layout/Navbar";
import { GuestBanner } from "@/components/layout/GuestBanner";

/**
 * App shell. Auth is enforced per-route by middleware.ts — account-only
 * pages (groups, sessions, profile) require a token; guest-eligible pages
 * (watch list, search) render for everyone.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <GuestBanner />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
