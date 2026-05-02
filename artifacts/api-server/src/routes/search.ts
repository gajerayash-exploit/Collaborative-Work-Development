import { Router, type IRouter } from "express";
import { db, messagesTable, workspaceFilesTable, tasksTable, usersTable, workspaceMembersTable } from "@workspace/db";
import { eq, and, ilike, or } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/workspaces/:workspaceId/search", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const { workspaceId } = req.params;
    const { q } = req.query as { q?: string };

    if (!q?.trim()) { res.json({ messages: [], files: [], tasks: [] }); return; }

    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }

    const membership = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, user[0].id)))
      .limit(1);
    if (!membership[0]) { res.status(403).json({ error: "Access denied" }); return; }

    const term = `%${q.trim()}%`;

    const [messages, files, tasks] = await Promise.all([
      db.select({
        id: messagesTable.id,
        content: messagesTable.content,
        senderName: usersTable.name,
        createdAt: messagesTable.createdAt,
      })
        .from(messagesTable)
        .innerJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
        .where(and(eq(messagesTable.workspaceId, workspaceId), ilike(messagesTable.content, term)))
        .limit(10),

      db.select({
        id: workspaceFilesTable.id,
        name: workspaceFilesTable.name,
        mimeType: workspaceFilesTable.mimeType,
        uploaderName: usersTable.name,
        createdAt: workspaceFilesTable.createdAt,
      })
        .from(workspaceFilesTable)
        .innerJoin(usersTable, eq(workspaceFilesTable.uploadedBy, usersTable.id))
        .where(and(eq(workspaceFilesTable.workspaceId, workspaceId), ilike(workspaceFilesTable.name, term)))
        .limit(10),

      db.select({
        id: tasksTable.id,
        title: tasksTable.title,
        status: tasksTable.status,
        priority: tasksTable.priority,
        createdAt: tasksTable.createdAt,
      })
        .from(tasksTable)
        .where(and(
          eq(tasksTable.workspaceId, workspaceId),
          or(ilike(tasksTable.title, term), ilike(tasksTable.description, term))
        ))
        .limit(10),
    ]);

    res.json({ messages, files, tasks });
  } catch (err) {
    req.log.error({ err }, "Failed to search workspace");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
