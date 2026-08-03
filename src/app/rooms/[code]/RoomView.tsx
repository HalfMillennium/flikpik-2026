"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { RoomState } from "@/lib/rooms";
import { SwipeCard } from "@/components/movies/SwipeCard";
import { VotingProgress } from "@/components/groups/VotingProgress";
import { WinnerReveal } from "@/components/groups/WinnerReveal";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Spinner } from "@/components/ui/Spinner";
import { Modal } from "@/components/ui/Modal";
import { Chip } from "@/components/ui/Chip";
import { Switch } from "@/components/ui/Switch";
import { Field } from "@/components/ui/Field";
import { SearchBar } from "@/components/movies/SearchBar";
import { useToast } from "@/components/providers/ToastProvider";
import { useGuest } from "@/components/providers/GuestProvider";
import {
  readRoomCreds,
  saveRoomCreds,
  readHostFragment,
  type RoomCreds,
} from "@/lib/room-client";
import {
  MPAA_RATINGS,
  type DecisionRule,
  type MpaaRating,
} from "@/lib/utils";

export function RoomView({ code }: { code: string }) {
  const [creds, setCreds] = useState<RoomCreds | null>(null);
  const [state, setState] = useState<RoomState | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [gone, setGone] = useState(false);

  // Hydrate creds (and any #host= escape-hatch fragment) on mount.
  useEffect(() => {
    const existing = readRoomCreds(code);
    const hostFrag = readHostFragment();
    if (existing && hostFrag && !existing.hostToken) {
      const merged = { ...existing, hostToken: hostFrag };
      saveRoomCreds(code, merged);
      setCreds(merged);
    } else {
      setCreds(existing);
    }
    setHydrated(true);
  }, [code]);

  // Realtime: SSE keyed on the participant token, with a polling fallback.
  useEffect(() => {
    if (!creds?.participantToken) return;
    const token = creds.participantToken;
    let es: EventSource | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (poll) return;
      poll = setInterval(async () => {
        try {
          const res = await fetch(`/api/rooms/${code}`, {
            headers: { "x-participant-token": token },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.state) setState(data.state);
            else setGone(true);
          }
        } catch {
          /* ignore */
        }
      }, 2000);
    };

    try {
      es = new EventSource(`/api/rooms/${code}/events?t=${encodeURIComponent(token)}`);
      es.addEventListener("state", (e) => {
        try {
          setState(JSON.parse((e as MessageEvent).data));
        } catch {
          /* ignore */
        }
      });
      es.addEventListener("gone", () => setGone(true));
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
  }, [code, creds?.participantToken]);

  const applyState = useCallback((next: RoomState) => setState(next), []);

  if (!hydrated) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size={28} />
      </div>
    );
  }

  if (gone) {
    return (
      <div className="py-16 text-center">
        <h1 className="type-display">This room has ended</h1>
        <p className="mt-2 text-[var(--color-ink-soft)]">
          Rooms expire after a while, or the host closed it.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <ButtonLink href="/rooms/new">Start a new one</ButtonLink>
          <ButtonLink href="/" variant="secondary">
            Back to flikpik
          </ButtonLink>
        </div>
      </div>
    );
  }

  // Not joined yet → the join gate.
  if (!creds) {
    return <JoinGate code={code} onJoined={setCreds} />;
  }

  if (!state) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size={28} />
      </div>
    );
  }

  if (state.status === "decided" && state.winner) {
    return (
      <WinnerReveal
        title={state.winner.title}
        posterPath={state.winner.posterPath}
        eyebrow={
          state.decisionRule === "consensus"
            ? "Everyone agreed"
            : "The room picked"
        }
        actions={
          <>
            <ButtonLink href="/rooms/new">Start another</ButtonLink>
            <ButtonLink href="/" variant="secondary">
              Done
            </ButtonLink>
          </>
        }
      />
    );
  }

  if (state.status === "no_consensus") {
    return <NoConsensus state={state} />;
  }

  if (state.status === "lobby") {
    return (
      <Lobby code={code} creds={creds} state={state} onState={applyState} />
    );
  }

  return <Voting code={code} creds={creds} state={state} onState={applyState} />;
}

