import { Router, type IRouter } from "express";
import { db, workspacesTable, workspaceMembersTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

function generateInviteCode(): string {
  return crypto.randomUUID().replace(/-/g, "").substring(0, 12);
}

router.post("/workspaces/:workspaceId/invite-code", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const { workspaceId } = req.params;

    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }

    const membership = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, user[0].id)))
      .limit(1);
    if (!membership[0] || membership[0].role !== "admin") { res.status(403).json({ error: "Only admins can manage invite links" }); return; }

    const inviteCode = generateInviteCode();
    const [updated] = await db.update(workspacesTable)
      .set({ inviteCode })
      .where(eq(workspacesTable.id, workspaceId))
      .returning({ inviteCode: workspacesTable.inviteCode });

    res.json({ inviteCode: updated.inviteCode });
  } catch (err) {
    req.log.error({ err }, "Failed to generate invite code");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/workspaces/:workspaceId/invite-code", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const { workspaceId } = req.params;

    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }

    const membership = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, user[0].id)))
      .limit(1);
    if (!membership[0] || membership[0].role !== "admin") { res.status(403).json({ error: "Only admins can manage invite links" }); return; }

    await db.update(workspacesTable)
      .set({ inviteCode: null })
      .where(eq(workspacesTable.id, workspaceId));

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to revoke invite code");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/join/:inviteCode", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const { inviteCode } = req.params;

    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }

    const workspace = await db.select().from(workspacesTable)
      .where(eq(workspacesTable.inviteCode, inviteCode))
      .limit(1);
    if (!workspace[0]) { res.status(404).json({ error: "Invalid or expired invite link" }); return; }

    const existing = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspace[0].id), eq(workspaceMembersTable.userId, user[0].id)))
      .limit(1);

    if (existing[0]) {
      res.json({ workspaceId: workspace[0].id, alreadyMember: true });
      return;
    }

    await db.insert(workspaceMembersTable).values({
      workspaceId: workspace[0].id,
      userId: user[0].id,
      role: "viewer",
    });

    res.json({ workspaceId: workspace[0].id, alreadyMember: false });
  } catch (err) {
    req.log.error({ err }, "Failed to join via invite");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/workspaces/:workspaceId/invite-code", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const { workspaceId } = req.params;

    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }

    const membership = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, user[0].id)))
      .limit(1);
    if (!membership[0] || membership[0].role !== "admin") { res.status(403).json({ error: "Only admins can view invite links" }); return; }

    const workspace = await db.select({ inviteCode: workspacesTable.inviteCode })
      .from(workspacesTable)
      .where(eq(workspacesTable.id, workspaceId))
      .limit(1);
    if (!workspace[0]) { res.status(404).json({ error: "Workspace not found" }); return; }

    res.json({ inviteCode: workspace[0].inviteCode });
  } catch (err) {
    req.log.error({ err }, "Failed to get invite code");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
