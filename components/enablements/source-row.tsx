"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { SourceForm } from "@/components/enablements/source-form";
import { putSource, deleteSource } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { SourceResponse, SourceCreate } from "@/lib/types";

interface SourceRowProps {
  source: SourceResponse;
  enablementId: number;
}

export function SourceRow({ source, enablementId }: SourceRowProps) {
  const [editing, setEditing] = useState(false);
  const queryClient = useQueryClient();

  const updateMut = useMutation({
    mutationFn: (data: SourceCreate) => putSource(enablementId, source.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enablement(enablementId) });
      setEditing(false);
      toast.success("Source updated");
    },
    onError: (e: Error) => toast.error(`Update failed: ${e.message}`),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteSource(enablementId, source.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enablement(enablementId) });
      toast.success("Source deleted");
    },
    onError: (e: Error) => toast.error(`Delete failed: ${e.message}`),
  });

  const toggleMut = useMutation({
    mutationFn: (enabled: boolean) =>
      putSource(enablementId, source.id, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enablement(enablementId) });
    },
    onError: (e: Error) => toast.error(`Toggle failed: ${e.message}`),
  });

  return (
    <div className="border-b border-border last:border-0">
      {/* Row summary */}
      <div className="flex items-center gap-3 py-3">
        <Switch
          checked={source.enabled}
          onCheckedChange={(v) => toggleMut.mutate(v)}
          disabled={toggleMut.isPending}
          className="shrink-0"
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{source.name}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
              {source.endpoint}
            </Badge>
            <span className="font-mono truncate max-w-[200px]">{source.base_url}</span>
            <span>{source.sleep_interval}s interval</span>
            {(source.endpoint === "geo" || source.endpoint === "point") &&
              source.lat !== null && (
                <span>
                  {source.lat?.toFixed(4)}, {source.lon?.toFixed(4)} · {source.distance} nm
                </span>
              )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setEditing(!editing)}
          >
            {editing ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <Pencil className="h-3.5 w-3.5" />
            )}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                />
              }
            >
              <Trash2 className="h-3.5 w-3.5" />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete source?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the source &quot;{source.name}&quot;.
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
      </div>

      {/* Inline edit form */}
      {editing && (
        <div className="bg-muted/30 mb-3 rounded-md border border-border p-4">
          <SourceForm
            defaultValues={source}
            onSubmit={(v) => updateMut.mutate(v)}
            onCancel={() => setEditing(false)}
            isPending={updateMut.isPending}
            submitLabel="Update Source"
          />
        </div>
      )}
    </div>
  );
}
