import { NextResponse } from "next/server";
import { limitByUserOrIp, badRequest, serverError } from "@/lib/api";
import { createRoomSchema } from "@/lib/validation";
import { createRoom } from "@/lib/rooms";

// Create an anonymous room. No account required — authority is the returned
// host token, which the browser stores.
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

  try {
    const room = await createRoom(parsed.data.nickname, parsed.data.tmdbIds ?? []);
    return NextResponse.json(room, { status: 201 });
  } catch (err) {
    console.error("create room error", err);
    return serverError("Could not create the room");
  }
}
