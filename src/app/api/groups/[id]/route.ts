import { NextResponse } from "next/server";
import { requireUser, notFound, serverError } from "@/lib/api";
import { getGroupDetail } from "@/lib/groups";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireUser("groups");
  if (guard.error) return guard.error;

  const { id } = await params;
  try {
    const group = await getGroupDetail(guard.user.id, id);
    if (!group) return notFound("Group not found or you're not a member");
    return NextResponse.json({ group });
  } catch (err) {
    console.error("group detail error", err);
    return serverError("Could not load the group");
  }
}
