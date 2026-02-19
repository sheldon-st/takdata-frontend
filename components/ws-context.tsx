"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import type { WsStatusMessage } from "@/lib/types";

interface WsContextValue {
  status: WsStatusMessage | null;
  connected: boolean;
}

const WsContext = createContext<WsContextValue>({ status: null, connected: false });

export function useWsStatus() {
  return useContext(WsContext);
}

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<WsStatusMessage | null>(null);
  const [connected, setConnected] = useState(false);

  const handleMessage = useCallback((msg: WsStatusMessage) => {
    setStatus(msg);
  }, []);

  const handleOpen = useCallback(() => {
    setConnected(true);
  }, []);

  const handleClose = useCallback(() => {
    setConnected(false);
  }, []);

  useWebSocket({
    onMessage: handleMessage,
    onOpen: handleOpen,
    onClose: handleClose,
  });

  return (
    <WsContext.Provider value={{ status, connected }}>
      {!connected && (
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-yellow-500/90 py-1 text-xs font-medium text-black">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-black/40" />
          Reconnecting to live status…
        </div>
      )}
      {children}
    </WsContext.Provider>
  );
}
