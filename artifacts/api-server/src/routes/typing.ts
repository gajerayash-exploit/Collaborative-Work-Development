import { Router, type IRouter } from "express";
import { db, usersTable, workspaceMembersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

// In-memory store: workspaceId -> Map<userId, { name, avatarUrl, ts }>
const typingStore = new Map<string, Map<string, { name: string; avatarUrl: string | null; ts: number }>>();

const TTL_MS = 6000; // treat as "stopped typing" after 6s

function getRoom(workspaceId: string) {
  if (!typingStore.has(workspaceId)) typingStore.set(workspaceId, new Map());
  return typingStore.get(workspaceId)!;
}

function cleanRoom(room: Map<string, { name: string; avatarUrl: string | null; ts: number }>) {
  const now = Date.now();
  for (const [uid, entry] of room) {
    if (now - entry.ts > TTL_MS) room.delete(uid);
  }
}

// POST /workspaces/:workspaceId/typing — called while composing
router.post("/workspaces/:workspaceId/typing", requireAuth, async (req: any, res): Promise<void> => {
  const { workspaceId } = req.params;
  const clerkId = req.clerkUserId;

  const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }

  const membership = await db.select({ id: workspaceMembersTable.id })
    .from(workspaceMembersTable)
    .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, user[0].id)))
    .limit(1);
  if (!membership[0]) { res.status(403).json({ error: "Access denied" }); return; }

  const room = getRoom(workspaceId);
  room.set(user[0].id, { name: user[0].name, avatarUrl: user[0].avatarUrl, ts: Date.now() });

  res.status(204).end();
});

// GET /workspaces/:workspaceId/typing — returns who is currently typing
router.get("/workspaces/:workspaceId/typing", requireAuth, async (req: any, res): Promise<void> => {
  const { workspaceId } = req.params;
  const clerkId = req.clerkUserId;

  const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }

  const membership = await db.select({ id: workspaceMembersTable.id })
    .from(workspaceMembersTable)
    .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, user[0].id)))
    .limit(1);
  if (!membership[0]) { res.status(403).json({ error: "Access denied" }); return; }

  const room = getRoom(workspaceId);
  cleanRoom(room);

  const typists = [];
  for (const [uid, entry] of room) {
    if (uid === user[0].id) continue; // exclude self
    typists.push({ userId: uid, name: entry.name, avatarUrl: entry.avatarUrl });
  }

  res.json(typists);
});

export default router;
