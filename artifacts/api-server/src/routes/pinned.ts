import { Router, type IRouter } from "express";
import { db, pinnedMessagesTable, messagesTable, usersTable, workspaceMembersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/workspaces/:workspaceId/pinned-messages", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const { workspaceId } = req.params;

    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }

    const membership = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, user[0].id)))
      .limit(1);
    if (!membership[0]) { res.status(403).json({ error: "Access denied" }); return; }

    const pinned = await db
      .select({
        id: pinnedMessagesTable.id,
        workspaceId: pinnedMessagesTable.workspaceId,
        messageId: pinnedMessagesTable.messageId,
        pinnedBy: pinnedMessagesTable.pinnedBy,
        pinnedAt: pinnedMessagesTable.pinnedAt,
        content: messagesTable.content,
        senderId: messagesTable.senderId,
        senderName: usersTable.name,
        senderAvatarUrl: usersTable.avatarUrl,
      })
      .from(pinnedMessagesTable)
      .innerJoin(messagesTable, eq(pinnedMessagesTable.messageId, messagesTable.id))
      .innerJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
      .where(eq(pinnedMessagesTable.workspaceId, workspaceId))
      .orderBy(pinnedMessagesTable.pinnedAt);

    const pinnedByIds = [...new Set(pinned.map(p => p.pinnedBy))];
    const pinnedByUsers = pinnedByIds.length > 0
      ? await db.select({ id: usersTable.id, name: usersTable.name }).from(usersTable)
          .where(eq(usersTable.id, pinnedByIds[0]))
      : [];
    const pinnedByMap = Object.fromEntries(pinnedByUsers.map(u => [u.id, u.name]));

    res.json(pinned.map(p => ({
      ...p,
      pinnedByName: pinnedByMap[p.pinnedBy] ?? "Unknown",
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to list pinned messages");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/workspaces/:workspaceId/messages/:messageId/pin", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const { workspaceId, messageId } = req.params;

    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }

    const membership = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, user[0].id)))
      .limit(1);
    if (!membership[0]) { res.status(403).json({ error: "Access denied" }); return; }
    if (membership[0].role === "viewer") { res.status(403).json({ error: "Viewers cannot pin messages" }); return; }

    const message = await db.select().from(messagesTable)
      .where(and(eq(messagesTable.id, messageId), eq(messagesTable.workspaceId, workspaceId)))
      .limit(1);
    if (!message[0]) { res.status(404).json({ error: "Message not found" }); return; }

    const existing = await db.select().from(pinnedMessagesTable)
      .where(and(eq(pinnedMessagesTable.workspaceId, workspaceId), eq(pinnedMessagesTable.messageId, messageId)))
      .limit(1);

    if (existing[0]) { res.json(existing[0]); return; }

    const [pinned] = await db.insert(pinnedMessagesTable).values({
      workspaceId,
      messageId,
      pinnedBy: user[0].id,
    }).returning();

    const sender = await db.select({ id: usersTable.id, name: usersTable.name, avatarUrl: usersTable.avatarUrl })
      .from(usersTable).where(eq(usersTable.id, message[0].senderId)).limit(1);

    res.json({
      ...pinned,
      pinnedByName: user[0].name,
      content: message[0].content,
      senderId: message[0].senderId,
      senderName: sender[0]?.name ?? "Unknown",
      senderAvatarUrl: sender[0]?.avatarUrl ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to pin message");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/workspaces/:workspaceId/messages/:messageId/pin", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const { workspaceId, messageId } = req.params;

    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }

    const membership = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, user[0].id)))
      .limit(1);
    if (!membership[0]) { res.status(403).json({ error: "Access denied" }); return; }
    if (membership[0].role === "viewer") { res.status(403).json({ error: "Viewers cannot unpin messages" }); return; }

    await db.delete(pinnedMessagesTable)
      .where(and(eq(pinnedMessagesTable.workspaceId, workspaceId), eq(pinnedMessagesTable.messageId, messageId)));

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to unpin message");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
