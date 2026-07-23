import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserProfile } from "@/lib/queries";
import { Avatar } from "@/components/ui/Avatar";
import { ProfileEditor } from "./ProfileEditor";

export const metadata = { title: "Profile" };

const links = [
  { href: "/watchlist", label: "Watch List" },
  { href: "/watchlist?tab=watched", label: "Watched List" },
  { href: "/groups", label: "Groups" },
];

export default async function ProfilePage() {
  const session = await auth();
  const profile = await getUserProfile(session!.user.id);
  if (!profile) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <Avatar name={profile.displayName} size={80} />
        <div>
          <h1 className="type-display">{profile.displayName}</h1>
          <p className="text-[var(--color-ink-soft)]">
            @{profile.username} · {profile.email}
          </p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-3">
        <Stat label="Want to watch" value={profile.watchCount} />
        <Stat label="Watched" value={profile.watchedCount} />
        <Stat label="Reviews" value={profile.reviewCount} />
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {links.map((l) => (
          <Link
            key={l.label}
            href={l.href}
            className="rounded-full border border-[var(--color-line)] bg-[var(--color-paper-raised)] px-4 py-2 text-sm font-medium hover:border-[var(--color-red)]"
          >
            {l.label} →
          </Link>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="type-title mb-4">Edit profile</h2>
        <ProfileEditor
          initialDisplayName={profile.displayName}
          initialEmail={profile.email}
          username={profile.username}
        />
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-paper-raised)] p-4 text-center">
      <div className="type-title text-[var(--color-red)]">{value}</div>
      <div className="text-xs text-[var(--color-ink-soft)]">{label}</div>
    </div>
  );
}
