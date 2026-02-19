"use client";

import { useEffect, useRef, useCallback } from "react";
import type { WsStatusMessage } from "@/lib/types";

const BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000")
    .replace(/\/$/, "")
    .replace(/^http/, "ws");

const WS_URL = `${BASE_URL}/api/v1/ws/status`;

const MIN_RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 30000;

interface UseWebSocketOptions {
  onMessage: (msg: WsStatusMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export function useWebSocket({ onMessage, onOpen, onClose }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectDelay = useRef(MIN_RECONNECT_MS);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(true);

  const clearTimer = () => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
  };

  const connect = useCallback(() => {
    if (!isMounted.current) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectDelay.current = MIN_RECONNECT_MS;
      onOpen?.();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as WsStatusMessage;
        onMessage(data);
      } catch {
        // ignore malformed frames
      }
    };

    ws.onclose = () => {
      onClose?.();
      if (!isMounted.current) return;
      clearTimer();
      reconnectTimer.current = setTimeout(() => {
        reconnectDelay.current = Math.min(
          reconnectDelay.current * 2,
          MAX_RECONNECT_MS,
        );
        connect();
      }, reconnectDelay.current);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [onMessage, onOpen, onClose]);

  useEffect(() => {
    isMounted.current = true;
    connect();
    return () => {
      isMounted.current = false;
      clearTimer();
      wsRef.current?.close();
    };
    // connect is stable via useCallback; eslint-disable below is intentional
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
