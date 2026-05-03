import { Router, type IRouter } from "express";
import { db, branchesTable, workspaceMembersTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

async function requireMembership(req: any, res: any, workspaceId: string, minRole?: string) {
  const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, req.clerkUserId)).limit(1);
  if (!user[0]) { res.status(404).json({ error: "User not found" }); return null; }
  const membership = await db.select().from(workspaceMembersTable)
    .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, user[0].id)))
    .limit(1);
  if (!membership[0]) { res.status(403).json({ error: "Access denied" }); return null; }
  if (minRole === "admin" && membership[0].role !== "admin") {
    res.status(403).json({ error: "Admin access required" }); return null;
  }
  return { user: user[0], membership: membership[0] };
}

router.get("/workspaces/:workspaceId/branches", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const ctx = await requireMembership(req, res, workspaceId);
    if (!ctx) return;
    const branches = await db.select().from(branchesTable)
      .where(eq(branchesTable.workspaceId, workspaceId));
    res.json(branches);
  } catch (err) {
    req.log.error({ err }, "Failed to list branches");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/workspaces/:workspaceId/branches", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const ctx = await requireMembership(req, res, workspaceId, "admin");
    if (!ctx) return;
    const { name, description, isProtected, allowedRoles } = req.body;
    if (!name) { res.status(400).json({ error: "Name is required" }); return; }
    const [branch] = await db.insert(branchesTable).values({
      workspaceId,
      name,
      description: description ?? null,
      isProtected: isProtected ?? false,
      allowedRoles: allowedRoles ?? ["admin", "editor", "viewer"],
      createdBy: ctx.user.id,
    }).returning();
    res.status(201).json(branch);
  } catch (err) {
    req.log.error({ err }, "Failed to create branch");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/workspaces/:workspaceId/branches/:branchId", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const { workspaceId, branchId } = req.params;
    const ctx = await requireMembership(req, res, workspaceId, "admin");
    if (!ctx) return;
    const { name, description, isProtected, allowedRoles } = req.body;
    const [updated] = await db.update(branchesTable)
      .set({
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(isProtected !== undefined && { isProtected }),
        ...(allowedRoles !== undefined && { allowedRoles }),
        updatedAt: new Date(),
      })
      .where(and(eq(branchesTable.id, branchId), eq(branchesTable.workspaceId, workspaceId)))
      .returning();
    if (!updated) { res.status(404).json({ error: "Branch not found" }); return; }
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update branch");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/workspaces/:workspaceId/branches/:branchId", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const { workspaceId, branchId } = req.params;
    const ctx = await requireMembership(req, res, workspaceId, "admin");
    if (!ctx) return;
    await db.delete(branchesTable)
      .where(and(eq(branchesTable.id, branchId), eq(branchesTable.workspaceId, workspaceId)));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete branch");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
