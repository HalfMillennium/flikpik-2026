import { NextResponse } from "next/server";
import { requireUser, badRequest, serverError } from "@/lib/api";
import { groupActionSchema } from "@/lib/validation";
import {
  getGroupsForUser,
  createGroup,
  joinGroup,
  leaveGroup,
} from "@/lib/groups";

export async function GET() {
  const guard = await requireUser("groups");
  if (guard.error) return guard.error;
  try {
    const groups = await getGroupsForUser(guard.user.id);
    return NextResponse.json({ groups });
  } catch (err) {
    console.error("groups list error", err);
    return serverError("Could not load your groups");
  }
}

export async function POST(req: Request) {
  const guard = await requireUser("groups");
  if (guard.error) return guard.error;
  const userId = guard.user.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid request body");
  }

  const parsed = groupActionSchema.safeParse(body);
  if (!parsed.success) return badRequest("Validation failed");

  try {
    if (parsed.data.action === "create") {
      const group = await createGroup(userId, parsed.data.name.trim());
      return NextResponse.json({ ok: true, group }, { status: 201 });
    }

    if (parsed.data.action === "join") {
      const result = await joinGroup(userId, parsed.data.inviteCode);
      if ("error" in result && result.error) return badRequest(result.error);
      return NextResponse.json({ ok: true, group: result.group });
    }

    // leave
    const result = await leaveGroup(userId, parsed.data.groupId);
    if ("error" in result && result.error) return badRequest(result.error);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("group action error", err);
    return serverError("Could not complete that action");
  }
}
