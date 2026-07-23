import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, badRequest, serverError, notFound } from "@/lib/api";
import { startSessionSchema } from "@/lib/validation";
import {
  startSession,
  getSessionState,
  setReady,
  forceStart,
} from "@/lib/session";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start") }).merge(startSessionSchema),
  z.object({ action: z.literal("ready"), sessionId: z.string().uuid() }),
  z.object({ action: z.literal("force_start") }),
]);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireUser("session");
  if (guard.error) return guard.error;

  const { id } = await params;
  try {
    const state = await getSessionState(guard.user.id, id);
    return NextResponse.json({ state });
  } catch (err) {
    console.error("session state error", err);
    return serverError("Could not load the session");
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireUser("session");
  if (guard.error) return guard.error;
  const userId = guard.user.id;
  const { id: groupId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid request body");
  }

  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return badRequest("Validation failed");

  try {
    if (parsed.data.action === "start") {
      const result = await startSession(userId, groupId, parsed.data.mpaaFilters);
      if ("error" in result && result.error) return badRequest(result.error);
      const state = await getSessionState(userId, groupId, result.session!.id);
      return NextResponse.json({ ok: true, state });
    }

    if (parsed.data.action === "ready") {
      await setReady(userId, parsed.data.sessionId);
      const state = await getSessionState(userId, groupId, parsed.data.sessionId);
      return NextResponse.json({ ok: true, state });
    }

    // force_start
    const result = await forceStart(userId, groupId);
    if ("error" in result && result.error) return badRequest(result.error);
    const state = await getSessionState(userId, groupId);
    if (!state) return notFound("No session");
    return NextResponse.json({ ok: true, state });
  } catch (err) {
    console.error("session action error", err);
    return serverError("Could not update the session");
  }
}
