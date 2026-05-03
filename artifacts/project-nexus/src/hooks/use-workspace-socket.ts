import { useEffect, useRef, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import {
  getListMessagesQueryKey,
  getListSyncEventsQueryKey,
  getGetHuddleQueryKey,
} from "@workspace/api-client-react";
import type { RtcSignal } from "./use-huddle-rtc";

export interface PresenceUser {
  id: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface TypingUser {
  userId: string;
  name: string | null;
  avatarUrl: string | null;
}

interface SocketMessage {
  type:
    | "connected"
    | "presence"
    | "new_message"
    | "sync_event"
    | "huddle_update"
    | "typing"
    | "message_read"
    | "pong"
    | "rtc_join"
    | "rtc_offer"
    | "rtc_answer"
    | "rtc_ice"
    | "rtc_leave";
  workspaceId?: string;
  users?: PresenceUser[];
  message?: unknown;
  event?: unknown;
  state?: unknown;
  userId?: string;
  name?: string | null;
  avatarUrl?: string | null;
  // RTC fields
  from?: string;
  to?: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

interface UseWorkspaceSocketOptions {
  workspaceId: string;
  onPresence?: (users: PresenceUser[]) => void;
  onRtcSignal?: (msg: RtcSignal) => void;
  enabled?: boolean;
}

interface UseWorkspaceSocketResult {
  typingUsers: TypingUser[];
  sendTyping: () => void;
  sendMessage: (msg: object) => void;
  myDbUserId: string | null;
}

const BASE_DELAY = 1000;
const MAX_DELAY = 30000;
const TYPING_TTL = 4000;
const HEARTBEAT_INTERVAL = 15000;
const HEARTBEAT_TIMEOUT = 10000;

function getWsUrl(token: string, workspaceId: string): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  return `${proto}//${host}/api/ws?workspaceId=${encodeURIComponent(workspaceId)}&token=${encodeURIComponent(token)}`;
}

export function useWorkspaceSocket({
  workspaceId,
  onPresence,
  onRtcSignal,
  enabled = true,
}: UseWorkspaceSocketOptions): UseWorkspaceSocketResult {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatDeadlineRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);
  const onPresenceRef = useRef(onPresence);
  onPresenceRef.current = onPresence;
  const onRtcSignalRef = useRef(onRtcSignal);
  onRtcSignalRef.current = onRtcSignal;

  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [myDbUserId, setMyDbUserId] = useState<string | null>(null);
  // Map of userId → expiry timer
  const typingTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeTypist = useCallback((userId: string) => {
    setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
    typingTimersRef.current.delete(userId);
  }, []);

  const handleTypingEvent = useCallback(
    (userId: string, name: string | null, avatarUrl: string | null) => {
      setTypingUsers((prev) => {
        const exists = prev.find((u) => u.userId === userId);
        if (exists) return prev;
        return [...prev, { userId, name, avatarUrl }];
      });
      // Reset expiry timer
      const existing = typingTimersRef.current.get(userId);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => removeTypist(userId), TYPING_TTL);
      typingTimersRef.current.set(userId, timer);
    },
    [removeTypist],
  );

  const connect = useCallback(async () => {
    if (unmountedRef.current || !enabled) return;

    const clearHeartbeat = () => {
      if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current);
      if (heartbeatDeadlineRef.current) clearTimeout(heartbeatDeadlineRef.current);
      heartbeatTimerRef.current = null;
      heartbeatDeadlineRef.current = null;
    };

    try {
      const token = await getToken();
      if (!token || unmountedRef.current) return;

      const url = getWsUrl(token, workspaceId);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        retryRef.current = 0;
        clearHeartbeat();
        const sendHeartbeat = () => {
          if (ws.readyState !== WebSocket.OPEN) return;
          ws.send(JSON.stringify({ type: "ping" }));
          if (heartbeatDeadlineRef.current) clearTimeout(heartbeatDeadlineRef.current);
          heartbeatDeadlineRef.current = setTimeout(() => {
            try {
              ws.close();
            } catch {}
          }, HEARTBEAT_TIMEOUT);
          heartbeatTimerRef.current = setTimeout(sendHeartbeat, HEARTBEAT_INTERVAL);
        };
        sendHeartbeat();
      };

      ws.onmessage = (event) => {
        try {
          const msg: SocketMessage = JSON.parse(event.data as string);

          switch (msg.type) {
            case "connected":
              if (msg.userId) setMyDbUserId(msg.userId);
              break;

            case "presence":
              if (msg.users) onPresenceRef.current?.(msg.users);
              break;

            case "new_message":
              qc.invalidateQueries({ queryKey: getListMessagesQueryKey(workspaceId) });
              break;

            case "sync_event":
              qc.invalidateQueries({ queryKey: getListSyncEventsQueryKey(workspaceId) });
              break;

            case "huddle_update":
              qc.invalidateQueries({ queryKey: getGetHuddleQueryKey(workspaceId) });
              break;

            case "message_read":
              qc.invalidateQueries({ queryKey: getListMessagesQueryKey(workspaceId) });
              break;

            case "typing":
              if (msg.userId) {
                handleTypingEvent(msg.userId, msg.name ?? null, msg.avatarUrl ?? null);
              }
              break;

            case "rtc_join":
            case "rtc_offer":
            case "rtc_answer":
            case "rtc_ice":
            case "rtc_leave":
              if (msg.from) {
                onRtcSignalRef.current?.({
                  type: msg.type as RtcSignal["type"],
                  from: msg.from,
                  sdp: msg.sdp,
                  candidate: msg.candidate,
                });
              }
              break;
          }
        } catch {}
      };

      ws.onclose = (ev) => {
        wsRef.current = null;
        clearHeartbeat();
        if (unmountedRef.current) return;
        if (ev.code === 4001 || ev.code === 4003 || ev.code === 4004) return;

        const delay = Math.min(BASE_DELAY * Math.pow(2, retryRef.current), MAX_DELAY);
        retryRef.current += 1;
        timerRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {};
    } catch {}
  }, [workspaceId, enabled, getToken, qc, handleTypingEvent]);

  useEffect(() => {
    unmountedRef.current = false;
    if (enabled) connect();

    return () => {
      unmountedRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current);
      if (heartbeatDeadlineRef.current) clearTimeout(heartbeatDeadlineRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
      // Clear all typing timers
      for (const t of typingTimersRef.current.values()) clearTimeout(t);
      typingTimersRef.current.clear();
    };
  }, [connect, enabled]);

  const sendTyping = useCallback(() => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "typing", workspaceId }));
    }
  }, [workspaceId]);

  const sendMessage = useCallback((msg: object) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }, []);

  return { typingUsers, sendTyping, sendMessage, myDbUserId };
}
