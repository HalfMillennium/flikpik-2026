import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser, badRequest, serverError } from "@/lib/api";
import { updateProfileSchema } from "@/lib/validation";

/** Update the current user's display name and email (not username). */
export async function PATCH(req: Request) {
  const guard = await requireUser("users");
  if (guard.error) return guard.error;
  const userId = guard.user.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid request body");
  }

  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation failed", parsed.error.flatten().fieldErrors);
  }

  const email = parsed.data.email.toLowerCase().trim();

  try {
    const clash = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, email), ne(users.id, userId)))
      .limit(1);
    if (clash.length) return badRequest("That email is already in use");

    const [updated] = await db
      .update(users)
      .set({
        displayName: parsed.data.displayName,
        email,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        displayName: users.displayName,
        email: users.email,
      });

    return NextResponse.json({ ok: true, user: updated });
  } catch (err) {
    console.error("profile update error", err);
    return serverError("Could not update your profile");
  }
}
