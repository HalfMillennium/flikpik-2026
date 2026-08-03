import { relations } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── users ────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── movies ───────────────────────────────────────────────────────────────
export type Genre = { id: number; name: string };

export const movies = pgTable(
  "movies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tmdbId: integer("tmdb_id").notNull().unique(),
    title: varchar("title", { length: 500 }).notNull(),
    overview: text("overview"),
    posterPath: varchar("poster_path", { length: 500 }),
    backdropPath: varchar("backdrop_path", { length: 500 }),
    releaseDate: date("release_date"),
    runtime: integer("runtime"),
    mpaaRating: varchar("mpaa_rating", { length: 10 }).default("NR"),
    genres: jsonb("genres").$type<Genre[]>().default([]),
    tmdbRating: numeric("tmdb_rating", { precision: 3, scale: 1 }),
    userAvgRating: numeric("user_avg_rating", { precision: 3, scale: 2 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("idx_movies_tmdb").on(t.tmdbId)],
);

// ── watch_list_entries ───────────────────────────────────────────────────
export const watchListEntries = pgTable(
  "watch_list_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    movieId: uuid("movie_id")
      .notNull()
      .references(() => movies.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 }).default("want_to_watch").notNull(),
    addedAt: timestamp("added_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("uq_watch_list_user_movie").on(t.userId, t.movieId),
    index("idx_watch_list_user").on(t.userId, t.status),
  ],
);

// ── reviews ──────────────────────────────────────────────────────────────
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    movieId: uuid("movie_id")
      .notNull()
      .references(() => movies.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("uq_reviews_user_movie").on(t.userId, t.movieId),
    index("idx_reviews_movie").on(t.movieId),
    check("reviews_rating_range", sql`${t.rating} >= 1 AND ${t.rating} <= 5`),
  ],
);

// ── groups ───────────────────────────────────────────────────────────────
export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  inviteCode: varchar("invite_code", { length: 6 }).notNull().unique(),
  leaderId: uuid("leader_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── group_members ────────────────────────────────────────────────────────
export const groupMembers = pgTable(
  "group_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("uq_group_members_group_user").on(t.groupId, t.userId),
    index("idx_group_members_group").on(t.groupId),
  ],
);

// ── decision_sessions ────────────────────────────────────────────────────
export const decisionSessions = pgTable("decision_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).default("lobby").notNull(),
  mpaaFilters: jsonb("mpaa_filters").$type<string[]>().default([]),
  decisionRule: varchar("decision_rule", { length: 16 })
    .default("majority")
    .notNull(),
  voteThreshold: integer("vote_threshold").notNull(),
  winnerMovieId: uuid("winner_movie_id").references(() => movies.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
});

// ── session_movies ───────────────────────────────────────────────────────
export const sessionMovies = pgTable(
  "session_movies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => decisionSessions.id, { onDelete: "cascade" }),
    movieId: uuid("movie_id")
      .notNull()
      .references(() => movies.id, { onDelete: "cascade" }),
    voteCount: integer("vote_count").default(0).notNull(),
  },
  (t) => [uniqueIndex("uq_session_movies_session_movie").on(t.sessionId, t.movieId)],
);

// ── session_votes ────────────────────────────────────────────────────────
export const sessionVotes = pgTable(
  "session_votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => decisionSessions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    movieId: uuid("movie_id")
      .notNull()
      .references(() => movies.id, { onDelete: "cascade" }),
    vote: varchar("vote", { length: 5 }).notNull(),
    votedAt: timestamp("voted_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("uq_session_votes_session_user_movie").on(
      t.sessionId,
      t.userId,
      t.movieId,
    ),
    index("idx_session_votes_session").on(t.sessionId, t.movieId),
  ],
);

// ── session_members ──────────────────────────────────────────────────────
export const sessionMembers = pgTable(
  "session_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => decisionSessions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    isReady: boolean("is_ready").default(false).notNull(),
    isDoneVoting: boolean("is_done_voting").default(false).notNull(),
  },
  (t) => [uniqueIndex("uq_session_members_session_user").on(t.sessionId, t.userId)],
);

// ══ Anonymous rooms ══════════════════════════════════════════════════════
// Account-free, ephemeral decision sessions. Identity is scoped to the room
// (host/participant tokens), not to a user. TTL'd via expires_at.

