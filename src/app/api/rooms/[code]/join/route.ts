import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { limitByUserOrIp, badRequest, serverError } from "@/lib/api";
import { joinRoomSchema } from "@/lib/validation";
import { joinRoom } from "@/lib/rooms";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  // Hard per-IP limit on joins — the join code is deliberately guessable.
  const guard = await limitByUserOrIp(req, "room-join");
  if ("error" in guard) return guard.error;

  const { code } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid request body");
  }

  const parsed = joinRoomSchema.safeParse(body);
  if (!parsed.success) return badRequest("Validation failed");

  // Signed-in users may omit the nickname; their account name is used and
  // the seat is linked to their account.
  const session = await auth();
  const nickname =
    parsed.data.nickname ??
    session?.user?.name ??
    session?.user?.username;
  if (!nickname) return badRequest("Enter a nickname");

  try {
    const result = await joinRoom(
      code,
      nickname,
      parsed.data.tmdbIds ?? [],
      session?.user?.id,
    );
    if ("error" in result && result.error) return badRequest(result.error);
    return NextResponse.json(result);
  } catch (err) {
    console.error("join room error", err);
    return serverError("Could not join the room");
  }
}
