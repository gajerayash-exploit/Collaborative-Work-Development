import { Router, type IRouter } from "express";
import { db, messagesTable, usersTable, workspaceMembersTable, messageReactionsTable, pinnedMessagesTable, messageReadsTable } from "@workspace/db";
import { eq, and, desc, inArray, isNull, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { notifyWorkspaceMembers, notifySpecificUsers, extractMentionedUserIds } from "../lib/notify";
import { broadcastToWorkspace } from "../lib/ws-manager";

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
      .where(and(eq(messagesTable.workspaceId, workspaceId), isNull(messagesTable.parentMessageId)))
      .orderBy(desc(messagesTable.createdAt))
      .limit(Math.min(parseInt(limit), 100));

    const reversed = msgs.reverse();

    if (reversed.length === 0) {
      res.json([]);
      return;
    }

    const messageIds = reversed.map(m => m.id);
    const [allReactions, allPinned, replyCounts, readCounts] = await Promise.all([
      db.select().from(messageReactionsTable).where(inArray(messageReactionsTable.messageId, messageIds)),
      db.select({ messageId: pinnedMessagesTable.messageId }).from(pinnedMessagesTable)
        .where(eq(pinnedMessagesTable.workspaceId, workspaceId)),
      db.select({
        parentMessageId: messagesTable.parentMessageId,
        count: sql<number>`cast(count(*) as int)`,
      })
        .from(messagesTable)
        .where(and(inArray(messagesTable.parentMessageId, messageIds)))
        .groupBy(messagesTable.parentMessageId),
      db.select({
        messageId: messageReadsTable.messageId,
        count: sql<number>`cast(count(*) as int)`,
      })
        .from(messageReadsTable)
        .where(inArray(messageReadsTable.messageId, messageIds))
        .groupBy(messageReadsTable.messageId),
    ]);

    const reactionsByMessage: Record<string, Record<string, string[]>> = {};
    for (const r of allReactions) {
      if (!reactionsByMessage[r.messageId]) reactionsByMessage[r.messageId] = {};
      if (!reactionsByMessage[r.messageId][r.emoji]) reactionsByMessage[r.messageId][r.emoji] = [];
      reactionsByMessage[r.messageId][r.emoji].push(r.userId);
    }
    const pinnedSet = new Set(allPinned.map(p => p.messageId));
    const replyCountMap: Record<string, number> = {};
    for (const r of replyCounts) {
      if (r.parentMessageId) replyCountMap[r.parentMessageId] = r.count;
    }
    const readCountMap: Record<string, number> = {};
    for (const r of readCounts) {
      readCountMap[r.messageId] = r.count;
    }

    res.json(reversed.map(m => ({
      ...m,
      isPinned: pinnedSet.has(m.id),
      replyCount: replyCountMap[m.id] ?? 0,
      readByCount: readCountMap[m.id] ?? 0,
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

    const outMsg = {
      ...msg,
      senderName: user[0].name,
      senderAvatarUrl: user[0].avatarUrl,
      reactions: [],
      isPinned: false,
      replyCount: 0,
      readByCount: 0,
    };
    res.status(201).json(outMsg);
    broadcastToWorkspace(workspaceId, { type: "new_message", workspaceId, message: outMsg }, user[0].id);

    const trimmed = content.trim();
    const mentionedIds = extractMentionedUserIds(trimmed).filter(id => id !== user[0].id);

    notifyWorkspaceMembers({
      workspaceId,
      excludeUserId: user[0].id,
      type: "message",
      title: `New message from ${user[0].name}`,
      body: trimmed.replace(/@\[([^\]|]+)\|[^\]]+\]/g, "@$1").slice(0, 80) + (trimmed.length > 80 ? "…" : ""),
    }).catch(() => {});

    if (mentionedIds.length > 0) {
      notifySpecificUsers({
        userIds: mentionedIds,
        workspaceId,
        type: "mention",
        title: `${user[0].name} mentioned you`,
        body: trimmed.replace(/@\[([^\]|]+)\|[^\]]+\]/g, "@$1").slice(0, 80) + (trimmed.length > 80 ? "…" : ""),
      }).catch(() => {});
    }
  } catch (err) {
    req.log.error({ err }, "Failed to send message");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
