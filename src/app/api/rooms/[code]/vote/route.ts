import { NextResponse } from "next/server";
import { limitByUserOrIp, badRequest, serverError } from "@/lib/api";
import { roomVoteSchema } from "@/lib/validation";
import { recordRoomVote, getRoomState } from "@/lib/rooms";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const guard = await limitByUserOrIp(req, "room-vote");
  if ("error" in guard) return guard.error;

  const { code } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid request body");
  }

  const parsed = roomVoteSchema.safeParse(body);
  if (!parsed.success) return badRequest("Validation failed");

  try {
    const result = await recordRoomVote(
      code,
      parsed.data.participantToken,
      parsed.data.movieId,
      parsed.data.vote,
    );
    if ("error" in result && result.error) return badRequest(result.error);
    const state = await getRoomState(code, parsed.data.participantToken);
    return NextResponse.json({ ok: true, state });
  } catch (err) {
    console.error("room vote error", err);
    return serverError("Could not record your vote");
  }
}
