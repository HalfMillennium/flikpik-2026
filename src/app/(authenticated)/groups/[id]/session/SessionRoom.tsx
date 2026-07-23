"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SessionState } from "@/lib/session";
import { SwipeCard } from "@/components/movies/SwipeCard";
import { VotingProgress } from "@/components/groups/VotingProgress";
import { WinnerReveal } from "@/components/groups/WinnerReveal";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/providers/ToastProvider";

export function SessionRoom({
  groupId,
  currentUserId,
  initialState,
  groupName,
}: {
  groupId: string;
  currentUserId: string;
  initialState: SessionState;
  groupName: string;
}) {
  const [state, setState] = useState<SessionState>(initialState);
  const toast = useToast();

  // ── real-time: SSE with polling fallback ──────────────────────────────
  useEffect(() => {
    let es: EventSource | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (poll) return;
      poll = setInterval(async () => {
        try {
          const res = await fetch(`/api/groups/${groupId}/session`);
          if (res.ok) {
            const data = await res.json();
            if (data.state) setState(data.state);
          }
        } catch {
          /* ignore */
        }
      }, 2000);
    };

    try {
      es = new EventSource(`/api/groups/${groupId}/session/events`);
      es.addEventListener("state", (e) => {
        try {
          setState(JSON.parse((e as MessageEvent).data));
        } catch {
          /* ignore */
        }
      });
      es.onerror = () => {
        es?.close();
        startPolling();
      };
    } catch {
      startPolling();
    }

    return () => {
      es?.close();
      if (poll) clearInterval(poll);
    };
  }, [groupId]);

  const setReady = useCallback(async () => {
    const res = await fetch(`/api/groups/${groupId}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ready", sessionId: state.id }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.state) setState(data.state);
    }
  }, [groupId, state.id]);

  const forceStart = useCallback(async () => {
    const res = await fetch(`/api/groups/${groupId}/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "force_start" }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.state) setState(data.state);
    } else {
      toast("Could not start yet", "error");
    }
  }, [groupId, toast]);

  if (state.status === "decided" && state.winner) {
    return (
      <WinnerReveal
        title={state.winner.title}
        posterPath={state.winner.posterPath}
        groupId={groupId}
      />
    );
  }

  if (state.status === "no_consensus") {
    return <NoConsensus state={state} groupId={groupId} />;
  }

  if (state.status === "lobby") {
    return (
      <Lobby
        state={state}
        currentUserId={currentUserId}
        groupName={groupName}
        onReady={setReady}
        onForceStart={forceStart}
      />
    );
  }

  return (
    <Voting
      state={state}
      groupId={groupId}
      currentUserId={currentUserId}
      onVoted={setState}
    />
  );
}

