"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { getEnablementTypes, postEnablement } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { EnablementTypeInfo } from "@/lib/types";
import type { GeoFilterBbox } from "@/components/enablements/geo-filter-map";
import { cn } from "@/lib/utils";

// Lazy-load the OL map component to avoid SSR issues
const GeoFilterMap = dynamic(
  () => import("@/components/enablements/geo-filter-map"),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[280px] w-full rounded-md" />,
  },
);

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  cot_stale: z.coerce.number().int().min(1),
  uid_key: z.string().min(1),
  alt_upper: z.coerce.number().int().min(0),
  alt_lower: z.coerce.number().int().min(0),
  geo_filter_min_lat: z.number().nullable(),
  geo_filter_max_lat: z.number().nullable(),
  geo_filter_min_lon: z.number().nullable(),
  geo_filter_max_lon: z.number().nullable(),
});

type FormValues = z.infer<typeof schema>;

interface NewEnablementDialogProps {
  onCreated?: (id: number) => void;
}

export function NewEnablementDialog({ onCreated }: NewEnablementDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<EnablementTypeInfo | null>(null);
  const [geoFilterEnabled, setGeoFilterEnabled] = useState(false);
  const queryClient = useQueryClient();

  const { data: types, isLoading } = useQuery({
    queryKey: queryKeys.enablementTypes,
    queryFn: getEnablementTypes,
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      cot_stale: 300,
      uid_key: "ICAO",
      alt_upper: 0,
      alt_lower: 0,
      geo_filter_min_lat: null,
      geo_filter_max_lat: null,
      geo_filter_min_lon: null,
      geo_filter_max_lon: null,
    },
  });

  const createMut = useMutation({
    mutationFn: (values: FormValues) =>
      postEnablement({ type_id: selectedType!.type_id, ...values }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enablements });
      toast.success(`Enablement "${data.name}" created`);
      setOpen(false);
      setSelectedType(null);
      setGeoFilterEnabled(false);
      reset();
      onCreated?.(data.id);
    },
    onError: (e: Error) => toast.error(`Create failed: ${e.message}`),
  });

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) {
      setSelectedType(null);
      setGeoFilterEnabled(false);
      reset();
    }
  };

  // Reset uid_key default to match the selected enablement type
  useEffect(() => {
    if (selectedType?.type_id === "ais") {
      setValue("uid_key", "MMSI");
    } else if (selectedType?.type_id === "adsb") {
      setValue("uid_key", "ICAO");
    }
  }, [selectedType, setValue]);

  const uidKey = watch("uid_key") ?? "ICAO";

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

  const showMap = selectedType?.type_id === "adsb" || selectedType?.type_id === "ais";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button className="gap-1.5" />}>
        <Plus className="h-4 w-4" />
        New Enablement
      </DialogTrigger>

      {/* Widen the dialog when showing map */}
      <DialogContent className={cn("transition-all", showMap && selectedType ? "max-w-2xl" : "max-w-md")}>
        <DialogHeader>
          <DialogTitle>
            {selectedType ? (
              <button
                className="flex items-center gap-1 text-sm font-normal text-muted-foreground hover:text-foreground"
                onClick={() => setSelectedType(null)}
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            ) : null}
            <span className="block text-lg font-semibold">
              {selectedType ? `New ${selectedType.display_name}` : "New Enablement"}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: pick type */}
        {!selectedType && (
          <div className="space-y-2 py-2">
            {isLoading ? (
              <>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </>
            ) : (
              types?.map((t) => (
                <button
                  key={t.type_id}
                  type="button"
                  onClick={() => setSelectedType(t)}
                  className={cn(
                    "flex w-full flex-col items-start rounded-md border border-border px-4 py-3 text-left transition-colors hover:bg-muted/50",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{t.display_name}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t.description}
                  </p>
                </button>
              ))
            )}
          </div>
        )}

        {/* Step 2: configure */}
        {selectedType && (
          <form
            onSubmit={handleSubmit((v: FormValues) => createMut.mutate(v))}
            className="space-y-4 py-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="en-name">Name</Label>
              <Input
                id="en-name"
                placeholder={`My ${selectedType.display_name}`}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            {selectedType.type_id === "adsb" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="en-cot-stale">CoT Stale Time (seconds)</Label>
                  <Input
                    id="en-cot-stale"
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
                        onClick={() => setValue("uid_key", k)}
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
                    ICAO = hex address (most stable), REG = registration, FLIGHT = callsign
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="en-alt-upper">Max Altitude (ft)</Label>
                    <Input
                      id="en-alt-upper"
                      type="number"
                      min={0}
                      {...register("alt_upper")}
                    />
                    <p className="text-xs text-muted-foreground">0 = no filter</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="en-alt-lower">Min Altitude (ft)</Label>
                    <Input
                      id="en-alt-lower"
                      type="number"
                      min={0}
                      {...register("alt_lower")}
                    />
                    <p className="text-xs text-muted-foreground">0 = no filter</p>
                  </div>
                </div>

                <Separator />

                {/* Geographic filter section */}
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

            {selectedType.type_id === "ais" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="en-cot-stale">CoT Stale Time (seconds)</Label>
                  <Input
                    id="en-cot-stale"
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
                        onClick={() => setValue("uid_key", k)}
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

                {/* Geographic filter section */}
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

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending ? "Creating…" : "Create"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
