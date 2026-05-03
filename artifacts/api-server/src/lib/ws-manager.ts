import { WebSocket } from "ws";

export interface WsClient {
  ws: WebSocket;
  userId: string;
  dbUserId: string;
  name: string | null;
  avatarUrl: string | null;
  workspaceId: string;
}

const rooms = new Map<string, Set<WsClient>>();

export function joinRoom(workspaceId: string, client: WsClient): void {
  if (!rooms.has(workspaceId)) rooms.set(workspaceId, new Set());
  rooms.get(workspaceId)!.add(client);
  broadcastPresence(workspaceId);
}

export function leaveRoom(workspaceId: string, client: WsClient): void {
  const room = rooms.get(workspaceId);
  if (!room) return;
  room.delete(client);
  if (room.size === 0) rooms.delete(workspaceId);
  else broadcastPresence(workspaceId);
}

export function broadcastToWorkspace(
  workspaceId: string,
  message: object,
  excludeDbUserId?: string,
): void {
  const room = rooms.get(workspaceId);
  if (!room) return;
  const data = JSON.stringify(message);
  for (const client of room) {
    if (excludeDbUserId && client.dbUserId === excludeDbUserId) continue;
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  }
}

export function broadcastPresence(workspaceId: string): void {
  const room = rooms.get(workspaceId);
  const seen = new Set<string>();
  const users = room
    ? Array.from(room)
        .filter((c) => {
          if (seen.has(c.dbUserId)) return false;
          seen.add(c.dbUserId);
          return true;
        })
        .map((c) => ({
          id: c.dbUserId,
          name: c.name,
          avatarUrl: c.avatarUrl,
        }))
    : [];
  broadcastToWorkspace(workspaceId, { type: "presence", workspaceId, users });
}

export function sendToUser(
  workspaceId: string,
  targetDbUserId: string,
  message: object,
): void {
  const room = rooms.get(workspaceId);
  if (!room) return;
  const data = JSON.stringify(message);
  for (const client of room) {
    if (
      client.dbUserId === targetDbUserId &&
      client.ws.readyState === WebSocket.OPEN
    ) {
      client.ws.send(data);
      break;
    }
  }
}

export function getPresence(workspaceId: string) {
  const room = rooms.get(workspaceId);
  if (!room) return [];
  const seen = new Set<string>();
  return Array.from(room)
    .filter((c) => {
      if (seen.has(c.dbUserId)) return false;
      seen.add(c.dbUserId);
      return true;
    })
    .map((c) => ({
      id: c.dbUserId,
      name: c.name,
      avatarUrl: c.avatarUrl,
    }));
}

export function getPresenceUserIds(workspaceId: string): string[] {
  const room = rooms.get(workspaceId);
  if (!room) return [];
  return Array.from(room).map((c) => c.dbUserId);
}