// ── Join gate ──────────────────────────────────────────────────────────────
function JoinGate({
  code,
  onJoined,
}: {
  code: string;
  onJoined: (c: RoomCreds) => void;
}) {
  const guest = useGuest();
  const { data: session } = useSession();
  const user = session?.user;
  const accountName = user ? (user.name ?? user.username) : null;
  const [nickname, setNickname] = useState("");
  const [bringList, setBringList] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function join() {
    setError("");
    if (!accountName && !nickname.trim()) return setError("Enter a nickname.");
    setBusy(true);
    const tmdbIds =
      bringList && guest.list.length
        ? guest.list.map((m) => m.tmdbId)
        : undefined;
    const res = await fetch(`/api/rooms/${code}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nickname: accountName ? undefined : nickname.trim(),
        tmdbIds,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || "Could not join this room.");
    const creds: RoomCreds = {
      participantId: data.participantId,
      participantToken: data.participantToken,
      nickname: data.nickname ?? accountName ?? nickname.trim(),
    };
    saveRoomCreds(code, creds);
    onJoined(creds);
  }

  return (
    <div className="mx-auto max-w-sm py-10">
      <p className="text-center text-sm font-semibold uppercase tracking-widest text-[var(--color-red)]">
        Room {code}
      </p>
      <h1 className="type-display mt-1 text-center">Join the movie night</h1>
      <div className="mt-8 space-y-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-raised)] p-6">
        {accountName ? (
          <>
            <p className="text-sm">
              Joining as <span className="font-semibold">{accountName}</span>.
            </p>
            {error && (
              <p className="text-sm text-[var(--color-red-deep)]">{error}</p>
            )}
          </>
        ) : (
          <Field
            label="Your nickname"
            value={nickname}
            onChange={setNickname}
            placeholder="e.g. Alex"
            error={error}
            maxLength={40}
          />
        )}
        {guest.list.length > 0 && (
          <Switch checked={bringList} onChange={setBringList}>
            Add my saved list ({guest.list.length}) to the pool
          </Switch>
        )}
        <Button onClick={join} disabled={busy} className="w-full">
          {busy ? "Joining…" : "Join room"}
        </Button>
      </div>
    </div>
  );
}

// ── Lobby ────────────────────────────────────────────────────────────────
function Lobby({
  code,
  creds,
  state,
  onState,
}: {
  code: string;
  creds: RoomCreds;
  state: RoomState;
  onState: (s: RoomState) => void;
}) {
  const toast = useToast();
  const [adderOpen, setAdderOpen] = useState(false);
  const [mpaaOpen, setMpaaOpen] = useState(false);

  const me = state.participants.find((p) => p.id === creds.participantId);

  async function ready() {
    const res = await fetch(`/api/rooms/${code}/ready`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantToken: creds.participantToken }),
    });
    if (res.ok) onState((await res.json()).state);
  }

  async function kick(participantId: string) {
    if (!creds.hostToken) return;
    const res = await fetch(`/api/rooms/${code}/kick`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-participant-token": creds.participantToken,
      },
      body: JSON.stringify({ hostToken: creds.hostToken, participantId }),
    });
    if (res.ok) onState((await res.json()).state);
  }

  function copyJoinLink() {
    navigator.clipboard
      ?.writeText(`${window.location.origin}/rooms/${code}`)
      .then(() => toast("Join link copied", "success"))
      .catch(() => toast("Couldn't copy", "error"));
  }
  function copyHostLink() {
    if (!creds.hostToken) return;
    navigator.clipboard
      ?.writeText(
        `${window.location.origin}/rooms/${code}#host=${creds.hostToken}`,
      )
      .then(() => toast("Host link copied — keep it private", "success"))
      .catch(() => toast("Couldn't copy", "error"));
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--color-red)]">
          Movie night lobby
        </p>
        <button
          onClick={copyJoinLink}
          className="mt-2 inline-flex flex-col items-center rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-raised)] px-8 py-3 transition-colors hover:border-[var(--color-red)]"
          aria-label={`Copy join link for room ${code}`}
        >
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ink-soft)]">
            Room code · tap to copy link
          </span>
          <span className="font-mono text-3xl font-bold tracking-[0.25em]">
            {code}
          </span>
        </button>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="type-title">In the room</h2>
        <span className="text-sm text-[var(--color-ink-soft)]">
          {state.movies.length} movie{state.movies.length === 1 ? "" : "s"} in the pool
        </span>
      </div>

      <ul className="mt-3 space-y-2">
        {state.participants.map((p) => (
          <li
            key={p.id}
            className="flex items-center gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-paper-raised)] px-4 py-3"
          >
            <Avatar name={p.nickname} size={36} />
            <span className="font-medium">
              {p.nickname}
              {p.id === creds.participantId && " (you)"}
            </span>
            {p.isHost && (
              <span className="rounded-full bg-[var(--color-red-tint)] px-2 py-0.5 text-xs font-semibold text-[var(--color-red-deep)]">
                Host
              </span>
            )}
            <span className="ml-auto flex items-center gap-2">
              {p.isReady && (
                <span className="text-sm font-semibold text-[var(--color-yay)]">
                  ✓ Ready
                </span>
              )}
              {state.isHost && !p.isHost && (
                <button
                  onClick={() => kick(p.id)}
                  aria-label={`Remove ${p.nickname}`}
                  className="text-[var(--color-ink-soft)] hover:text-[var(--color-red-deep)]"
                >
                  ✕
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button variant="secondary" onClick={() => setAdderOpen(true)}>
          + Add movies
        </Button>
        {me && !me.isReady && (
          <Button variant="secondary" onClick={ready}>
            I&apos;m ready
          </Button>
        )}
        {state.isHost && (
          <Button onClick={() => setMpaaOpen(true)}>▶ Start voting</Button>
        )}
      </div>

      {state.isHost && creds.hostToken && (
        <p className="mt-4 text-center">
          <button
            onClick={copyHostLink}
            className="text-xs font-medium text-[var(--color-ink-soft)] underline underline-offset-2 hover:text-[var(--color-red)]"
          >
            Copy host link (to rejoin as host from another device)
          </button>
        </p>
      )}

      <PoolAdder
        code={code}
        creds={creds}
        open={adderOpen}
        onClose={() => setAdderOpen(false)}
        onState={onState}
      />
      {state.isHost && (
        <StartModal
          code={code}
          creds={creds}
          open={mpaaOpen}
          onClose={() => setMpaaOpen(false)}
          onState={onState}
        />
      )}
    </div>
  );
}

// ── Start (MPAA filter) modal ──────────────────────────────────────────────
function StartModal({
  code,
  creds,
  open,
  onClose,
  onState,
}: {
  code: string;
  creds: RoomCreds;
  open: boolean;
  onClose: () => void;
  onState: (s: RoomState) => void;
}) {
  const [filters, setFilters] = useState<Set<MpaaRating>>(new Set(MPAA_RATINGS));
  const [rule, setRule] = useState<DecisionRule>("majority");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function toggle(r: MpaaRating) {
    setFilters((s) => {
      const next = new Set(s);
      next.has(r) ? next.delete(r) : next.add(r);
      return next;
    });
  }

  async function start() {
    setError("");
    if (filters.size === 0) return setError("Pick at least one rating.");
    setBusy(true);
    const res = await fetch(`/api/rooms/${code}/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-participant-token": creds.participantToken,
      },
      body: JSON.stringify({
        hostToken: creds.hostToken,
        mpaaFilters: Array.from(filters),
        decisionRule: rule,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || "Could not start.");
    onState(data.state);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Start voting"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={start} disabled={busy}>
            {busy ? "Starting…" : "Start"}
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-[var(--color-ink-soft)]">
        Which ratings should be in the pool?
      </p>
      <div className="flex flex-wrap gap-2">
        {MPAA_RATINGS.map((r) => (
          <Chip key={r} active={filters.has(r)} onClick={() => toggle(r)}>
            {r}
          </Chip>
        ))}
      </div>
      <p className="mb-2 mt-5 text-sm font-medium">How does a movie win?</p>
      <div className="flex flex-wrap gap-2">
        <Chip active={rule === "majority"} onClick={() => setRule("majority")}>
          Majority
        </Chip>
        <Chip
          active={rule === "consensus"}
          onClick={() => setRule("consensus")}
        >
          Everyone must agree
        </Chip>
      </div>
      <p className="mt-2 text-xs text-[var(--color-ink-soft)]">
        {rule === "majority"
          ? "First movie to get a yes from more than half the room wins."
          : "A movie only wins if every single person says yes to it."}
      </p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-[var(--color-red-deep)]">
          {error}
        </p>
      )}
    </Modal>
  );
}

// ── Pool adder (search + add) ──────────────────────────────────────────────
type SearchResult = {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
  tmdbRating: string | null;
};

function PoolAdder({
  code,
  creds,
  open,
  onClose,
  onState,
}: {
  code: string;
  creds: RoomCreds;
  open: boolean;
  onClose: () => void;
  onState: (s: RoomState) => void;
}) {
  const guest = useGuest();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState<Set<number>>(new Set());
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(debounce.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/movies/search?q=${encodeURIComponent(query)}`,
        );
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounce.current);
  }, [query]);

  async function contribute(tmdbIds: number[]) {
    const res = await fetch(`/api/rooms/${code}/contribute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participantToken: creds.participantToken,
        tmdbIds,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      onState(data.state);
      return true;
    }
    toast(data.error || "Could not add those movies", "error");
    return false;
  }

  return (
    <Modal open={open} onClose={onClose} title="Add movies to the pool">
      <div className="space-y-4">
        {guest.list.length > 0 && (
          <Button
            variant="secondary"
            className="w-full"
            onClick={async () => {
              const ok = await contribute(guest.list.map((m) => m.tmdbId));
              if (ok) toast("Added your saved list", "success");
            }}
          >
            Add my saved list ({guest.list.length})
          </Button>
        )}
        <SearchBar
          value={query}
          onChange={setQuery}
          loading={loading}
          placeholder="Search for a movie to add…"
        />
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {results.map((r) => {
            const isAdded = added.has(r.tmdbId);
            return (
              <div
                key={r.tmdbId}
                className="flex items-center gap-3 rounded-lg border border-[var(--color-line)] p-2"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {r.title}
                  {r.releaseDate && (
                    <span className="text-[var(--color-ink-soft)]">
                      {" "}
                      ({r.releaseDate.slice(0, 4)})
                    </span>
                  )}
                </span>
                <Button
                  size="sm"
                  variant={isAdded ? "secondary" : "primary"}
                  disabled={isAdded}
                  onClick={async () => {
                    setAdded((s) => new Set(s).add(r.tmdbId));
                    const ok = await contribute([r.tmdbId]);
                    if (!ok) {
                      setAdded((s) => {
                        const n = new Set(s);
                        n.delete(r.tmdbId);
                        return n;
                      });
                    }
                  }}
                >
                  {isAdded ? "✓ Added" : "Add"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

// ── Voting ───────────────────────────────────────────────────────────────
function Voting({
  code,
  creds,
  state,
  onState,
}: {
  code: string;
  creds: RoomCreds;
  state: RoomState;
  onState: (s: RoomState) => void;
}) {
  const votedSet = useMemo(
    () => new Set(state.myVotedMovieIds),
    [state.myVotedMovieIds],
  );
  const queue = state.movies.filter((m) => !votedSet.has(m.id));
  const current = queue[0];
  const doneCount = state.participants.filter((p) => p.isDoneVoting).length;
  const totalVoted = state.movies.length - queue.length;
  const busy = useRef(false);

  async function vote(v: "yay" | "nay") {
    if (!current || busy.current) return;
    busy.current = true;
    try {
      const res = await fetch(`/api/rooms/${code}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantToken: creds.participantToken,
          movieId: current.id,
          vote: v,
        }),
      });
      if (res.ok) onState((await res.json()).state);
    } finally {
      busy.current = false;
    }
  }

  if (!current) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center py-12 text-center">
        <h1 className="type-display mb-2">Nice picks!</h1>
        <p className="mb-8 text-[var(--color-ink-soft)]">
          You&apos;ve voted on every movie. Waiting for the rest of the room…
        </p>
        <VotingProgress
          done={doneCount}
          total={state.participants.length}
          size={96}
          label={`${state.participants.length - doneCount} still voting`}
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
            total={state.participants.length}
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

