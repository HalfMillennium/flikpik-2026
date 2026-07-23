/**
 * Seed script — `npm run seed`.
 *
 * Creates 4 test users, fetches 10 popular movies from TMDB, distributes
 * them across watch lists (overlapping so sessions have a pool), creates
 * one group with all users, and adds sample reviews.
 *
 * Requires DATABASE_URL and TMDB_ACCESS_TOKEN in .env.local.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { generateInviteCode } from "../lib/utils";

const TMDB_BASE = "https://api.themoviedb.org/3";

async function tmdb<T>(path: string): Promise<T> {
  const res = await fetch(`${TMDB_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${process.env.TMDB_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`TMDB ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

function extractMpaa(releaseDates: {
  results?: { iso_3166_1: string; release_dates?: { certification?: string }[] }[];
}): string {
  const us = releaseDates?.results?.find((r) => r.iso_3166_1 === "US");
  const cert = us?.release_dates?.find((d) => d.certification);
  return cert?.certification || "NR";
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing");
  if (!process.env.TMDB_ACCESS_TOKEN) throw new Error("TMDB_ACCESS_TOKEN missing");

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql, { schema });

  console.log("🎬 Seeding flikpik…");

  // 1. Users
  const passwordHash = await bcrypt.hash("password123", 12);
  const userSeed = [
    { username: "alice", displayName: "Alice", email: "alice@example.com" },
    { username: "bob", displayName: "Bob", email: "bob@example.com" },
    { username: "carol", displayName: "Carol", email: "carol@example.com" },
    { username: "dave", displayName: "Dave", email: "dave@example.com" },
  ];

  const users = [];
  for (const u of userSeed) {
    const [user] = await db
      .insert(schema.users)
      .values({ ...u, passwordHash })
      .onConflictDoUpdate({
        target: schema.users.username,
        set: { displayName: u.displayName },
      })
      .returning();
    users.push(user);
    console.log(`  · user @${user.username}`);
  }
  const [alice, bob, carol, dave] = users;

  // 2. Popular movies
  const popular = await tmdb<{ results: { id: number }[] }>(
    "/movie/popular?page=1",
  );
  const tmdbIds = popular.results.slice(0, 10).map((m) => m.id);

  const movies = [];
  for (const tmdbId of tmdbIds) {
    const detail = await tmdb<{
      id: number;
      title: string;
      overview: string;
      poster_path: string | null;
      backdrop_path: string | null;
      release_date: string;
      runtime: number | null;
      genres: { id: number; name: string }[];
      vote_average: number;
      release_dates?: Parameters<typeof extractMpaa>[0];
    }>(`/movie/${tmdbId}?append_to_response=release_dates`);

    const [movie] = await db
      .insert(schema.movies)
      .values({
        tmdbId: detail.id,
        title: detail.title,
        overview: detail.overview || null,
        posterPath: detail.poster_path,
        backdropPath: detail.backdrop_path,
        releaseDate: detail.release_date || null,
        runtime: detail.runtime ?? null,
        mpaaRating: extractMpaa(detail.release_dates ?? {}),
        genres: detail.genres ?? [],
        tmdbRating: detail.vote_average ? detail.vote_average.toFixed(1) : null,
      })
      .onConflictDoUpdate({
        target: schema.movies.tmdbId,
        set: { title: detail.title },
      })
      .returning();
    movies.push(movie);
    console.log(`  · movie ${movie.title}`);
  }

  // 3. Distribute movies across watch lists (overlapping).
  const distribution: [typeof alice, number[]][] = [
    [alice, [0, 1, 2, 3, 4, 5]],
    [bob, [2, 3, 4, 5, 6, 7]],
    [carol, [0, 2, 4, 6, 8]],
    [dave, [1, 3, 5, 7, 9]],
  ];
  for (const [user, indices] of distribution) {
    for (const i of indices) {
      await db
        .insert(schema.watchListEntries)
        .values({ userId: user.id, movieId: movies[i].id, status: "want_to_watch" })
        .onConflictDoNothing();
    }
  }
  console.log("  · distributed watch lists");

  // 4. Group with all four, alice as leader.
  const [group] = await db
    .insert(schema.groups)
    .values({
      name: "Movie Night Crew",
      inviteCode: generateInviteCode(),
      leaderId: alice.id,
    })
    .returning();
  for (const u of users) {
    await db
      .insert(schema.groupMembers)
      .values({ groupId: group.id, userId: u.id })
      .onConflictDoNothing();
  }
  console.log(`  · group "${group.name}" (invite ${group.inviteCode})`);

  // 5. Sample reviews.
  const reviewSeed = [
    { user: alice, movie: movies[0], rating: 5, body: "Absolutely loved this one — a perfect movie-night pick." },
    { user: bob, movie: movies[2], rating: 4, body: "Really solid. A couple slow moments but great overall." },
    { user: carol, movie: movies[4], rating: 3, body: "It was fine. Watchable but I wouldn't rush back to it." },
  ];
  for (const r of reviewSeed) {
    await db
      .insert(schema.reviews)
      .values({
        userId: r.user.id,
        movieId: r.movie.id,
        rating: r.rating,
        body: r.body,
      })
      .onConflictDoUpdate({
        target: [schema.reviews.userId, schema.reviews.movieId],
        set: { rating: r.rating, body: r.body },
      });

    // Recompute the movie's user average.
    const rows = await db
      .select({ rating: schema.reviews.rating })
      .from(schema.reviews)
      .where(eq(schema.reviews.movieId, r.movie.id));
    const avg =
      rows.reduce((s, x) => s + x.rating, 0) / (rows.length || 1);
    await db
      .update(schema.movies)
      .set({ userAvgRating: avg.toFixed(2) })
      .where(eq(schema.movies.id, r.movie.id));
  }
  console.log("  · added sample reviews");

  console.log("\n✅ Seed complete. Log in as alice / password123");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