// ── Lobby ────────────────────────────────────────────────────────────────
function Lobby({
  state,
  currentUserId,
  groupName,
  onReady,
  onForceStart,
}: {
  state: SessionState;
  currentUserId: string;
  groupName: string;
  onReady: () => void;
  onForceStart: () => void;
}) {
  const me = state.members.find((m) => m.id === currentUserId);
  const readyCount = state.members.filter((m) => m.isReady).length;

  return (
    <div className="mx-auto max-w-lg text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-[var(--color-red)]">
        {groupName}
      </p>
      <h1 className="type-display mt-1">Waiting for everyone</h1>
      <p className="mt-2 text-[var(--color-ink-soft)]">
        {state.movies.length} movies in the pool · first to {state.voteThreshold}{" "}
        {state.voteThreshold === 1 ? "vote" : "votes"} wins
      </p>

      <ul className="mt-8 space-y-2 text-left">
        {state.members.map((m) => (
          <li
            key={m.id}
            className="flex items-center gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-paper-raised)] px-4 py-3"
          >
            <Avatar name={m.name} size={36} />
            <span className="font-medium">
              {m.name}
              {m.id === currentUserId && " (you)"}
            </span>
            <span className="ml-auto">
              {m.isReady ? (
                <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-yay)]">
                  ✓ Ready
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-sm text-[var(--color-ink-soft)]">
                  <Spinner size={14} /> Not ready
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex flex-col items-center gap-3">
        {me && !me.isReady ? (
          <Button size="lg" onClick={onReady}>
            I&apos;m ready
          </Button>
        ) : (
          <p className="font-medium text-[var(--color-ink-soft)]">
            You&apos;re ready — {readyCount}/{state.members.length} in
          </p>
        )}
        {state.isLeader && (
          <Button variant="secondary" onClick={onForceStart}>
            Start now (skip waiting)
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Voting ───────────────────────────────────────────────────────────────
function Voting({
  state,
  groupId,
  currentUserId,
  onVoted,
}: {
  state: SessionState;
  groupId: string;
  currentUserId: string;
  onVoted: (s: SessionState) => void;
}) {
  const votedSet = useMemo(
    () => new Set(state.myVotedMovieIds),
    [state.myVotedMovieIds],
  );
  const queue = state.movies.filter((m) => !votedSet.has(m.id));
  const current = queue[0];
  const doneCount = state.members.filter((m) => m.isDoneVoting).length;
  const totalVoted = state.movies.length - queue.length;
  const busy = useRef(false);

  async function vote(vote: "yay" | "nay") {
    if (!current || busy.current) return;
    busy.current = true;
    try {
      const res = await fetch(`/api/groups/${groupId}/session/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: state.id, movieId: current.id, vote }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.state) onVoted(data.state);
      }
    } finally {
      busy.current = false;
    }
  }

  // Finished my own cards → waiting screen.
  if (!current) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center py-12 text-center">
        <h1 className="type-display mb-2">Nice picks!</h1>
        <p className="mb-8 text-[var(--color-ink-soft)]">
          You&apos;ve voted on every movie. Waiting for the rest of the group…
        </p>
        <VotingProgress
          done={doneCount}
          total={state.members.length}
          size={96}
          label={`${state.members.length - doneCount} still voting`}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[500px]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex-1">
          <div className="text-sm font-medium text-[var(--color-ink-soft)]">
            Movie {totalVoted + 1} of {state.movies.length}
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-line)]">
            <div
              className="h-full rounded-full bg-[var(--color-red)] transition-all"
              style={{
                width: `${((totalVoted + 1) / state.movies.length) * 100}%`,
              }}
            />
          </div>
        </div>
        <div className="ml-4">
          <VotingProgress
            done={doneCount}
            total={state.members.length}
            size={52}
          />
        </div>
      </div>

      <SwipeCard key={current.id} movie={current} onVote={vote} />

      <div className="mt-6 flex items-center justify-center gap-6">
        <button
          onClick={() => vote("nay")}
          aria-label="Nay"
          className="flex h-16 w-16 items-center justify-center rounded-full border-2 bg-[var(--color-paper-raised)] shadow-[var(--shadow-card)] transition-transform hover:scale-105"
          style={{ borderColor: "var(--color-nay)", color: "var(--color-nay)" }}
        >
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
            <path d="M7 7l14 14M21 7L7 21" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </button>
        <button
          onClick={() => vote("yay")}
          aria-label="Yay"
          className="flex h-16 w-16 items-center justify-center rounded-full border-2 bg-[var(--color-paper-raised)] shadow-[var(--shadow-card)] transition-transform hover:scale-105"
          style={{ borderColor: "var(--color-yay)", color: "var(--color-yay)" }}
        >
          <svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden>
            <path d="M6 15l6 6 12-13" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── No consensus ─────────────────────────────────────────────────────────
function NoConsensus({
  state,
  groupId,
}: {
  state: SessionState;
  groupId: string;
}) {
  const top = [...state.movies].sort((a, b) => b.voteCount - a.voteCount)[0];
  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <h1 className="type-display">No consensus reached</h1>
      <p className="mt-2 text-[var(--color-ink-soft)]">
        No movie got enough votes this time.
      </p>
      {top && top.voteCount > 0 && (
        <div className="mt-6 rounded-xl border border-[var(--color-line)] bg-[var(--color-paper-raised)] p-4">
          <div className="text-xs uppercase tracking-widest text-[var(--color-red)]">
            Closest pick
          </div>
          <div className="mt-1 type-title">{top.title}</div>
          <div className="text-sm text-[var(--color-ink-soft)]">
            {top.voteCount} vote{top.voteCount === 1 ? "" : "s"}
          </div>
        </div>
      )}
      <div className="mt-8 flex justify-center gap-3">
        <ButtonLink href={`/groups/${groupId}`} variant="secondary">
          Back to group
        </ButtonLink>
        {state.isLeader && (
          <ButtonLink href={`/groups/${groupId}`}>Try again</ButtonLink>
        )}
      </div>
    </div>
  );
}
