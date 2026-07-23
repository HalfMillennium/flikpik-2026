import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { reviews } from "@/db/schema";
import { requireUser, badRequest, serverError, notFound } from "@/lib/api";
import { reviewSchema, deleteReviewSchema } from "@/lib/validation";
import { recomputeUserAvgRating } from "@/lib/movies";

/** Create or update the current user's review for a movie (upsert). */
export async function POST(req: Request) {
  const guard = await requireUser("reviews");
  if (guard.error) return guard.error;
  const userId = guard.user.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid request body");
  }

  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation failed", parsed.error.flatten().fieldErrors);
  }

  const { movieId, rating, body: reviewBody } = parsed.data;

  try {
    const [review] = await db
      .insert(reviews)
      .values({ userId, movieId, rating, body: reviewBody })
      .onConflictDoUpdate({
        target: [reviews.userId, reviews.movieId],
        set: { rating, body: reviewBody, updatedAt: new Date() },
      })
      .returning();

    await recomputeUserAvgRating(movieId);
    return NextResponse.json({ ok: true, review });
  } catch (err) {
    console.error("review create error", err);
    return serverError("Could not save your review");
  }
}

export async function DELETE(req: Request) {
  const guard = await requireUser("reviews");
  if (guard.error) return guard.error;
  const userId = guard.user.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid request body");
  }

  const parsed = deleteReviewSchema.safeParse(body);
  if (!parsed.success) return badRequest("Validation failed");

  try {
    const [deleted] = await db
      .delete(reviews)
      .where(
        and(eq(reviews.id, parsed.data.reviewId), eq(reviews.userId, userId)),
      )
      .returning({ movieId: reviews.movieId });

    if (!deleted) return notFound("Review not found");
    await recomputeUserAvgRating(deleted.movieId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("review delete error", err);
    return serverError("Could not delete your review");
  }
}
