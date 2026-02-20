"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Play, Square, Plus, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SourceRow } from "@/components/enablements/source-row";
import { SourceForm } from "@/components/enablements/source-form";
import { useWsStatus } from "@/components/ws-context";
import {
  getEnablement,
  putEnablement,
  startEnablement,
  stopEnablement,
  postSource,
  getKnownSources,
} from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { KnownSource, SourceCreate } from "@/lib/types";
import type { GeoFilterBbox } from "@/components/enablements/geo-filter-map";
import { cn } from "@/lib/utils";

const GeoFilterMap = dynamic(
  () => import("@/components/enablements/geo-filter-map"),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[280px] w-full rounded-md" />,
  },
);

const generalSchema = z.object({
  name: z.string().min(1, "Required"),
  cot_stale: z.coerce.number().int().min(1),
  uid_key: z.string().min(1),
  alt_upper: z.coerce.number().int().min(0),
  alt_lower: z.coerce.number().int().min(0),
  geo_filter_min_lat: z.number().nullable(),
  geo_filter_max_lat: z.number().nullable(),
  geo_filter_min_lon: z.number().nullable(),
  geo_filter_max_lon: z.number().nullable(),
});

type GeneralFormValues = z.infer<typeof generalSchema>;

export default function EnablementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const enablementId = Number(id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { status: wsStatus } = useWsStatus();

  const [addSourceOpen, setAddSourceOpen] = useState(false);
  const [addSourceMode, setAddSourceMode] = useState<"pick" | "custom" | "template">(
    "pick",
  );
  const [selectedTemplate, setSelectedTemplate] = useState<KnownSource | null>(null);
  const [geoFilterEnabled, setGeoFilterEnabled] = useState(false);

  const { data: enablement, isLoading } = useQuery({
    queryKey: queryKeys.enablement(enablementId),
    queryFn: () => getEnablement(enablementId),
    enabled: !!enablementId,
  });

  const { data: knownSources } = useQuery({
    queryKey: queryKeys.knownSources(enablementId),
    queryFn: () => getKnownSources(enablementId),
    enabled: addSourceOpen,
  });

  const liveStatus = wsStatus?.enablements.find((e) => e.id === enablementId);
  const running = liveStatus?.running ?? enablement?.running ?? false;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<GeneralFormValues>({
    resolver: zodResolver(generalSchema),
    values: enablement
      ? {
          name: enablement.name,
          cot_stale: enablement.cot_stale,
          uid_key: enablement.uid_key,
          alt_upper: enablement.alt_upper,
          alt_lower: enablement.alt_lower,
          geo_filter_min_lat: enablement.geo_filter_min_lat,
          geo_filter_max_lat: enablement.geo_filter_max_lat,
          geo_filter_min_lon: enablement.geo_filter_min_lon,
          geo_filter_max_lon: enablement.geo_filter_max_lon,
        }
      : undefined,
  });

  // Sync geoFilterEnabled toggle with loaded enablement data
  useEffect(() => {
    if (enablement) {
      const hasFilter = enablement.geo_filter_min_lat !== null;
      setGeoFilterEnabled(hasFilter);
    }
  }, [enablement]);

  const saveMut = useMutation({
    mutationFn: (v: GeneralFormValues) => putEnablement(enablementId, v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enablement(enablementId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.enablements });
      toast.success("Enablement saved");
      reset(undefined, { keepValues: true });
    },
    onError: (e: Error) => toast.error(`Save failed: ${e.message}`),
  });

  const startMut = useMutation({
    mutationFn: () => startEnablement(enablementId),
    onSuccess: () => toast.success("Started"),
    onError: (e: Error) => toast.error(`Start failed: ${e.message}`),
  });

  const stopMut = useMutation({
    mutationFn: () => stopEnablement(enablementId),
    onSuccess: () => toast.success("Stopped"),
    onError: (e: Error) => toast.error(`Stop failed: ${e.message}`),
  });

  const addSourceMut = useMutation({
    mutationFn: (data: SourceCreate) => postSource(enablementId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enablement(enablementId) });
      setAddSourceOpen(false);
      setAddSourceMode("pick");
      setSelectedTemplate(null);
      toast.success("Source added");
    },
    onError: (e: Error) => toast.error(`Add source failed: ${e.message}`),
  });

  const uidKey = watch("uid_key") ?? "ICAO";

  // Derive current bbox from form values for the map component
  const geoFilterValue: GeoFilterBbox | null = (() => {
    const minLat = watch("geo_filter_min_lat");
    const maxLat = watch("geo_filter_max_lat");
    const minLon = watch("geo_filter_min_lon");
    const maxLon = watch("geo_filter_max_lon");
    if (
      minLat !== null && minLat !== undefined &&
      maxLat !== null && maxLat !== undefined &&
      minLon !== null && minLon !== undefined &&
      maxLon !== null && maxLon !== undefined
    ) {
      return { min_lat: minLat, max_lat: maxLat, min_lon: minLon, max_lon: maxLon };
    }
    return null;
  })();

  const handleGeoFilterChange = (bbox: GeoFilterBbox | null) => {
    setValue("geo_filter_min_lat", bbox?.min_lat ?? null, { shouldDirty: true });
    setValue("geo_filter_max_lat", bbox?.max_lat ?? null, { shouldDirty: true });
    setValue("geo_filter_min_lon", bbox?.min_lon ?? null, { shouldDirty: true });
    setValue("geo_filter_max_lon", bbox?.max_lon ?? null, { shouldDirty: true });
  };

  const handleGeoFilterToggle = (enabled: boolean) => {
    setGeoFilterEnabled(enabled);
    if (!enabled) handleGeoFilterChange(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!enablement) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Enablement not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/enablements")}
          className="gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              {enablement.name}
            </h1>
            <Badge variant="secondary">{enablement.type_id.toUpperCase()}</Badge>
          </div>
        </div>

        {/* Start / Stop */}
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={cn(
              "flex items-center gap-1.5 text-xs",
              running ? "text-green-600" : "text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                running ? "animate-pulse bg-green-500" : "bg-muted-foreground/40",
              )}
            />
            {running ? "Running" : "Stopped"}
          </span>

          {running ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => stopMut.mutate()}
              disabled={stopMut.isPending}
              className="gap-1"
            >
              <Square className="h-3.5 w-3.5" />
              Stop
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => startMut.mutate()}
              disabled={startMut.isPending}
              className="gap-1"
            >
              <Play className="h-3.5 w-3.5" />
              Start
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="sources">
            Sources
            <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-[10px]">
              {enablement.sources.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="status">Live Status</TabsTrigger>
        </TabsList>

        {/* ── General tab ─────────────────────────────────────────────── */}
        <TabsContent value="general" className="mt-6">
          <form
            onSubmit={handleSubmit((v) => saveMut.mutate(v))}
            className="max-w-xl space-y-6"
          >
            <div className="space-y-1.5">
              <Label htmlFor="d-name">Name</Label>
              <Input id="d-name" {...register("name")} />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            {enablement.type_id === "adsb" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="d-stale">CoT Stale Time (seconds)</Label>
                  <Input
                    id="d-stale"
                    type="number"
                    min={1}
                    {...register("cot_stale")}
                  />
                  <p className="text-xs text-muted-foreground">
                    How long a track persists on a TAK client after the last update
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label>Track ID Key</Label>
                  <div className="flex gap-2">
                    {(["ICAO", "REG", "FLIGHT"] as const).map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setValue("uid_key", k, { shouldDirty: true })}
                        className={cn(
                          "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                          uidKey === k
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:bg-muted/50",
                        )}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ICAO = hex address (most stable), REG = registration, FLIGHT =
                    callsign
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="d-alt-upper">Max Altitude (ft)</Label>
                    <Input
                      id="d-alt-upper"
                      type="number"
                      min={0}
                      {...register("alt_upper")}
                    />
                    <p className="text-xs text-muted-foreground">0 = no filter</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="d-alt-lower">Min Altitude (ft)</Label>
                    <Input
                      id="d-alt-lower"
                      type="number"
                      min={0}
                      {...register("alt_lower")}
                    />
                    <p className="text-xs text-muted-foreground">0 = no filter</p>
                  </div>
                </div>

                <Separator />

                {/* Geographic filter */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Geographic Filter</p>
                      <p className="text-xs text-muted-foreground">
                        Only process aircraft inside a bounding box
                      </p>
                    </div>
                    <Switch
                      checked={geoFilterEnabled}
                      onCheckedChange={handleGeoFilterToggle}
                    />
                  </div>

                  {geoFilterEnabled && (
                    <GeoFilterMap
                      value={geoFilterValue}
                      onChange={handleGeoFilterChange}
                    />
                  )}
                </div>
              </>
            )}

            {enablement.type_id === "ais" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="d-stale">CoT Stale Time (seconds)</Label>
                  <Input
                    id="d-stale"
                    type="number"
                    min={1}
                    {...register("cot_stale")}
                  />
                  <p className="text-xs text-muted-foreground">
                    How long a vessel track persists on a TAK client after the last update
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label>Vessel ID Key</Label>
                  <div className="flex gap-2">
                    {(["MMSI", "CALLSIGN", "NAME"] as const).map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setValue("uid_key", k, { shouldDirty: true })}
                        className={cn(
                          "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                          uidKey === k
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:bg-muted/50",
                        )}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    MMSI = 9-digit identifier (most stable), CALLSIGN = radio callsign, NAME = vessel name
                  </p>
                </div>

                <Separator />

                {/* Geographic filter */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Geographic Filter</p>
                      <p className="text-xs text-muted-foreground">
                        Only process vessels inside a bounding box
                      </p>
                    </div>
                    <Switch
                      checked={geoFilterEnabled}
                      onCheckedChange={handleGeoFilterToggle}
                    />
                  </div>

                  {geoFilterEnabled && (
                    <GeoFilterMap
                      value={geoFilterValue}
                      onChange={handleGeoFilterChange}
                    />
                  )}
                </div>
              </>
            )}

            <Button
              type="submit"
              disabled={saveMut.isPending || !isDirty}
              className="gap-1.5"
            >
              {saveMut.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </form>
        </TabsContent>

        {/* ── Sources tab ──────────────────────────────────────────────── */}
        <TabsContent value="sources" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {enablement.sources.length === 0
                  ? "No sources configured."
                  : `${enablement.sources.length} source${enablement.sources.length !== 1 ? "s" : ""}`}
              </p>

              <Dialog
                open={addSourceOpen}
                onOpenChange={(v) => {
                  setAddSourceOpen(v);
                  if (!v) {
                    setAddSourceMode("pick");
                    setSelectedTemplate(null);
                  }
                }}
              >
                <DialogTrigger render={<Button size="sm" className="gap-1.5" />}>
                  <Plus className="h-3.5 w-3.5" />
                  Add Source
                </DialogTrigger>

                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>
                      {addSourceMode === "pick"
                        ? "Add Source"
                        : addSourceMode === "template"
                          ? "Add from Template"
                          : "Custom Source"}
                    </DialogTitle>
                  </DialogHeader>

                  {/* Pick mode */}
                  {addSourceMode === "pick" && (
                    <div className="space-y-3 py-2">
                      <button
                        type="button"
                        onClick={() => setAddSourceMode("template")}
                        className="flex w-full flex-col items-start rounded-md border border-border px-4 py-3 text-left transition-colors hover:bg-muted/50"
                      >
                        <span className="font-medium">From template</span>
                        <span className="text-xs text-muted-foreground">
                          Pick a pre-configured source for this enablement type
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddSourceMode("custom")}
                        className="flex w-full flex-col items-start rounded-md border border-border px-4 py-3 text-left transition-colors hover:bg-muted/50"
                      >
                        <span className="font-medium">Custom source</span>
                        <span className="text-xs text-muted-foreground">
                          Configure a source manually
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Template picker */}
                  {addSourceMode === "template" && !selectedTemplate && (
                    <div className="space-y-2 py-2">
                      <button
                        className="mb-1 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setAddSourceMode("pick")}
                      >
                        ← Back
                      </button>
                      {!knownSources?.length ? (
                        <p className="py-4 text-center text-sm text-muted-foreground">
                          No templates available for this enablement type.
                        </p>
                      ) : (
                        knownSources.map((ks, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setSelectedTemplate(ks)}
                            className="flex w-full flex-col items-start rounded-md border border-border px-4 py-3 text-left transition-colors hover:bg-muted/50"
                          >
                            <span className="font-medium">{ks.name}</span>
                            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge
                                variant="secondary"
                                className="px-1.5 py-0 text-[10px]"
                              >
                                {ks.endpoint}
                              </Badge>
                              <span className="font-mono truncate max-w-[260px]">
                                {ks.base_url}
                              </span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  {/* Template pre-fill form */}
                  {addSourceMode === "template" && selectedTemplate && (
                    <div className="py-2">
                      <button
                        className="mb-3 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setSelectedTemplate(null)}
                      >
                        ← Back to templates
                      </button>
                      <SourceForm
                        defaultValues={selectedTemplate}
                        onSubmit={(v) => addSourceMut.mutate(v)}
                        onCancel={() => {
                          setAddSourceOpen(false);
                          setAddSourceMode("pick");
                          setSelectedTemplate(null);
                        }}
                        isPending={addSourceMut.isPending}
                        submitLabel="Add Source"
                        typeId={enablement.type_id}
                      />
                    </div>
                  )}

                  {/* Custom form */}
                  {addSourceMode === "custom" && (
                    <div className="py-2">
                      <button
                        className="mb-3 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setAddSourceMode("pick")}
                      >
                        ← Back
                      </button>
                      <SourceForm
                        onSubmit={(v) => addSourceMut.mutate(v)}
                        onCancel={() => {
                          setAddSourceOpen(false);
                          setAddSourceMode("pick");
                        }}
                        isPending={addSourceMut.isPending}
                        submitLabel="Add Source"
                        typeId={enablement.type_id}
                      />
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>

            {enablement.sources.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  No sources yet. Add one to start pulling data.
                </p>
              </div>
            ) : (
              <div className="rounded-md border border-border px-4">
                {enablement.sources.map((s) => (
                  <SourceRow key={s.id} source={s} enablementId={enablementId} />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Live Status tab ──────────────────────────────────────────── */}
        <TabsContent value="status" className="mt-6">
          {!liveStatus ? (
            <div className="space-y-2">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="mt-1 flex items-center gap-1.5 font-semibold">
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          liveStatus.running
                            ? "animate-pulse bg-green-500"
                            : "bg-muted-foreground/40",
                        )}
                      />
                      {liveStatus.running ? "Running" : "Stopped"}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">
                      {enablement.type_id === "ais" ? "Active Vessels" : "Active Aircraft"}
                    </p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums">
                      {liveStatus.active_items}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Events Sent</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums">
                      {liveStatus.events_sent.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Last Poll</p>
                    <p className="mt-1 text-sm font-medium">
                      {liveStatus.last_poll_time
                        ? new Date(liveStatus.last_poll_time).toLocaleTimeString()
                        : "—"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Error */}
              {liveStatus.last_error && (
                <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{liveStatus.last_error}</span>
                </div>
              )}

              {/* Per-source stats */}
              {Object.keys(liveStatus.source_stats).length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">
                      Per-Source Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="divide-y divide-border">
                      {Object.entries(liveStatus.source_stats).map(([name, stat]) => (
                        <div
                          key={name}
                          className="flex items-center gap-4 py-2.5 text-sm"
                        >
                          <p className="min-w-0 flex-1 truncate font-medium">{name}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {stat.last_poll
                              ? new Date(stat.last_poll).toLocaleTimeString()
                              : "—"}
                          </div>
                          {stat.aircraft_count !== undefined && (
                            <span className="tabular-nums text-xs">
                              {stat.aircraft_count} aircraft
                            </span>
                          )}
                          {stat.vessel_count !== undefined && (
                            <span className="tabular-nums text-xs">
                              {stat.vessel_count} vessels
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
