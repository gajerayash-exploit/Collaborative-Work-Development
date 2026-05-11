import { Router, type IRouter } from "express";
import { db, usersTable, workspaceMembersTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

type PresenceEntry = {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  ts: number;
};

const router: IRouter = Router();
const presenceStore = new Map<string, Map<string, PresenceEntry>>();
const TTL_MS = 30_000;

function getRoom(workspaceId: string): Map<string, PresenceEntry> {
  if (!presenceStore.has(workspaceId)) {
    presenceStore.set(workspaceId, new Map());
  }
  return presenceStore.get(workspaceId)!;
}

function cleanRoom(
  workspaceId: string,
  room: Map<string, PresenceEntry>,
): void {
  const now = Date.now();
  for (const [userId, entry] of room) {
    if (now - entry.ts > TTL_MS) {
      room.delete(userId);
    }
  }
  if (room.size === 0) {
    presenceStore.delete(workspaceId);
  }
}

router.post(
  "/workspaces/:workspaceId/presence/heartbeat",
  requireAuth,
  async (req: any, res): Promise<void> => {
    const { workspaceId } = req.params;
    const clerkId = req.clerkUserId;

    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkId, clerkId))
      .limit(1);
    if (!user[0]) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const membership = await db
      .select({ id: workspaceMembersTable.id })
      .from(workspaceMembersTable)
      .where(
        and(
          eq(workspaceMembersTable.workspaceId, workspaceId),
          eq(workspaceMembersTable.userId, user[0].id),
        ),
      )
      .limit(1);
    if (!membership[0]) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const room = getRoom(workspaceId);
    room.set(user[0].id, {
      id: user[0].id,
      name: user[0].name,
      avatarUrl: user[0].avatarUrl,
      ts: Date.now(),
    });

    cleanRoom(workspaceId, room);
    res.status(204).end();
  },
);

router.get(
  "/workspaces/:workspaceId/presence",
  requireAuth,
  async (req: any, res): Promise<void> => {
    const { workspaceId } = req.params;
    const clerkId = req.clerkUserId;

    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkId, clerkId))
      .limit(1);
    if (!user[0]) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const membership = await db
      .select({ id: workspaceMembersTable.id })
      .from(workspaceMembersTable)
      .where(
        and(
          eq(workspaceMembersTable.workspaceId, workspaceId),
          eq(workspaceMembersTable.userId, user[0].id),
        ),
      )
      .limit(1);
    if (!membership[0]) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const room = getRoom(workspaceId);
    cleanRoom(workspaceId, room);

    res.json({
      currentUserId: user[0].id,
      users: Array.from(room.values()).map(({ id, name, avatarUrl }) => ({
        id,
        name,
        avatarUrl,
      })),
    });
  },
);

export default router;