// ── rooms ────────────────────────────────────────────────────────────────
export const rooms = pgTable(
  "rooms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    joinCode: varchar("join_code", { length: 8 }).notNull().unique(),
    hostToken: varchar("host_token", { length: 64 }).notNull(),
    status: varchar("status", { length: 20 }).default("lobby").notNull(),
    mpaaFilters: jsonb("mpaa_filters").$type<string[]>().default([]),
    decisionRule: varchar("decision_rule", { length: 16 })
      .default("majority")
      .notNull(),
    voteThreshold: integer("vote_threshold").default(0).notNull(),
    winnerMovieId: uuid("winner_movie_id").references(() => movies.id),
    locked: boolean("locked").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    startedAt: timestamp("started_at"),
    endedAt: timestamp("ended_at"),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (t) => [index("idx_rooms_join_code").on(t.joinCode)],
);

// ── room_participants ────────────────────────────────────────────────────
export const roomParticipants = pgTable(
  "room_participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    participantToken: varchar("participant_token", { length: 64 }).notNull(),
    nickname: varchar("nickname", { length: 40 }).notNull(),
    isHost: boolean("is_host").default(false).notNull(),
    isReady: boolean("is_ready").default(false).notNull(),
    isDoneVoting: boolean("is_done_voting").default(false).notNull(),
    // Claim-later hook: an anonymous seat can be attached to an account later.
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
    lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  },
  (t) => [index("idx_room_participants_room").on(t.roomId)],
);

// ── room_movies ──────────────────────────────────────────────────────────
export const roomMovies = pgTable(
  "room_movies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    movieId: uuid("movie_id")
      .notNull()
      .references(() => movies.id, { onDelete: "cascade" }),
    voteCount: integer("vote_count").default(0).notNull(),
  },
  (t) => [uniqueIndex("uq_room_movies_room_movie").on(t.roomId, t.movieId)],
);

// ── room_votes ───────────────────────────────────────────────────────────
export const roomVotes = pgTable(
  "room_votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => roomParticipants.id, { onDelete: "cascade" }),
    movieId: uuid("movie_id")
      .notNull()
      .references(() => movies.id, { onDelete: "cascade" }),
    vote: varchar("vote", { length: 5 }).notNull(),
    votedAt: timestamp("voted_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("uq_room_votes_room_participant_movie").on(
      t.roomId,
      t.participantId,
      t.movieId,
    ),
    index("idx_room_votes_room").on(t.roomId, t.movieId),
  ],
);

// ══ List packs ═══════════════════════════════════════════════════════════
// Pre-built, launchable movie sets. Dynamic packs (trending, in-theaters,
// search-trends) are refreshed by an external cron. Items snapshot the movie
// fields so rendering is a pure DB read — it never re-hits TMDB.

export const listPacks = pgTable(
  "list_packs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 80 }).notNull().unique(),
    title: varchar("title", { length: 160 }).notNull(),
    description: text("description"),
    // trending | now_playing | popular | search_trends | seasonal | mood
    kind: varchar("kind", { length: 24 }).notNull(),
    // weekly | daily | manual
    refreshStrategy: varchar("refresh_strategy", { length: 16 })
      .default("weekly")
      .notNull(),
    sourceConfig: jsonb("source_config").$type<Record<string, unknown>>().default({}),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    version: integer("version").default(0).notNull(),
    newCount: integer("new_count").default(0).notNull(),
    // Last refresh had to use the fallback path (e.g. Google Trends 403'd).
    degraded: boolean("degraded").default(false).notNull(),
    refreshedAt: timestamp("refreshed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("idx_list_packs_slug").on(t.slug)],
);

export const listPackItems = pgTable(
  "list_pack_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    packId: uuid("pack_id")
      .notNull()
      .references(() => listPacks.id, { onDelete: "cascade" }),
    tmdbId: integer("tmdb_id").notNull(),
    position: integer("position").default(0).notNull(),
    pinned: boolean("pinned").default(false).notNull(),
    // snapshot — so the grid renders without a TMDB call
    title: varchar("title", { length: 500 }).notNull(),
    posterPath: varchar("poster_path", { length: 500 }),
    releaseDate: date("release_date"),
    addedAt: timestamp("added_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("uq_list_pack_items_pack_tmdb").on(t.packId, t.tmdbId),
    index("idx_list_pack_items_pack").on(t.packId, t.position),
  ],
);

export const listPackHistory = pgTable(
  "list_pack_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    packId: uuid("pack_id")
      .notNull()
      .references(() => listPacks.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    itemsJson: jsonb("items_json").$type<number[]>().default([]),
    refreshedAt: timestamp("refreshed_at").defaultNow().notNull(),
  },
  (t) => [index("idx_list_pack_history_pack").on(t.packId)],
);

// ── relations ────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  watchListEntries: many(watchListEntries),
  reviews: many(reviews),
  groupMemberships: many(groupMembers),
}));

