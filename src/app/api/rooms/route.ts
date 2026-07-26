import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { limitByUserOrIp, badRequest, serverError } from "@/lib/api";
import { createRoomSchema } from "@/lib/validation";
import { createRoom } from "@/lib/rooms";

// Create a room. No account required — authority is the returned host token,
// which the browser stores. Signed-in users may omit the nickname (we use
// their account name) and get their seat linked to their account.
export async function POST(req: Request) {
  const guard = await limitByUserOrIp(req, "room-create");
  if ("error" in guard) return guard.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid request body");
  }

  const parsed = createRoomSchema.safeParse(body);
  if (!parsed.success) return badRequest("Validation failed");

  const session = await auth();
  const nickname =
    parsed.data.nickname ??
    session?.user?.name ??
    session?.user?.username;
  if (!nickname) return badRequest("Enter a nickname");

  try {
    const room = await createRoom(
      nickname,
      parsed.data.tmdbIds ?? [],
      session?.user?.id,
    );
    return NextResponse.json(room, { status: 201 });
  } catch (err) {
    console.error("create room error", err);
    return serverError("Could not create the room");
  }
}
