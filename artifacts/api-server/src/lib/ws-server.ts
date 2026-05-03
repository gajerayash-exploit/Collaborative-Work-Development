import { WebSocketServer, WebSocket } from "ws";
import { verifyToken } from "@clerk/express";
import { IncomingMessage } from "node:http";
import { db, usersTable, workspaceMembersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "./logger";
import { joinRoom, leaveRoom, broadcastToWorkspace, sendToUser, WsClient } from "./ws-manager";
import { URL } from "node:url";

export function setupWsServer(wss: WebSocketServer): void {
  wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
    let client: WsClient | null = null;
    let pingTimer: ReturnType<typeof setInterval> | null = null;

    try {
      const rawUrl = req.url ?? "/";
      const url = new URL(rawUrl, "http://localhost");
      const token = url.searchParams.get("token");
      const workspaceId = url.searchParams.get("workspaceId");

      if (!token || !workspaceId) {
        ws.close(4001, "Missing token or workspaceId");
        return;
      }

      let clerkUserId: string;
      try {
        const payload = await verifyToken(token, {
          secretKey: process.env["CLERK_SECRET_KEY"],
        });
        clerkUserId = payload.sub;
      } catch {
        ws.close(4003, "Invalid token");
        return;
      }

      const userRows = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.clerkId, clerkUserId))
        .limit(1);
      if (!userRows[0]) {
        ws.close(4004, "User not found");
        return;
      }
      const dbUser = userRows[0];

      const memberRows = await db
        .select()
        .from(workspaceMembersTable)
        .where(
          and(
            eq(workspaceMembersTable.workspaceId, workspaceId),
            eq(workspaceMembersTable.userId, dbUser.id),
          ),
        )
        .limit(1);
      if (!memberRows[0]) {
        ws.close(4003, "Not a member of this workspace");
        return;
      }

      client = {
        ws,
        userId: clerkUserId,
        dbUserId: dbUser.id,
        name: dbUser.name,
        avatarUrl: dbUser.avatarUrl,
        workspaceId,
      };

      joinRoom(workspaceId, client);
      ws.send(JSON.stringify({ type: "connected", userId: dbUser.id }));

      pingTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.ping();
      }, 25000);

      ws.on("pong", () => {});

      ws.on("message", (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === "ping") {
            ws.send(JSON.stringify({ type: "pong" }));
          } else if (msg.type === "typing" && client) {
            broadcastToWorkspace(
              client.workspaceId,
              {
                type: "typing",
                userId: client.dbUserId,
                name: client.name,
                avatarUrl: client.avatarUrl,
              },
              client.dbUserId,
            );
          } else if (msg.type === "rtc_join" && client) {
            // Broadcast to everyone else — they should each send an offer to the newcomer
            broadcastToWorkspace(
              client.workspaceId,
              { type: "rtc_join", from: client.dbUserId },
              client.dbUserId,
            );
          } else if (msg.type === "rtc_offer" && client && msg.to) {
            sendToUser(client.workspaceId, msg.to, {
              type: "rtc_offer",
              from: client.dbUserId,
              sdp: msg.sdp,
            });
          } else if (msg.type === "rtc_answer" && client && msg.to) {
            sendToUser(client.workspaceId, msg.to, {
              type: "rtc_answer",
              from: client.dbUserId,
              sdp: msg.sdp,
            });
          } else if (msg.type === "rtc_ice" && client && msg.to) {
            sendToUser(client.workspaceId, msg.to, {
              type: "rtc_ice",
              from: client.dbUserId,
              candidate: msg.candidate,
            });
          } else if (msg.type === "rtc_leave" && client) {
            broadcastToWorkspace(
              client.workspaceId,
              { type: "rtc_leave", from: client.dbUserId },
              client.dbUserId,
            );
          }
        } catch {}
      });

      ws.on("close", () => {
        if (client) leaveRoom(workspaceId, client);
        if (pingTimer) clearInterval(pingTimer);
        logger.info({ workspaceId, userId: clerkUserId }, "WS client disconnected");
      });

      ws.on("error", (err) => {
        logger.warn({ err }, "WS client error");
        if (client) leaveRoom(workspaceId, client);
        if (pingTimer) clearInterval(pingTimer);
      });

      logger.info({ workspaceId, userId: clerkUserId }, "WS client connected");
    } catch (err) {
      logger.error({ err }, "WS connection setup failed");
      ws.close(1011, "Internal error");
      if (pingTimer) clearInterval(pingTimer);
    }
  });
}
