"use client";

import { useEffect, useRef } from "react";
import type { WsStatusMessage } from "@/lib/types";

const CONFIGURED_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

function getWsUrl() {
  if (CONFIGURED_BASE_URL) {
    return `${CONFIGURED_BASE_URL.replace(/^http/, "ws")}/api/v1/ws/status`;
  }
  const scheme = window.location.protocol === "https:" ? "wss" : "ws";
  return `${scheme}://${window.location.host}/api/v1/ws/status`;
}

const MIN_RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 30000;

interface UseWebSocketOptions {
  onMessage: (msg: WsStatusMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

/**
 * Subscribe to the backend status stream, reconnecting with exponential
 * backoff (1 s → 30 s). Callbacks may change between renders without
 * tearing down the socket.
 */
export function useWebSocket({ onMessage, onOpen, onClose }: UseWebSocketOptions) {
  const handlers = useRef({ onMessage, onOpen, onClose });
  useEffect(() => {
    handlers.current = { onMessage, onOpen, onClose };
  }, [onMessage, onOpen, onClose]);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let delay = MIN_RECONNECT_MS;
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      ws = new WebSocket(getWsUrl());

      ws.onopen = () => {
        delay = MIN_RECONNECT_MS;
        handlers.current.onOpen?.();
      };

      ws.onmessage = (event) => {
        try {
          handlers.current.onMessage(JSON.parse(event.data as string) as WsStatusMessage);
        } catch {
          // ignore malformed frames
        }
      };

      ws.onclose = () => {
        handlers.current.onClose?.();
        if (disposed) return;
        timer = setTimeout(connect, delay);
        delay = Math.min(delay * 2, MAX_RECONNECT_MS);
      };

      ws.onerror = () => ws?.close();
    };

    connect();

    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      ws?.close();
    };
  }, []);
}
