import { Router, type IRouter } from "express";
import { db, messagesTable, usersTable, workspaceMembersTable, messageReactionsTable } from "@workspace/db";
import { eq, and, desc, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { notifyWorkspaceMembers } from "../lib/notify";

const router: IRouter = Router();

router.get("/workspaces/:workspaceId/messages", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const { workspaceId } = req.params;
    const { limit = "50" } = req.query as { limit?: string };

    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }

    const membership = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, user[0].id)))
      .limit(1);
    if (!membership[0]) { res.status(403).json({ error: "Access denied" }); return; }

    const msgs = await db.select({
      id: messagesTable.id,
      workspaceId: messagesTable.workspaceId,
      content: messagesTable.content,
      senderId: messagesTable.senderId,
      createdAt: messagesTable.createdAt,
      senderName: usersTable.name,
      senderAvatarUrl: usersTable.avatarUrl,
    })
      .from(messagesTable)
      .innerJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
      .where(eq(messagesTable.workspaceId, workspaceId))
      .orderBy(desc(messagesTable.createdAt))
      .limit(Math.min(parseInt(limit), 100));

    const reversed = msgs.reverse();

    if (reversed.length === 0) {
      res.json([]);
      return;
    }

    const messageIds = reversed.map(m => m.id);
    const allReactions = await db
      .select()
      .from(messageReactionsTable)
      .where(inArray(messageReactionsTable.messageId, messageIds));

    const reactionsByMessage: Record<string, Record<string, string[]>> = {};
    for (const r of allReactions) {
      if (!reactionsByMessage[r.messageId]) reactionsByMessage[r.messageId] = {};
      if (!reactionsByMessage[r.messageId][r.emoji]) reactionsByMessage[r.messageId][r.emoji] = [];
      reactionsByMessage[r.messageId][r.emoji].push(r.userId);
    }

    res.json(reversed.map(m => ({
      ...m,
      reactions: Object.entries(reactionsByMessage[m.id] ?? {}).map(([emoji, userIds]) => ({
        emoji,
        count: userIds.length,
        userIds,
      })),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to list messages");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/workspaces/:workspaceId/messages", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const { workspaceId } = req.params;
    const { content } = req.body;

    if (!content?.trim()) { res.status(400).json({ error: "Content is required" }); return; }

    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }

    const membership = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, user[0].id)))
      .limit(1);
    if (!membership[0]) { res.status(403).json({ error: "Access denied" }); return; }

    const [msg] = await db.insert(messagesTable).values({
      workspaceId,
      content: content.trim(),
      senderId: user[0].id,
    }).returning();

    res.status(201).json({
      ...msg,
      senderName: user[0].name,
      senderAvatarUrl: user[0].avatarUrl,
      reactions: [],
    });

    notifyWorkspaceMembers({
      workspaceId,
      excludeUserId: user[0].id,
      type: "message",
      title: `New message from ${user[0].name}`,
      body: content.trim().length > 80 ? content.trim().substring(0, 80) + "…" : content.trim(),
    }).catch(() => {});
  } catch (err) {
    req.log.error({ err }, "Failed to send message");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
