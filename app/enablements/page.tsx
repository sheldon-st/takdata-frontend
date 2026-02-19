"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { EnablementCard } from "@/components/enablements/enablement-card";
import { NewEnablementDialog } from "@/components/enablements/new-enablement-dialog";
import { useWsStatus } from "@/components/ws-context";
import { getEnablements } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export default function EnablementsPage() {
  const router = useRouter();
  const { status: wsStatus } = useWsStatus();

  const { data: enablements, isLoading } = useQuery({
    queryKey: queryKeys.enablements,
    queryFn: getEnablements,
  });

  const liveMap = new Map(
    wsStatus?.enablements.map((e) => [e.id, e]) ?? [],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Enablements</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure and manage your data stream instances.
          </p>
        </div>
        <NewEnablementDialog onCreated={(id) => router.push(`/enablements/${id}`)} />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      ) : !enablements?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            No enablements yet
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create your first data stream to get started.
          </p>
          <div className="mt-4">
            <NewEnablementDialog onCreated={(id) => router.push(`/enablements/${id}`)} />
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {enablements.map((e) => (
            <EnablementCard
              key={e.id}
              enablement={e}
              liveStatus={liveMap.get(e.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
