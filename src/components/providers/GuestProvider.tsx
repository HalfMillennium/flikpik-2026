"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/**
 * Local-only guest library. Guests use flikpik without an account; their
 * watch list lives in localStorage and never touches the database. Account-
 * only features (groups, sessions, shared reviews) are gated elsewhere.
 */

export type GuestMovie = {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
  tmdbRating: string | null;
  status: "want_to_watch" | "watched";
  addedAt: number;
};

const LIST_KEY = "flikpik.guest.list.v1";
const MODE_KEY = "flikpik.guest.mode.v1";

type GuestContextValue = {
  ready: boolean;
  isGuest: boolean;
  enterGuestMode: () => void;
  exitGuestMode: () => void;
  list: GuestMovie[];
  has: (tmdbId: number) => boolean;
  statusOf: (tmdbId: number) => GuestMovie["status"] | null;
  add: (m: Omit<GuestMovie, "status" | "addedAt">) => void;
  remove: (tmdbId: number) => void;
  setStatus: (tmdbId: number, status: GuestMovie["status"]) => void;
  clear: () => void;
};

const GuestContext = createContext<GuestContextValue | null>(null);

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function GuestProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [list, setList] = useState<GuestMovie[]>([]);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    setIsGuest(read<boolean>(MODE_KEY, false));
    setList(read<GuestMovie[]>(LIST_KEY, []));
    setReady(true);
  }, []);

  // Sync across tabs.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LIST_KEY) setList(read<GuestMovie[]>(LIST_KEY, []));
      if (e.key === MODE_KEY) setIsGuest(read<boolean>(MODE_KEY, false));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = useCallback((next: GuestMovie[]) => {
    setList(next);
    try {
      window.localStorage.setItem(LIST_KEY, JSON.stringify(next));
    } catch {
      /* quota / private mode — keep in-memory */
    }
  }, []);

  const enterGuestMode = useCallback(() => {
    setIsGuest(true);
    try {
      window.localStorage.setItem(MODE_KEY, "true");
    } catch {
      /* ignore */
    }
  }, []);

  const exitGuestMode = useCallback(() => {
    setIsGuest(false);
    try {
      window.localStorage.setItem(MODE_KEY, "false");
    } catch {
      /* ignore */
    }
  }, []);

  const has = useCallback(
    (tmdbId: number) => list.some((m) => m.tmdbId === tmdbId),
    [list],
  );

  const statusOf = useCallback(
    (tmdbId: number) => list.find((m) => m.tmdbId === tmdbId)?.status ?? null,
    [list],
  );

  const add = useCallback<GuestContextValue["add"]>(
    (m) => {
      if (list.some((x) => x.tmdbId === m.tmdbId)) return;
      persist([
        ...list,
        { ...m, status: "want_to_watch", addedAt: Date.now() },
      ]);
    },
    [list, persist],
  );

  const remove = useCallback<GuestContextValue["remove"]>(
    (tmdbId) => persist(list.filter((m) => m.tmdbId !== tmdbId)),
    [list, persist],
  );

  const setStatus = useCallback<GuestContextValue["setStatus"]>(
    (tmdbId, status) =>
      persist(
        list.map((m) => (m.tmdbId === tmdbId ? { ...m, status } : m)),
      ),
    [list, persist],
  );

  const clear = useCallback(() => persist([]), [persist]);

  return (
    <GuestContext.Provider
      value={{
        ready,
        isGuest,
        enterGuestMode,
        exitGuestMode,
        list,
        has,
        statusOf,
        add,
        remove,
        setStatus,
        clear,
      }}
    >
      {children}
    </GuestContext.Provider>
  );
}

export function useGuest() {
  const ctx = useContext(GuestContext);
  if (!ctx) throw new Error("useGuest must be used within GuestProvider");
  return ctx;
}
