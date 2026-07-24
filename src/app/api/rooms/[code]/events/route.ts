import { getRoomState, roomFingerprint } from "@/lib/rooms";

export const dynamic = "force-dynamic";

/**
 * SSE stream of room state. Same DB-poll + fingerprint-diff pattern as the
 * account session stream, but auth is the participant token passed as a query
 * param (`?t=`) — an accepted capability URL, since the token *is* the seat.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const token = new URL(req.url).searchParams.get("t") ?? undefined;

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      let last = "";
      const tick = async () => {
        if (closed) return;
        try {
          const state = await getRoomState(code, token);
          if (!state) {
            send("gone", {});
            return;
          }
          const fp = roomFingerprint(state);
          if (fp !== last) {
            last = fp;
            send("state", state);
          }
        } catch (err) {
          console.error("room SSE tick error", err);
        }
      };

      await tick();
      const interval = setInterval(tick, 2000);
      const heartbeat = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(": ping\n\n"));
      }, 15000);

      const cleanup = () => {
        closed = true;
        clearInterval(interval);
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      req.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
