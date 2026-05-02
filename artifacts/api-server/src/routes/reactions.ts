import { Router, type IRouter } from "express";
import { db, messageReactionsTable, messagesTable, usersTable, workspaceMembersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

const ALLOWED_EMOJIS = new Set(["👍", "❤️", "😂", "🎉", "😮", "👀", "🔥", "👏"]);

router.post(
  "/workspaces/:workspaceId/messages/:messageId/reactions",
  requireAuth,
  async (req: any, res): Promise<void> => {
    try {
      const clerkUserId = req.clerkUserId;
      const { workspaceId, messageId } = req.params;
      const { emoji } = req.body;

      if (!emoji || !ALLOWED_EMOJIS.has(emoji)) {
        res.status(400).json({ error: "Invalid emoji" });
        return;
      }

      const user = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.clerkId, clerkUserId))
        .limit(1);
      if (!user[0]) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const membership = await db
        .select()
        .from(workspaceMembersTable)
        .where(
          and(
            eq(workspaceMembersTable.workspaceId, workspaceId),
            eq(workspaceMembersTable.userId, user[0].id)
          )
        )
        .limit(1);
      if (!membership[0]) {
        res.status(403).json({ error: "Access denied" });
        return;
      }

      const message = await db
        .select()
        .from(messagesTable)
        .where(
          and(eq(messagesTable.id, messageId), eq(messagesTable.workspaceId, workspaceId))
        )
        .limit(1);
      if (!message[0]) {
        res.status(404).json({ error: "Message not found" });
        return;
      }

      const existing = await db
        .select()
        .from(messageReactionsTable)
        .where(
          and(
            eq(messageReactionsTable.messageId, messageId),
            eq(messageReactionsTable.userId, user[0].id),
            eq(messageReactionsTable.emoji, emoji)
          )
        )
        .limit(1);

      if (existing[0]) {
        await db
          .delete(messageReactionsTable)
          .where(eq(messageReactionsTable.id, existing[0].id));
        res.json({ action: "removed", emoji });
      } else {
        await db.insert(messageReactionsTable).values({
          messageId,
          userId: user[0].id,
          emoji,
        });
        res.json({ action: "added", emoji });
      }
    } catch (err) {
      req.log.error({ err }, "Failed to toggle reaction");
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
