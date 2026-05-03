import { Router, type IRouter } from "express";
import { db, syncEventsTable, workspaceMembersTable, usersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAuthOrToken } from "../middlewares/requireAuthOrToken";
import { broadcastToWorkspace } from "../lib/ws-manager";

const router: IRouter = Router();

router.get("/workspaces/:workspaceId/sync/events", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, req.clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }
    const membership = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, user[0].id)))
      .limit(1);
    if (!membership[0]) { res.status(403).json({ error: "Access denied" }); return; }
    const events = await db.select({
      id: syncEventsTable.id,
      workspaceId: syncEventsTable.workspaceId,
      fileName: syncEventsTable.fileName,
      filePath: syncEventsTable.filePath,
      action: syncEventsTable.action,
      triggeredBy: syncEventsTable.triggeredBy,
      pushedAt: syncEventsTable.pushedAt,
      pusherName: usersTable.name,
      pusherAvatarUrl: usersTable.avatarUrl,
    })
      .from(syncEventsTable)
      .innerJoin(usersTable, eq(syncEventsTable.triggeredBy, usersTable.id))
      .where(eq(syncEventsTable.workspaceId, workspaceId))
      .orderBy(desc(syncEventsTable.pushedAt))
      .limit(50);
    res.json(events);
  } catch (err) {
    req.log.error({ err }, "Failed to list sync events");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/workspaces/:workspaceId/sync/push", requireAuthOrToken, async (req: any, res): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, req.clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }
    const membership = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, user[0].id)))
      .limit(1);
    if (!membership[0] || membership[0].role === "viewer") {
      res.status(403).json({ error: "Viewers cannot push sync events" }); return;
    }
    const { fileName, filePath, action } = req.body;
    if (!fileName || !filePath || !action) {
      res.status(400).json({ error: "fileName, filePath, and action are required" }); return;
    }
    const [event] = await db.insert(syncEventsTable).values({
      workspaceId,
      fileName,
      filePath,
      action,
      triggeredBy: user[0].id,
    }).returning();
    const payload = { ...event, pusherName: user[0].name, pusherAvatarUrl: user[0].avatarUrl };
    res.status(201).json(payload);
    broadcastToWorkspace(workspaceId, { type: "sync_event", workspaceId, event: payload });
  } catch (err) {
    req.log.error({ err }, "Failed to push sync event");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
