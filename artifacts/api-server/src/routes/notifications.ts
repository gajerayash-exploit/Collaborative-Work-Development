import { Router, type IRouter } from "express";
import { db, notificationsTable, usersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/notifications", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }

    const notifications = await db.select()
      .from(notificationsTable)
      .where(eq(notificationsTable.userId, user[0].id))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(30);

    res.json(notifications);
  } catch (err) {
    req.log.error({ err }, "Failed to list notifications");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/notifications/:id/read", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const { id } = req.params;
    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }

    await db.update(notificationsTable)
      .set({ isRead: true })
      .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, user[0].id)));

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to mark notification as read");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/notifications/read-all", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }

    await db.update(notificationsTable)
      .set({ isRead: true })
      .where(and(eq(notificationsTable.userId, user[0].id), eq(notificationsTable.isRead, false)));

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to mark all notifications as read");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
