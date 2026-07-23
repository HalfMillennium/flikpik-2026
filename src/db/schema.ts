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
