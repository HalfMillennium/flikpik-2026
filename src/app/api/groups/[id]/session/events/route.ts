import { auth } from "@/lib/auth";
import { getSessionState, stateFingerprint } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Server-Sent Events stream of session state. Polls the DB every 2s and
 * pushes a new `state` event whenever the fingerprint changes. The client
 * falls back to plain polling if the stream drops.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  const userId = session.user.id;
  const { id: groupId } = await params;

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

      let lastFingerprint = "";

      const tick = async () => {
        if (closed) return;
        try {
          const state = await getSessionState(userId, groupId);
          if (state) {
            const fp = stateFingerprint(state);
            if (fp !== lastFingerprint) {
              lastFingerprint = fp;
              send("state", state);
            }
          }
        } catch (err) {
          console.error("SSE tick error", err);
        }
      };

      // Initial push, then every 2s.
      await tick();
      const interval = setInterval(tick, 2000);
      // Heartbeat comment keeps the connection alive through proxies.
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
