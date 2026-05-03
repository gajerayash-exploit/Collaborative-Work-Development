import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import {
  getListMessagesQueryKey,
  getListSyncEventsQueryKey,
  getGetHuddleQueryKey,
} from "@workspace/api-client-react";

export interface PresenceUser {
  id: string;
  name: string | null;
  avatarUrl: string | null;
}

interface SocketMessage {
  type: "connected" | "presence" | "new_message" | "sync_event" | "huddle_update" | "pong";
  workspaceId?: string;
  users?: PresenceUser[];
  message?: unknown;
  event?: unknown;
  state?: unknown;
  userId?: string;
}

interface UseWorkspaceSocketOptions {
  workspaceId: string;
  onPresence?: (users: PresenceUser[]) => void;
  enabled?: boolean;
}

const BASE_DELAY = 1000;
const MAX_DELAY = 30000;

function getWsUrl(token: string, workspaceId: string): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  return `${proto}//${host}/api/ws?workspaceId=${encodeURIComponent(workspaceId)}&token=${encodeURIComponent(token)}`;
}

export function useWorkspaceSocket({
  workspaceId,
  onPresence,
  enabled = true,
}: UseWorkspaceSocketOptions) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);
  const onPresenceRef = useRef(onPresence);
  onPresenceRef.current = onPresence;

  const connect = useCallback(async () => {
    if (unmountedRef.current || !enabled) return;

    try {
      const token = await getToken();
      if (!token || unmountedRef.current) return;

      const url = getWsUrl(token, workspaceId);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        retryRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const msg: SocketMessage = JSON.parse(event.data as string);

          switch (msg.type) {
            case "presence":
              if (msg.users) onPresenceRef.current?.(msg.users);
              break;

            case "new_message":
              qc.invalidateQueries({
                queryKey: getListMessagesQueryKey(workspaceId),
              });
              break;

            case "sync_event":
              qc.invalidateQueries({
                queryKey: getListSyncEventsQueryKey(workspaceId),
              });
              break;

            case "huddle_update":
              qc.invalidateQueries({
                queryKey: getGetHuddleQueryKey(workspaceId),
              });
              break;
          }
        } catch {}
      };

      ws.onclose = (ev) => {
        wsRef.current = null;
        if (unmountedRef.current) return;
        if (ev.code === 4001 || ev.code === 4003 || ev.code === 4004) return;

        const delay = Math.min(
          BASE_DELAY * Math.pow(2, retryRef.current),
          MAX_DELAY,
        );
        retryRef.current += 1;
        timerRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {};
    } catch {}
  }, [workspaceId, enabled, getToken, qc]);

  useEffect(() => {
    unmountedRef.current = false;
    if (enabled) connect();

    return () => {
      unmountedRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect, enabled]);
}
