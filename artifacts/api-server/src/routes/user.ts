import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

async function getOrCreateUser(clerkUserId: string, email: string, name: string, avatarUrl?: string) {
  const existing = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
  if (existing.length > 0) return existing[0];
  const [user] = await db.insert(usersTable).values({
    clerkId: clerkUserId,
    email,
    name,
    avatarUrl: avatarUrl ?? null,
  }).returning();
  return user;
}

router.get("/user/profile", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
    if (user.length === 0) {
      res.status(404).json({ error: "User not found" }); return;
    }
    res.json(user[0]);
  } catch (err) {
    req.log.error({ err }, "Failed to get user profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/user/profile", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const { name, avatarUrl } = req.body;
    const [updated] = await db.update(usersTable)
      .set({ name, avatarUrl, updatedAt: new Date() })
      .where(eq(usersTable.clerkId, clerkUserId))
      .returning();
    if (!updated) { res.status(404).json({ error: "User not found" }); return; }
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update user profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/user/sync", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const { email, name, avatarUrl } = req.body;
    const user = await getOrCreateUser(clerkUserId, email ?? "unknown@example.com", name ?? "User", avatarUrl);
    res.json(user);
  } catch (err) {
    req.log.error({ err }, "Failed to sync user");
    res.status(500).json({ error: "Internal server error" });
  }
});

export { getOrCreateUser };
export default router;
