import { NextResponse } from "next/server";
import { limitByUserOrIp, serverError } from "@/lib/api";
import { getRoomState } from "@/lib/rooms";

// Current room state. The participant token (via header) determines isHost /
// myVotedMovieIds; without it you still get public room state.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const guard = await limitByUserOrIp(req, "room-read");
  if ("error" in guard) return guard.error;

  const { code } = await params;
  const token = req.headers.get("x-participant-token") ?? undefined;

  try {
    const state = await getRoomState(code, token);
    return NextResponse.json({ state });
  } catch (err) {
    console.error("room state error", err);
    return serverError("Could not load the room");
  }
}
