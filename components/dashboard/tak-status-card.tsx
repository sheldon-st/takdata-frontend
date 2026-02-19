"use client";

import { useMutation } from "@tanstack/react-query";
import { Plug, PlugZap, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWsStatus } from "@/components/ws-context";
import { postTakConnect, postTakDisconnect } from "@/lib/api";
import { cn } from "@/lib/utils";

export function TakStatusCard() {
  const { status } = useWsStatus();

  const connectMut = useMutation({
    mutationFn: postTakConnect,
    onSuccess: () => toast.success("TAK server connect request sent"),
    onError: (e: Error) => toast.error(`Connect failed: ${e.message}`),
  });

  const disconnectMut = useMutation({
    mutationFn: postTakDisconnect,
    onSuccess: () => toast.success("TAK server disconnected"),
    onError: (e: Error) => toast.error(`Disconnect failed: ${e.message}`),
  });

  const connected = status?.tak_connected ?? false;
  const url = status?.tak_url ?? "—";
  const txQueue = status?.tx_queue_size ?? 0;
  const connectError = status?.connect_error;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">TAK Server</CardTitle>
        <Badge
          variant={connected ? "default" : "secondary"}
          className={cn(
            "gap-1.5",
            connected && "bg-green-600 text-white hover:bg-green-700",
          )}
        >
          {connected ? (
            <Wifi className="h-3 w-3" />
          ) : (
            <WifiOff className="h-3 w-3" />
          )}
          {connected ? "Connected" : "Disconnected"}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Server URL</p>
            <p className="mt-0.5 font-mono text-xs break-all">{url}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">TX Queue</p>
            <p className="mt-0.5 font-semibold tabular-nums">{txQueue}</p>
          </div>
        </div>

        {connectError && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {connectError}
          </p>
        )}

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => connectMut.mutate()}
            disabled={connectMut.isPending || disconnectMut.isPending}
            className="gap-1.5"
          >
            <PlugZap className="h-3.5 w-3.5" />
            {connected ? "Reconnect" : "Connect"}
          </Button>
          {connected && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => disconnectMut.mutate()}
              disabled={connectMut.isPending || disconnectMut.isPending}
              className="gap-1.5 text-destructive hover:text-destructive"
            >
              <Plug className="h-3.5 w-3.5" />
              Disconnect
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
