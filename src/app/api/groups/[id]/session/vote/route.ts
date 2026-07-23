import { NextResponse } from "next/server";
import { requireUser, badRequest, serverError } from "@/lib/api";
import { voteSchema } from "@/lib/validation";
import { recordVote, getSessionState } from "@/lib/session";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireUser("vote");
  if (guard.error) return guard.error;
  const userId = guard.user.id;
  const { id: groupId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid request body");
  }

  const parsed = voteSchema.safeParse(body);
  if (!parsed.success) return badRequest("Validation failed");

  try {
    const result = await recordVote(
      userId,
      parsed.data.sessionId,
      parsed.data.movieId,
      parsed.data.vote,
    );
    if ("error" in result && result.error) return badRequest(result.error);

    const state = await getSessionState(userId, groupId, parsed.data.sessionId);
    return NextResponse.json({ ok: true, state });
  } catch (err) {
    console.error("vote error", err);
    return serverError("Could not record your vote");
  }
}
