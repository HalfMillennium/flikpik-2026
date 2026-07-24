"use client";

/**
 * Client-side room credentials. The browser is the credential store — being
 * "the host" is just holding the host token, and reconnecting is just holding
 * the participant token. Nothing here touches the server.
 */

export type RoomCreds = {
  participantId: string;
  participantToken: string;
  nickname: string;
  hostToken?: string;
};

const keyFor = (code: string) => `flikpik.room.${code.toUpperCase()}`;

export function saveRoomCreds(code: string, creds: RoomCreds): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(keyFor(code), JSON.stringify(creds));
  } catch {
    /* private mode / quota — keep in memory only */
  }
}

export function readRoomCreds(code: string): RoomCreds | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(keyFor(code));
    return raw ? (JSON.parse(raw) as RoomCreds) : null;
  } catch {
    return null;
  }
}

export function clearRoomCreds(code: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(keyFor(code));
  } catch {
    /* ignore */
  }
}

/** Read a `#host=<token>` escape-hatch fragment (host recovery / hand-off). */
export function readHostFragment(): string | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  return params.get("host");
}
