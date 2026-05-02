import { Router, type IRouter } from "express";
import { db, messagesTable, usersTable, workspaceMembersTable, messageReactionsTable } from "@workspace/db";
import { eq, and, asc, inArray, isNotNull } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/workspaces/:workspaceId/messages/:messageId/replies", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const { workspaceId, messageId } = req.params;

    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }

    const membership = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, user[0].id)))
      .limit(1);
    if (!membership[0]) { res.status(403).json({ error: "Access denied" }); return; }

    const replies = await db.select({
      id: messagesTable.id,
      workspaceId: messagesTable.workspaceId,
      parentMessageId: messagesTable.parentMessageId,
      content: messagesTable.content,
      senderId: messagesTable.senderId,
      createdAt: messagesTable.createdAt,
      senderName: usersTable.name,
      senderAvatarUrl: usersTable.avatarUrl,
    })
      .from(messagesTable)
      .innerJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
      .where(and(eq(messagesTable.workspaceId, workspaceId), eq(messagesTable.parentMessageId, messageId)))
      .orderBy(asc(messagesTable.createdAt));

    if (replies.length === 0) {
      res.json([]);
      return;
    }

    const replyIds = replies.map(r => r.id);
    const allReactions = await db.select().from(messageReactionsTable)
      .where(inArray(messageReactionsTable.messageId, replyIds));

    const reactionsByMsg: Record<string, Record<string, string[]>> = {};
    for (const r of allReactions) {
      if (!reactionsByMsg[r.messageId]) reactionsByMsg[r.messageId] = {};
      if (!reactionsByMsg[r.messageId][r.emoji]) reactionsByMsg[r.messageId][r.emoji] = [];
      reactionsByMsg[r.messageId][r.emoji].push(r.userId);
    }

    res.json(replies.map(r => ({
      ...r,
      reactions: Object.entries(reactionsByMsg[r.id] ?? {}).map(([emoji, userIds]) => ({
        emoji, count: userIds.length, userIds,
      })),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to list replies");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/workspaces/:workspaceId/messages/:messageId/replies", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const { workspaceId, messageId } = req.params;
    const { content } = req.body;

    if (!content?.trim()) { res.status(400).json({ error: "Content is required" }); return; }

    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }

    const membership = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, user[0].id)))
      .limit(1);
    if (!membership[0]) { res.status(403).json({ error: "Access denied" }); return; }

    // Verify parent message exists in this workspace
    const parent = await db.select({ id: messagesTable.id })
      .from(messagesTable)
      .where(and(eq(messagesTable.id, messageId), eq(messagesTable.workspaceId, workspaceId)))
      .limit(1);
    if (!parent[0]) { res.status(404).json({ error: "Message not found" }); return; }

    const [reply] = await db.insert(messagesTable).values({
      workspaceId,
      content: content.trim(),
      senderId: user[0].id,
      parentMessageId: messageId,
    }).returning();

    res.status(201).json({
      ...reply,
      senderName: user[0].name,
      senderAvatarUrl: user[0].avatarUrl,
      reactions: [],
    });
  } catch (err) {
    req.log.error({ err }, "Failed to send reply");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
