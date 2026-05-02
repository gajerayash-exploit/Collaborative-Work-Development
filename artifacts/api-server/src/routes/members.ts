import { Router, type IRouter } from "express";
import { db, workspaceMembersTable, usersTable, workspacesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/workspaces/:workspaceId/members", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const { workspaceId } = req.params;
    const currentUser = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
    if (!currentUser[0]) { res.status(404).json({ error: "User not found" }); return; }

    const membership = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, currentUser[0].id)))
      .limit(1);
    if (!membership[0]) { res.status(403).json({ error: "Access denied" }); return; }

    const members = await db.select({
      id: workspaceMembersTable.id,
      workspaceId: workspaceMembersTable.workspaceId,
      userId: workspaceMembersTable.userId,
      role: workspaceMembersTable.role,
      joinedAt: workspaceMembersTable.joinedAt,
      userClerkId: usersTable.clerkId,
      userName: usersTable.name,
      userEmail: usersTable.email,
      userAvatarUrl: usersTable.avatarUrl,
      userCreatedAt: usersTable.createdAt,
    })
      .from(workspaceMembersTable)
      .innerJoin(usersTable, eq(workspaceMembersTable.userId, usersTable.id))
      .where(eq(workspaceMembersTable.workspaceId, workspaceId));

    res.json(members.map(m => ({
      id: m.id,
      workspaceId: m.workspaceId,
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt,
      user: {
        id: m.userId,
        clerkId: m.userClerkId,
        email: m.userEmail,
        name: m.userName,
        avatarUrl: m.userAvatarUrl,
        createdAt: m.userCreatedAt,
      },
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to list members");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/workspaces/:workspaceId/members", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const { workspaceId } = req.params;
    const { email, role = "viewer" } = req.body;

    const currentUser = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
    if (!currentUser[0]) { res.status(404).json({ error: "User not found" }); return; }

    const membership = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, currentUser[0].id)))
      .limit(1);
    if (!membership[0] || membership[0].role !== "admin") { res.status(403).json({ error: "Only admins can invite members" }); return; }

    const targetUser = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!targetUser[0]) { res.status(404).json({ error: "User not found. They must sign up first." }); return; }

    const existing = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, targetUser[0].id)))
      .limit(1);
    if (existing[0]) { res.status(409).json({ error: "User is already a member" }); return; }

    const [newMember] = await db.insert(workspaceMembersTable).values({
      workspaceId,
      userId: targetUser[0].id,
      role,
    }).returning();

    res.status(201).json({
      ...newMember,
      user: targetUser[0],
    });
  } catch (err) {
    req.log.error({ err }, "Failed to invite member");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/workspaces/:workspaceId/members/:memberId", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const { workspaceId, memberId } = req.params;
    const { role } = req.body;

    const currentUser = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
    if (!currentUser[0]) { res.status(404).json({ error: "User not found" }); return; }

    const adminMembership = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, currentUser[0].id)))
      .limit(1);
    if (!adminMembership[0] || adminMembership[0].role !== "admin") { res.status(403).json({ error: "Access denied" }); return; }

    const [updated] = await db.update(workspaceMembersTable)
      .set({ role })
      .where(and(eq(workspaceMembersTable.id, memberId), eq(workspaceMembersTable.workspaceId, workspaceId)))
      .returning();

    if (!updated) { res.status(404).json({ error: "Member not found" }); return; }

    const user = await db.select().from(usersTable).where(eq(usersTable.id, updated.userId)).limit(1);

    res.json({ ...updated, user: user[0] });
  } catch (err) {
    req.log.error({ err }, "Failed to update member role");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/workspaces/:workspaceId/members/:memberId", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const { workspaceId, memberId } = req.params;

    const currentUser = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
    if (!currentUser[0]) { res.status(404).json({ error: "User not found" }); return; }

    const adminMembership = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, currentUser[0].id)))
      .limit(1);
    if (!adminMembership[0] || adminMembership[0].role !== "admin") { res.status(403).json({ error: "Access denied" }); return; }

    await db.delete(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.id, memberId), eq(workspaceMembersTable.workspaceId, workspaceId)));

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to remove member");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
