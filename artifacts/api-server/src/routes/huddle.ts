import { Router, type IRouter } from "express";
import { db, huddleSessionsTable, workspaceMembersTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

async function getOrCreateHuddle(workspaceId: string) {
  const existing = await db.select().from(huddleSessionsTable)
    .where(eq(huddleSessionsTable.workspaceId, workspaceId)).limit(1);
  if (existing[0]) return existing[0];
  const [created] = await db.insert(huddleSessionsTable).values({
    workspaceId,
    participants: "[]",
  }).returning();
  return created;
}

router.get("/workspaces/:workspaceId/huddle", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, req.clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }
    const membership = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, user[0].id)))
      .limit(1);
    if (!membership[0]) { res.status(403).json({ error: "Access denied" }); return; }

    const huddle = await getOrCreateHuddle(workspaceId);
    const participants: string[] = JSON.parse(huddle.participants || "[]");

    if (participants.length === 0) {
      res.json({ workspaceId, participants: [], active: false });
      return;
    }

    const members = await db.select({
      id: usersTable.id,
      name: usersTable.name,
      avatarUrl: usersTable.avatarUrl,
      email: usersTable.email,
    }).from(usersTable).where(eq(usersTable.id, participants[0]));

    const allMembers = await Promise.all(
      participants.map(uid =>
        db.select({ id: usersTable.id, name: usersTable.name, avatarUrl: usersTable.avatarUrl, email: usersTable.email })
          .from(usersTable).where(eq(usersTable.id, uid)).limit(1).then(r => r[0])
      )
    );

    res.json({
      workspaceId,
      active: participants.length > 0,
      participants: allMembers.filter(Boolean),
      currentUserId: user[0].id,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get huddle");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/workspaces/:workspaceId/huddle/join", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, req.clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }
    const membership = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, user[0].id)))
      .limit(1);
    if (!membership[0]) { res.status(403).json({ error: "Access denied" }); return; }

    const huddle = await getOrCreateHuddle(workspaceId);
    const participants: string[] = JSON.parse(huddle.participants || "[]");
    if (!participants.includes(user[0].id)) participants.push(user[0].id);

    await db.update(huddleSessionsTable)
      .set({ participants: JSON.stringify(participants), updatedAt: new Date() })
      .where(eq(huddleSessionsTable.workspaceId, workspaceId));

    res.json({ success: true, participantCount: participants.length });
  } catch (err) {
    req.log.error({ err }, "Failed to join huddle");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/workspaces/:workspaceId/huddle/leave", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, req.clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }
    const membership = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, user[0].id)))
      .limit(1);
    if (!membership[0]) { res.status(403).json({ error: "Access denied" }); return; }

    const huddle = await getOrCreateHuddle(workspaceId);
    const participants: string[] = JSON.parse(huddle.participants || "[]");
    const updated = participants.filter(id => id !== user[0].id);

    await db.update(huddleSessionsTable)
      .set({ participants: JSON.stringify(updated), updatedAt: new Date() })
      .where(eq(huddleSessionsTable.workspaceId, workspaceId));

    res.json({ success: true, participantCount: updated.length });
  } catch (err) {
    req.log.error({ err }, "Failed to leave huddle");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
