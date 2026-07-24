import { NextResponse } from "next/server";
import { limitByUserOrIp, badRequest, serverError } from "@/lib/api";
import { roomReadySchema } from "@/lib/validation";
import { setReady, getRoomState } from "@/lib/rooms";

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

  const parsed = roomReadySchema.safeParse(body);
  if (!parsed.success) return badRequest("Validation failed");

  try {
    const result = await setReady(code, parsed.data.participantToken);
    if ("error" in result && result.error) return badRequest(result.error);
    const state = await getRoomState(code, parsed.data.participantToken);
    return NextResponse.json({ ok: true, state });
  } catch (err) {
    console.error("room ready error", err);
    return serverError("Could not update your status");
  }
}
