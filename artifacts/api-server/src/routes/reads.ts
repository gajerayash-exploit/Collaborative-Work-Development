import { Router, type IRouter } from "express";
import { db, messageReadsTable, usersTable, workspaceMembersTable, messagesTable } from "@workspace/db";
import { eq, and, inArray, ne } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { broadcastToWorkspace } from "../lib/ws-manager";

const router: IRouter = Router();

router.post("/workspaces/:workspaceId/messages/mark-read", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const { workspaceId } = req.params;
    const { messageIds } = req.body;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      res.json({ success: true });
      return;
    }

    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }

    const membership = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, user[0].id)))
      .limit(1);
    if (!membership[0]) { res.status(403).json({ error: "Access denied" }); return; }

    // Only mark messages that belong to this workspace and were NOT sent by the current user
    const validMessages = await db.select({ id: messagesTable.id })
      .from(messagesTable)
      .where(and(
        inArray(messagesTable.id, messageIds.slice(0, 100)),
        eq(messagesTable.workspaceId, workspaceId),
        ne(messagesTable.senderId, user[0].id),
      ));

    if (validMessages.length === 0) {
      res.json({ success: true });
      return;
    }

    // Upsert read records (ignore conflicts)
    await db.insert(messageReadsTable)
      .values(validMessages.map(m => ({ messageId: m.id, userId: user[0].id })))
      .onConflictDoNothing();

    // Broadcast to the workspace so senders see ticks update in real time
    broadcastToWorkspace(workspaceId, {
      type: "message_read",
      workspaceId,
      messageIds: validMessages.map(m => m.id),
      readByUserId: user[0].id,
    });

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to mark messages as read");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
