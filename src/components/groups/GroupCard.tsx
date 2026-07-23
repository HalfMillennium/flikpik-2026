"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";

export type GroupCardData = {
  id: string;
  name: string;
  memberCount: number;
  isLeader: boolean;
  hasActiveSession: boolean;
  members: { id: string; name: string }[];
};

export function GroupCard({ group }: { group: GroupCardData }) {
  return (
    <Link
      href={`/groups/${group.id}`}
      className="group block rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-raised)] p-5 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-raised)]"
    >
      <div className="mb-4 flex items-start justify-between gap-2">
        <h3 className="type-title">{group.name}</h3>
        {group.hasActiveSession && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-red)]">
            <span
              className="pulse-dot inline-block h-2 w-2 rounded-full"
              style={{ background: "var(--color-red)" }}
            />
            Live
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex -space-x-2">
          {group.members.slice(0, 5).map((m) => (
            <Avatar key={m.id} name={m.name} size={30} />
          ))}
          {group.memberCount > 5 && (
            <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[var(--color-paper-tint)] text-xs font-semibold text-[var(--color-ink-soft)] ring-2 ring-[var(--color-paper-raised)]">
              +{group.memberCount - 5}
            </span>
          )}
        </div>
        {group.isLeader && <Badge tone="tint">Leader</Badge>}
      </div>

      <p className="mt-3 text-sm text-[var(--color-ink-soft)]">
        {group.memberCount} member{group.memberCount === 1 ? "" : "s"}
      </p>
    </Link>
  );
}
