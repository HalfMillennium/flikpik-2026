import { auth } from "@/lib/auth";
import { getGroupsForUser } from "@/lib/groups";
import { GroupCard } from "@/components/groups/GroupCard";
import { GroupActions } from "./GroupActions";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = { title: "Groups" };

export default async function GroupsPage() {
  const session = await auth();
  const groups = await getGroupsForUser(session!.user.id);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="type-display">Your crews</h1>
        <GroupActions />
      </div>

      {groups.length === 0 ? (
        <EmptyState
          title="No groups yet"
          body="Create one or join a friend's with an invite code. You need a crew to start a movie-night session."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <GroupCard key={g.id} group={g} />
          ))}
        </div>
      )}
    </div>
  );
}
