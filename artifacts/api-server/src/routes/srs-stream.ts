import { Router, type IRouter, type Request, type Response } from "express";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

type GraphState = {
  nodes: unknown[];
  edges: unknown[];
  updatedAt: number;
  senderId: string;
};

type Subscriber = {
  res: Response;
  userId: string;
  senderId: string;
};

const workspaceSubscribers = new Map<string, Set<Subscriber>>();
const workspaceLatestState = new Map<string, GraphState>();

function broadcast(workspaceId: string, payload: object, excludeSenderId?: string) {
  const subs = workspaceSubscribers.get(workspaceId);
  if (!subs) return;
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const sub of subs) {
    if (excludeSenderId && sub.senderId === excludeSenderId) continue;
    try {
      sub.res.write(data);
    } catch {
      subs.delete(sub);
    }
  }
}

router.get("/srs/stream", requireAuth, (req: Request & { user?: { id: string } }, res: Response): void => {
  const workspaceId = req.query.workspaceId as string;
  const senderId = req.query.senderId as string;

  if (!workspaceId || !senderId) {
    res.status(400).json({ error: "workspaceId and senderId are required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const sub: Subscriber = {
    res,
    userId: (req as any).user?.id ?? "unknown",
    senderId,
  };

  if (!workspaceSubscribers.has(workspaceId)) {
    workspaceSubscribers.set(workspaceId, new Set());
  }
  workspaceSubscribers.get(workspaceId)!.add(sub);

  const latest = workspaceLatestState.get(workspaceId);
  if (latest) {
    res.write(`data: ${JSON.stringify({ type: "initial-state", nodes: latest.nodes, edges: latest.edges, senderId: latest.senderId })}\n\n`);
  } else {
    res.write(`data: ${JSON.stringify({ type: "connected", workspaceId })}\n\n`);
  }

  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`);
    } catch {
      clearInterval(heartbeat);
    }
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    workspaceSubscribers.get(workspaceId)?.delete(sub);
    if (workspaceSubscribers.get(workspaceId)?.size === 0) {
      workspaceSubscribers.delete(workspaceId);
    }
  });
});

router.post("/srs/sync", requireAuth, (req: Request, res: Response): void => {
  const { workspaceId, nodes, edges, senderId } = req.body as {
    workspaceId: string;
    nodes: unknown[];
    edges: unknown[];
    senderId: string;
  };

  if (!workspaceId || !senderId) {
    res.status(400).json({ error: "workspaceId and senderId are required" });
    return;
  }

  workspaceLatestState.set(workspaceId, {
    nodes: nodes ?? [],
    edges: edges ?? [],
    updatedAt: Date.now(),
    senderId,
  });

  broadcast(workspaceId, { type: "graph-update", nodes: nodes ?? [], edges: edges ?? [], senderId }, senderId);

  res.json({ ok: true });
});

router.get("/srs/presence/:workspaceId", requireAuth, (req: Request, res: Response): void => {
  const { workspaceId } = req.params;
  const subs = workspaceSubscribers.get(workspaceId);
  res.json({ count: subs?.size ?? 0 });
});

export default router;
