"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Play, Square, Pencil, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { startEnablement, stopEnablement, deleteEnablement } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { EnablementResponse, EnablementStatusItem } from "@/lib/types";
import { cn } from "@/lib/utils";

interface EnablementCardProps {
  enablement: EnablementResponse;
  liveStatus?: EnablementStatusItem;
}

export function EnablementCard({ enablement, liveStatus }: EnablementCardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const running = liveStatus?.running ?? enablement.running;
  const activeItems = liveStatus?.active_items ?? 0;
  const eventsSent = liveStatus?.events_sent ?? 0;
  const lastError = liveStatus?.last_error;
  const isAis = enablement.type_id === "ais";

  const startMut = useMutation({
    mutationFn: () => startEnablement(enablement.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enablements });
      toast.success(`Started "${enablement.name}"`);
    },
    onError: (e: Error) => toast.error(`Start failed: ${e.message}`),
  });

  const stopMut = useMutation({
    mutationFn: () => stopEnablement(enablement.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enablements });
      toast.success(`Stopped "${enablement.name}"`);
    },
    onError: (e: Error) => toast.error(`Stop failed: ${e.message}`),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteEnablement(enablement.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enablements });
      toast.success(`Deleted "${enablement.name}"`);
    },
    onError: (e: Error) => toast.error(`Delete failed: ${e.message}`),
  });

  const isBusy = startMut.isPending || stopMut.isPending;

  return (
    <Card className="group relative overflow-hidden">
      {/* Running pulse bar */}
      {running && (
        <div className="absolute inset-x-0 top-0 h-0.5 animate-pulse bg-green-500" />
      )}

      <CardContent className="space-y-3 pt-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{enablement.name}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                {enablement.type_id.toUpperCase()}
              </Badge>
              {isAis && (
                <Badge
                  variant="outline"
                  className="px-1.5 py-0 text-[10px] text-muted-foreground"
                >
                  Coming soon
                </Badge>
              )}
            </div>
          </div>

          {/* Running indicator */}
          <div className="flex shrink-0 items-center gap-1.5">
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full",
                running ? "animate-pulse bg-green-500" : "bg-muted-foreground/40",
              )}
            />
            <span className="text-xs text-muted-foreground">
              {running ? "Running" : "Stopped"}
            </span>
          </div>
        </div>

        {/* Stats */}
        {running && (
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>
              <span className="tabular-nums font-medium text-foreground">
                {activeItems}
              </span>{" "}
              active
            </span>
            <span>
              <span className="tabular-nums font-medium text-foreground">
                {eventsSent}
              </span>{" "}
              sent
            </span>
          </div>
        )}

        {/* Error */}
        {lastError && (
          <div className="flex items-start gap-1.5 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="break-all">{lastError}</span>
          </div>
        )}

        {/* Source count */}
        <p className="text-xs text-muted-foreground">
          {enablement.sources.length} source
          {enablement.sources.length !== 1 ? "s" : ""}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2 border-t border-border pt-3">
          {/* Start / Stop */}
          {running ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => stopMut.mutate()}
              disabled={isBusy}
              className="h-7 gap-1 px-2 text-xs"
            >
              <Square className="h-3 w-3" />
              Stop
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger render={<span />}>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => startMut.mutate()}
                  disabled={isBusy || isAis}
                  className="h-7 gap-1 px-2 text-xs"
                >
                  <Play className="h-3 w-3" />
                  Start
                </Button>
              </TooltipTrigger>
              {isAis && (
                <TooltipContent>AIS support is coming soon</TooltipContent>
              )}
            </Tooltip>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={() => router.push(`/enablements/${enablement.id}`)}
            className="h-7 gap-1 px-2 text-xs"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </Button>

          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                />
              }
            >
              <Trash2 className="h-3.5 w-3.5" />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete enablement?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete &quot;{enablement.name}&quot; and all its
                  sources. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMut.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
