import "server-only";
import { and, eq, inArray, sql, desc, asc } from "drizzle-orm";
import { db } from "@/db";
import {
  groups,
  groupMembers,
  users,
  decisionSessions,
  sessionMembers,
  movies,
} from "@/db/schema";
import { generateInviteCode } from "@/lib/utils";

export async function getGroupsForUser(userId: string) {
  const memberships = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.userId, userId));

  const groupIds = memberships.map((m) => m.groupId);
  if (groupIds.length === 0) return [];

  const groupRows = await db
    .select()
    .from(groups)
    .where(inArray(groups.id, groupIds));

  const allMembers = await db
    .select({
      groupId: groupMembers.groupId,
      userId: groupMembers.userId,
      name: users.displayName,
      joinedAt: groupMembers.joinedAt,
    })
    .from(groupMembers)
    .innerJoin(users, eq(users.id, groupMembers.userId))
    .where(inArray(groupMembers.groupId, groupIds))
    .orderBy(asc(groupMembers.joinedAt));

  const activeSessions = await db
    .select({ groupId: decisionSessions.groupId })
    .from(decisionSessions)
    .where(
      and(
        inArray(decisionSessions.groupId, groupIds),
        inArray(decisionSessions.status, ["lobby", "voting"]),
      ),
    );
  const activeSet = new Set(activeSessions.map((s) => s.groupId));

  return groupRows.map((g) => {
    const members = allMembers
      .filter((m) => m.groupId === g.id)
      .map((m) => ({ id: m.userId, name: m.name }));
    return {
      id: g.id,
      name: g.name,
      inviteCode: g.inviteCode,
      memberCount: members.length,
      isLeader: g.leaderId === userId,
      hasActiveSession: activeSet.has(g.id),
      members,
    };
  });
}

export async function createGroup(userId: string, name: string) {
  // Retry a few times in the unlikely event of an invite-code collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const inviteCode = generateInviteCode();
    try {
      const [group] = await db
        .insert(groups)
        .values({ name, inviteCode, leaderId: userId })
        .returning();

      await db
        .insert(groupMembers)
        .values({ groupId: group.id, userId })
        .onConflictDoNothing();

      return group;
    } catch (err) {
      // Unique violation on invite_code → retry with a new code.
      if (attempt === 4) throw err;
    }
  }
  throw new Error("Could not generate a unique invite code");
}

export async function joinGroup(userId: string, inviteCode: string) {
  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.inviteCode, inviteCode.toUpperCase()))
    .limit(1);

  if (!group) return { error: "No group found with that code" as const };

  await db
    .insert(groupMembers)
    .values({ groupId: group.id, userId })
    .onConflictDoNothing({
      target: [groupMembers.groupId, groupMembers.userId],
    });

  return { group };
}

/**
 * Leave a group. If the leader leaves, leadership transfers to the oldest
 * remaining member. If the last member leaves, the group is deleted.
 */
export async function leaveGroup(userId: string, groupId: string) {
  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);
  if (!group) return { error: "Group not found" as const };

  await db
    .delete(groupMembers)
    .where(
      and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)),
    );

  const remaining = await db
    .select({ userId: groupMembers.userId })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId))
    .orderBy(asc(groupMembers.joinedAt));

  if (remaining.length === 0) {
    await db.delete(groups).where(eq(groups.id, groupId));
    return { deleted: true };
  }

  if (group.leaderId === userId) {
    await db
      .update(groups)
      .set({ leaderId: remaining[0].userId, updatedAt: new Date() })
      .where(eq(groups.id, groupId));
  }

  return { ok: true };
}

export async function getGroupDetail(userId: string, groupId: string) {
  const membership = await db
    .select({ id: groupMembers.id })
    .from(groupMembers)
    .where(
      and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)),
    )
    .limit(1);
  if (membership.length === 0) return null;

  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);
  if (!group) return null;

  const members = await db
    .select({
      id: groupMembers.userId,
      name: users.displayName,
      username: users.username,
      joinedAt: groupMembers.joinedAt,
    })
    .from(groupMembers)
    .innerJoin(users, eq(users.id, groupMembers.userId))
    .where(eq(groupMembers.groupId, groupId))
    .orderBy(asc(groupMembers.joinedAt));

  const activeSession = await db
    .select({ id: decisionSessions.id, status: decisionSessions.status })
    .from(decisionSessions)
    .where(
      and(
        eq(decisionSessions.groupId, groupId),
        inArray(decisionSessions.status, ["lobby", "voting"]),
      ),
    )
    .orderBy(desc(decisionSessions.createdAt))
    .limit(1);

  const pastSessions = await db
    .select({
      id: decisionSessions.id,
      status: decisionSessions.status,
      decisionRule: decisionSessions.decisionRule,
      endedAt: decisionSessions.endedAt,
      createdAt: decisionSessions.createdAt,
      winnerTitle: movies.title,
      winnerPoster: movies.posterPath,
      memberCount: sql<number>`(
        select count(*)::int from ${sessionMembers}
        where ${sessionMembers.sessionId} = ${decisionSessions.id}
      )`.as("member_count"),
    })
    .from(decisionSessions)
    .leftJoin(movies, eq(movies.id, decisionSessions.winnerMovieId))
    .where(
      and(
        eq(decisionSessions.groupId, groupId),
        inArray(decisionSessions.status, ["decided", "no_consensus"]),
      ),
    )
    .orderBy(desc(decisionSessions.createdAt))
    .limit(20);

  return {
    id: group.id,
    name: group.name,
    inviteCode: group.inviteCode,
    leaderId: group.leaderId,
    isLeader: group.leaderId === userId,
    members: members.map((m) => ({
      id: m.id,
      name: m.name,
      username: m.username,
      isLeader: m.id === group.leaderId,
    })),
    activeSession: activeSession[0] ?? null,
    pastSessions: pastSessions.map((p) => ({
      id: p.id,
      status: p.status,
      decisionRule: p.decisionRule,
      date: (p.endedAt ?? p.createdAt).toISOString(),
      winnerTitle: p.winnerTitle,
      winnerPoster: p.winnerPoster,
      memberCount: Number(p.memberCount ?? 0),
    })),
  };
}
