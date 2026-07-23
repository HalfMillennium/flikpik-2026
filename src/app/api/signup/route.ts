import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { or, eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { signupSchema } from "@/lib/validation";
import { badRequest, serverError } from "@/lib/api";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid request body");
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest("Validation failed", parsed.error.flatten().fieldErrors);
  }

  const { email, username, displayName, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedUsername = username.toLowerCase().trim();

  try {
    const existing = await db
      .select({ email: users.email, username: users.username })
      .from(users)
      .where(
        or(
          eq(users.email, normalizedEmail),
          eq(users.username, normalizedUsername),
        ),
      );

    if (existing.some((u) => u.email === normalizedEmail)) {
      return badRequest("An account with that email already exists");
    }
    if (existing.some((u) => u.username === normalizedUsername)) {
      return badRequest("That username is taken");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [user] = await db
      .insert(users)
      .values({
        email: normalizedEmail,
        username: normalizedUsername,
        displayName,
        passwordHash,
      })
      .returning({ id: users.id, username: users.username });

    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (err) {
    console.error("signup error", err);
    return serverError("Could not create your account");
  }
}