export const moviesRelations = relations(movies, ({ many }) => ({
  watchListEntries: many(watchListEntries),
  reviews: many(reviews),
}));

export const watchListEntriesRelations = relations(watchListEntries, ({ one }) => ({
  user: one(users, {
    fields: [watchListEntries.userId],
    references: [users.id],
  }),
  movie: one(movies, {
    fields: [watchListEntries.movieId],
    references: [movies.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
  movie: one(movies, { fields: [reviews.movieId], references: [movies.id] }),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  leader: one(users, { fields: [groups.leaderId], references: [users.id] }),
  members: many(groupMembers),
  sessions: many(decisionSessions),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, { fields: [groupMembers.groupId], references: [groups.id] }),
  user: one(users, { fields: [groupMembers.userId], references: [users.id] }),
}));

export const decisionSessionsRelations = relations(
  decisionSessions,
  ({ one, many }) => ({
    group: one(groups, {
      fields: [decisionSessions.groupId],
      references: [groups.id],
    }),
    winnerMovie: one(movies, {
      fields: [decisionSessions.winnerMovieId],
      references: [movies.id],
    }),
    movies: many(sessionMovies),
    votes: many(sessionVotes),
    members: many(sessionMembers),
  }),
);

export const sessionMoviesRelations = relations(sessionMovies, ({ one }) => ({
  session: one(decisionSessions, {
    fields: [sessionMovies.sessionId],
    references: [decisionSessions.id],
  }),
  movie: one(movies, { fields: [sessionMovies.movieId], references: [movies.id] }),
}));

export const sessionMembersRelations = relations(sessionMembers, ({ one }) => ({
  session: one(decisionSessions, {
    fields: [sessionMembers.sessionId],
    references: [decisionSessions.id],
  }),
  user: one(users, { fields: [sessionMembers.userId], references: [users.id] }),
}));

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  winnerMovie: one(movies, {
    fields: [rooms.winnerMovieId],
    references: [movies.id],
  }),
  participants: many(roomParticipants),
  movies: many(roomMovies),
  votes: many(roomVotes),
}));

export const roomParticipantsRelations = relations(
  roomParticipants,
  ({ one }) => ({
    room: one(rooms, {
      fields: [roomParticipants.roomId],
      references: [rooms.id],
    }),
  }),
);

export const roomMoviesRelations = relations(roomMovies, ({ one }) => ({
  room: one(rooms, { fields: [roomMovies.roomId], references: [rooms.id] }),
  movie: one(movies, { fields: [roomMovies.movieId], references: [movies.id] }),
}));

export const roomVotesRelations = relations(roomVotes, ({ one }) => ({
  room: one(rooms, { fields: [roomVotes.roomId], references: [rooms.id] }),
  participant: one(roomParticipants, {
    fields: [roomVotes.participantId],
    references: [roomParticipants.id],
  }),
}));

export const listPacksRelations = relations(listPacks, ({ many }) => ({
  items: many(listPackItems),
  history: many(listPackHistory),
}));

export const listPackItemsRelations = relations(listPackItems, ({ one }) => ({
  pack: one(listPacks, {
    fields: [listPackItems.packId],
    references: [listPacks.id],
  }),
}));

export const listPackHistoryRelations = relations(listPackHistory, ({ one }) => ({
  pack: one(listPacks, {
    fields: [listPackHistory.packId],
    references: [listPacks.id],
  }),
}));

// ── inferred types ───────────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Movie = typeof movies.$inferSelect;
export type NewMovie = typeof movies.$inferInsert;
export type WatchListEntry = typeof watchListEntries.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type GroupMember = typeof groupMembers.$inferSelect;
export type DecisionSession = typeof decisionSessions.$inferSelect;
export type SessionMovie = typeof sessionMovies.$inferSelect;
export type SessionVote = typeof sessionVotes.$inferSelect;
export type SessionMember = typeof sessionMembers.$inferSelect;
export type Room = typeof rooms.$inferSelect;
export type RoomParticipant = typeof roomParticipants.$inferSelect;
export type RoomMovie = typeof roomMovies.$inferSelect;
export type RoomVote = typeof roomVotes.$inferSelect;
export type ListPack = typeof listPacks.$inferSelect;
export type ListPackItem = typeof listPackItems.$inferSelect;
export type ListPackHistory = typeof listPackHistory.$inferSelect;
