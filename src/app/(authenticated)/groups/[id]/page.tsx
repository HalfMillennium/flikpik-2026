import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getGroupDetail } from "@/lib/groups";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { InviteCode } from "./InviteCode";
import { LeaderControls } from "./LeaderControls";
import { LeaveGroupButton } from "./LeaveGroupButton";
import { posterUrl } from "@/lib/images";
import { relativeTime } from "@/lib/utils";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const group = await getGroupDetail(session!.user.id, id);
  if (!group) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="type-display">{group.name}</h1>
          <p className="mt-1 text-[var(--color-ink-soft)]">
            {group.members.length} member
            {group.members.length === 1 ? "" : "s"}
          </p>
        </div>
        <InviteCode code={group.inviteCode} />
      </div>

      {group.activeSession && (
        <Link
          href={`/groups/${group.id}/session`}
          className="mt-5 flex items-center gap-3 rounded-xl border border-[var(--color-red)] bg-[var(--color-red-tint)] px-4 py-3 font-semibold text-[var(--color-red-deep)]"
        >
          <span
            className="pulse-dot inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: "var(--color-red)" }}
          />
          A session is live — join now →
        </Link>
      )}

      {/* Members */}
      <section className="mt-8">
        <h2 className="type-title mb-3">Members</h2>
        <ul className="space-y-2">
          {group.members.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-paper-raised)] px-4 py-3"
            >
              <Avatar name={m.name} size={38} />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{m.name}</span>
                  {m.isLeader && <Badge tone="tint">👑 Leader</Badge>}
                </div>
                <span className="text-sm text-[var(--color-ink-soft)]">
                  @{m.username}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Leader: start session */}
      {group.isLeader && !group.activeSession && (
        <div className="mt-6">
          <LeaderControls groupId={group.id} />
        </div>
      )}

      {/* Past sessions */}
      <section className="mt-10">
        <h2 className="type-title mb-3">Past sessions</h2>
        {group.pastSessions.length === 0 ? (
          <p className="text-[var(--color-ink-soft)]">
            No sessions yet. {group.isLeader ? "Start one above." : "Wait for your leader to start one."}
          </p>
        ) : (
          <ul className="space-y-3">
            {group.pastSessions.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-4 rounded-xl border border-[var(--color-line)] bg-[var(--color-paper-raised)] p-3"
              >
                <div className="relative aspect-[2/3] w-12 shrink-0 overflow-hidden rounded-md bg-[var(--color-paper-tint)]">
                  <Image
                    src={posterUrl(s.winnerPoster, "w185")}
                    alt=""
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="font-semibold">
                    {s.status === "decided" && s.winnerTitle
                      ? s.winnerTitle
                      : "No consensus"}
                  </div>
                  <div className="text-sm text-[var(--color-ink-soft)]">
                    {relativeTime(s.date)} · {s.memberCount} participated ·{" "}
                    {s.decisionRule === "consensus" ? "Unanimous" : "Majority"}
                  </div>
                </div>
                {s.status === "decided" && <Badge tone="red">Picked</Badge>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-12 flex items-center justify-between border-t border-[var(--color-line)] pt-6">
        <ButtonLink href="/groups" variant="ghost" size="sm">
          ← All groups
        </ButtonLink>
        <LeaveGroupButton groupId={group.id} groupName={group.name} />
      </div>
    </div>
  );
}
