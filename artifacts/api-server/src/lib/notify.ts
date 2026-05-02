import { db, notificationsTable, workspaceMembersTable, usersTable } from "@workspace/db";
import { eq, and, ne, inArray } from "drizzle-orm";

interface NotifyWorkspaceParams {
  workspaceId: string;
  excludeUserId: string;
  type: string;
  title: string;
  body: string;
}

export async function notifyWorkspaceMembers({
  workspaceId,
  excludeUserId,
  type,
  title,
  body,
}: NotifyWorkspaceParams): Promise<void> {
  const members = await db.select({ userId: workspaceMembersTable.userId })
    .from(workspaceMembersTable)
    .where(
      and(
        eq(workspaceMembersTable.workspaceId, workspaceId),
        ne(workspaceMembersTable.userId, excludeUserId),
      )
    );

  if (members.length === 0) return;

  await db.insert(notificationsTable).values(
    members.map((m) => ({
      userId: m.userId,
      workspaceId,
      type,
      title,
      body,
    }))
  );
}

interface NotifyAdminsParams {
  workspaceId: string;
  excludeUserId: string;
  type: string;
  title: string;
  body: string;
}

export async function notifySpecificUsers({
  userIds,
  workspaceId,
  type,
  title,
  body,
}: {
  userIds: string[];
  workspaceId: string;
  type: string;
  title: string;
  body: string;
}): Promise<void> {
  if (userIds.length === 0) return;
  await db.insert(notificationsTable).values(
    userIds.map((userId) => ({ userId, workspaceId, type, title, body }))
  );
}

// Parses @[Name|userId] patterns from message content and returns unique userIds
export function extractMentionedUserIds(content: string): string[] {
  const matches = content.matchAll(/@\[([^\]|]+)\|([^\]]+)\]/g);
  const ids = new Set<string>();
  for (const m of matches) ids.add(m[2]);
  return [...ids];
}

export async function notifyWorkspaceAdmins({
  workspaceId,
  excludeUserId,
  type,
  title,
  body,
}: NotifyAdminsParams): Promise<void> {
  const admins = await db.select({ userId: workspaceMembersTable.userId })
    .from(workspaceMembersTable)
    .where(
      and(
        eq(workspaceMembersTable.workspaceId, workspaceId),
        eq(workspaceMembersTable.role, "admin"),
        ne(workspaceMembersTable.userId, excludeUserId),
      )
    );

  if (admins.length === 0) return;

  await db.insert(notificationsTable).values(
    admins.map((a) => ({
      userId: a.userId,
      workspaceId,
      type,
      title,
      body,
    }))
  );
}
