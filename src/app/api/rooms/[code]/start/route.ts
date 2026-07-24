import { NextResponse } from "next/server";
import { limitByUserOrIp, badRequest, serverError } from "@/lib/api";
import { roomStartSchema } from "@/lib/validation";
import { startRoom, getRoomState } from "@/lib/rooms";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const guard = await limitByUserOrIp(req, "room");
  if ("error" in guard) return guard.error;

  const { code } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid request body");
  }

  const parsed = roomStartSchema.safeParse(body);
  if (!parsed.success) return badRequest("Validation failed");

  try {
    const result = await startRoom(
      code,
      parsed.data.hostToken,
      parsed.data.mpaaFilters,
    );
    if ("error" in result && result.error) return badRequest(result.error);
    // Return state scoped to the caller (their participant token in a header).
    const token = req.headers.get("x-participant-token") ?? undefined;
    const state = await getRoomState(code, token);
    return NextResponse.json({ ok: true, state });
  } catch (err) {
    console.error("room start error", err);
    return serverError("Could not start the session");
  }
}
