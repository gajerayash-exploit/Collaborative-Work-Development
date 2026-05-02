import { Router, type IRouter } from "express";
import { db, activityEventsTable, usersTable, workspaceMembersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

const STATUS_LABELS: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

function describeEvent(type: string, payload: Record<string, unknown>): string {
  switch (type) {
    case "task_created":
      return `created task "${payload.taskTitle}"`;
    case "task_status_changed":
      return `moved "${payload.taskTitle}" from ${STATUS_LABELS[payload.oldStatus as string] ?? payload.oldStatus} to ${STATUS_LABELS[payload.newStatus as string] ?? payload.newStatus}`;
    case "task_assigned":
      return `assigned "${payload.taskTitle}" to ${payload.assigneeName}`;
    case "task_priority_changed":
      return `changed priority of "${payload.taskTitle}" to ${PRIORITY_LABELS[payload.newPriority as string] ?? payload.newPriority}`;
    case "file_uploaded":
      return `uploaded "${payload.fileName}"`;
    case "member_joined":
      return `added ${payload.memberName} as ${payload.role}`;
    case "member_role_changed":
      return `changed ${payload.memberName}'s role to ${payload.newRole}`;
    default:
      return "performed an action";
  }
}

router.get("/workspaces/:workspaceId/activity", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const { workspaceId } = req.params;
    const limit = Math.min(parseInt((req.query.limit as string) ?? "50", 10), 100);

    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }

    const membership = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, user[0].id)))
      .limit(1);
    if (!membership[0]) { res.status(403).json({ error: "Access denied" }); return; }

    const rawEvents = await db
      .select({
        id: activityEventsTable.id,
        type: activityEventsTable.type,
        payload: activityEventsTable.payload,
        createdAt: activityEventsTable.createdAt,
        userName: usersTable.name,
        userAvatarUrl: usersTable.avatarUrl,
      })
      .from(activityEventsTable)
      .innerJoin(usersTable, eq(activityEventsTable.userId, usersTable.id))
      .where(eq(activityEventsTable.workspaceId, workspaceId))
      .orderBy(desc(activityEventsTable.createdAt))
      .limit(limit);

    const events = rawEvents.map(e => ({
      id: e.id,
      type: e.type,
      userName: e.userName,
      userAvatarUrl: e.userAvatarUrl,
      description: describeEvent(e.type, (e.payload as Record<string, unknown>) ?? {}),
      createdAt: e.createdAt.toISOString(),
    }));

    res.json({ events });
    return;
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
    return;
  }
});

export default router;
