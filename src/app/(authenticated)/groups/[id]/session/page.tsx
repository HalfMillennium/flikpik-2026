import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSessionState } from "@/lib/session";
import { getGroupDetail } from "@/lib/groups";
import { SessionRoom } from "./SessionRoom";

export const metadata = { title: "Decision session" };

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const group = await getGroupDetail(userId, id);
  if (!group) notFound();

  const state = await getSessionState(userId, id);
  if (!state) {
    // No session — bounce back to the group page.
    redirect(`/groups/${id}`);
  }

  return (
    <SessionRoom
      groupId={id}
      currentUserId={userId}
      initialState={state}
      groupName={group.name}
    />
  );
}