// ── No consensus ───────────────────────────────────────────────────────────
function NoConsensus({ state }: { state: RoomState }) {
  const top = [...state.movies].sort((a, b) => b.voteCount - a.voteCount)[0];
  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <h1 className="type-display">No consensus reached</h1>
      <p className="mt-2 text-[var(--color-ink-soft)]">
        {state.decisionRule === "consensus"
          ? "No movie got a yes from everyone this time."
          : "No movie got enough votes this time."}
      </p>
      <Chip as="span" className="mt-3">
        {state.decisionRule === "consensus"
          ? "Rule: everyone must agree"
          : "Rule: majority vote"}
      </Chip>
      {top && top.voteCount > 0 && (
        <div className="mt-6 rounded-xl border border-[var(--color-line)] bg-[var(--color-paper-raised)] p-4">
          <div className="text-xs uppercase tracking-widest text-[var(--color-red)]">
            Closest pick
          </div>
          <div className="type-title mt-1">{top.title}</div>
          <div className="text-sm text-[var(--color-ink-soft)]">
            {top.voteCount} vote{top.voteCount === 1 ? "" : "s"}
          </div>
        </div>
      )}
      <div className="mt-8 flex justify-center gap-3">
        <ButtonLink href="/rooms/new">Start another</ButtonLink>
        <ButtonLink href="/" variant="secondary">
          Back to flikpik
        </ButtonLink>
      </div>
    </div>
  );
}
