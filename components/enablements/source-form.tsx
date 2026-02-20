"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { SourceResponse, SourceCreate, KnownSource } from "@/lib/types";

const schema = z
  .object({
    name: z.string().min(1, "Required"),
    base_url: z.string().url("Must be a valid URL"),
    endpoint: z.enum(["geo", "point", "mil"]),
    sleep_interval: z.coerce.number().min(0.1),
    lat: z.coerce.number().nullable(),
    lon: z.coerce.number().nullable(),
    distance: z.coerce.number().nullable(),
    enabled: z.boolean(),
  })
  .refine(
    (v) => {
      if (v.endpoint === "geo" || v.endpoint === "point") {
        return v.lat !== null && v.lon !== null;
      }
      return true;
    },
    { message: "Lat/lon are required for geo/point endpoints", path: ["lat"] },
  );

export type SourceFormValues = z.infer<typeof schema>;

const ENDPOINT_LABELS: Record<string, Record<"geo" | "point" | "mil", string>> = {
  ais: { geo: "Area", point: "Radius", mil: "Global" },
};

interface SourceFormProps {
  defaultValues?: Partial<SourceResponse | KnownSource>;
  onSubmit: (values: SourceCreate) => void;
  onCancel: () => void;
  isPending?: boolean;
  submitLabel?: string;
  typeId?: string;
}

export function SourceForm({
  defaultValues,
  onSubmit,
  onCancel,
  isPending,
  submitLabel = "Save",
  typeId,
}: SourceFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SourceFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      base_url: "",
      endpoint: "geo",
      sleep_interval: 5,
      lat: null,
      lon: null,
      distance: 25,
      enabled: true,
    },
  });

  useEffect(() => {
    if (defaultValues) {
      reset({
        name: defaultValues.name ?? "",
        base_url: defaultValues.base_url ?? "",
        endpoint: (defaultValues.endpoint as "geo" | "point" | "mil") ?? "geo",
        sleep_interval: defaultValues.sleep_interval ?? 5,
        lat: defaultValues.lat ?? null,
        lon: defaultValues.lon ?? null,
        distance: defaultValues.distance ?? 25,
        enabled: "enabled" in defaultValues ? (defaultValues.enabled ?? true) : true,
      });
    }
  }, [defaultValues, reset]);

  const endpoint = watch("endpoint");
  const needsGeo = endpoint === "geo" || endpoint === "point";
  const enabled = watch("enabled");
  const endpointLabels = typeId && ENDPOINT_LABELS[typeId] ? ENDPOINT_LABELS[typeId] : { geo: "geo", point: "point", mil: "mil" };

  const handleFormSubmit = (values: SourceFormValues) => {
    onSubmit({
      name: values.name,
      base_url: values.base_url,
      endpoint: values.endpoint,
      sleep_interval: values.sleep_interval,
      lat: needsGeo ? values.lat : null,
      lon: needsGeo ? values.lon : null,
      distance: needsGeo ? values.distance : null,
      enabled: values.enabled,
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="src-name">Name</Label>
          <Input id="src-name" placeholder="adsb.fi-military" {...register("name")} />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="src-interval">Poll Interval (s)</Label>
          <Input
            id="src-interval"
            type="number"
            step="0.1"
            min="0.1"
            {...register("sleep_interval")}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="src-url">Base URL</Label>
        <Input
          id="src-url"
          placeholder="https://opendata.adsb.fi/api/v2"
          {...register("base_url")}
        />
        {errors.base_url && (
          <p className="text-xs text-destructive">{errors.base_url.message}</p>
        )}
      </div>

      {/* Endpoint type selector */}
      <div className="space-y-1.5">
        <Label>Endpoint Type</Label>
        <div className="flex gap-2">
          {(["geo", "point", "mil"] as const).map((ep) => (
            <button
              key={ep}
              type="button"
              onClick={() => setValue("endpoint", ep)}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                endpoint === ep
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              {endpointLabels[ep]}
            </button>
          ))}
        </div>
        {typeId === "ais" && (
          <p className="text-xs text-muted-foreground">
            Area / Radius = geographic filter (requires lat, lon, distance) · Global = full feed with no location filter
          </p>
        )}
      </div>

      {/* Geo fields */}
      {needsGeo && (
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="src-lat">Latitude</Label>
            <Input
              id="src-lat"
              type="number"
              step="any"
              placeholder="40.7128"
              {...register("lat")}
            />
            {errors.lat && (
              <p className="text-xs text-destructive">{errors.lat.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="src-lon">Longitude</Label>
            <Input
              id="src-lon"
              type="number"
              step="any"
              placeholder="-74.0060"
              {...register("lon")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="src-dist">Distance (nm)</Label>
            <Input
              id="src-dist"
              type="number"
              step="1"
              min="1"
              placeholder="25"
              {...register("distance")}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
        <Label htmlFor="src-enabled">Enabled</Label>
        <Switch
          id="src-enabled"
          checked={enabled}
          onCheckedChange={(v) => setValue("enabled", v)}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
