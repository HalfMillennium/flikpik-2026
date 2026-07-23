import { z } from "zod";
import { MPAA_RATINGS } from "@/lib/utils";

export const signupSchema = z.object({
  email: z.string().email("Enter a valid email").max(255),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50)
    .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers and underscores only"),
  displayName: z.string().min(1, "Display name is required").max(100),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100),
  email: z.string().email().max(255),
});

export const watchlistActionSchema = z.object({
  tmdbId: z.number().int().positive().optional(),
  movieId: z.string().uuid().optional(),
  action: z.enum(["add", "remove", "mark_watched", "mark_unwatched", "set"]),
  status: z.enum(["want_to_watch", "watched"]).optional(),
});

export const reviewSchema = z.object({
  movieId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  body: z
    .string()
    .min(10, "Review must be at least 10 characters")
    .max(2000, "Review must be under 2000 characters"),
});

export const deleteReviewSchema = z.object({
  reviewId: z.string().uuid(),
});

export const createGroupSchema = z.object({
  action: z.literal("create"),
  name: z.string().min(1, "Group name is required").max(100),
});

export const joinGroupSchema = z.object({
  action: z.literal("join"),
  inviteCode: z.string().length(6),
});

export const leaveGroupSchema = z.object({
  action: z.literal("leave"),
  groupId: z.string().uuid(),
});

export const groupActionSchema = z.discriminatedUnion("action", [
  createGroupSchema,
  joinGroupSchema,
  leaveGroupSchema,
]);

export const startSessionSchema = z.object({
  mpaaFilters: z.array(z.enum(MPAA_RATINGS)).min(1),
});

export const voteSchema = z.object({
  sessionId: z.string().uuid(),
  movieId: z.string().uuid(),
  vote: z.enum(["yay", "nay"]),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
