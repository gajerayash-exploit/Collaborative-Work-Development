import { db, notificationsTable, workspaceMembersTable, usersTable } from "@workspace/db";
import { eq, and, ne } from "drizzle-orm";

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
