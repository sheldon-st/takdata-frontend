"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Play, Square, AlertCircle, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWsStatus } from "@/components/ws-context";
import { startEnablement, stopEnablement } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

export function EnablementsStatusList() {
  const { status, connected } = useWsStatus();
  const router = useRouter();
  const queryClient = useQueryClient();

  const startMut = useMutation({
    mutationFn: (id: number) => startEnablement(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.enablements }),
    onError: (e: Error) => toast.error(`Start failed: ${e.message}`),
  });

  const stopMut = useMutation({
    mutationFn: (id: number) => stopEnablement(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.enablements }),
    onError: (e: Error) => toast.error(`Stop failed: ${e.message}`),
  });

  if (!connected && !status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Enablements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-md" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const enablements = status?.enablements ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">Enablements</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/enablements")}
          className="gap-1"
        >
          Manage
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>

      <CardContent>
        {enablements.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No enablements configured.{" "}
            <button
              className="underline underline-offset-2 hover:text-foreground"
              onClick={() => router.push("/enablements")}
            >
              Add one
            </button>
          </p>
        ) : (
          <div className="divide-y divide-border">
            {enablements.map((e) => {
              const isBusy =
                startMut.isPending || stopMut.isPending;

              return (
                <div
                  key={e.id}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  {/* Running indicator */}
                  <span
                    className={cn(
                      "h-2.5 w-2.5 shrink-0 rounded-full",
                      e.running
                        ? "animate-pulse bg-green-500"
                        : "bg-muted-foreground/40",
                    )}
                  />

                  {/* Name + type */}
                  <div className="min-w-0 flex-1">
                    <button
                      className="truncate text-sm font-medium hover:underline"
                      onClick={() => router.push(`/enablements/${e.id}`)}
                    >
                      {e.name}
                    </button>
                    <div className="mt-0.5 flex items-center gap-2">
                      <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                        {e.type_id.toUpperCase()}
                      </Badge>
                      {e.running && (
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {e.active_items} active · {e.events_sent} sent
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Error icon */}
                  {e.last_error && (
                    <span title={e.last_error} className="shrink-0">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    </span>
                  )}

                  {/* Start / Stop */}
                  {e.running ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => stopMut.mutate(e.id)}
                      disabled={isBusy}
                      className="h-7 gap-1 px-2 text-xs"
                    >
                      <Square className="h-3 w-3" />
                      Stop
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startMut.mutate(e.id)}
                      disabled={isBusy}
                      className="h-7 gap-1 px-2 text-xs"
                    >
                      <Play className="h-3 w-3" />
                      Start
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
