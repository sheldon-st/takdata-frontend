"use client";

import dynamic from "next/dynamic";
import type { UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import type { GeoFilterBbox } from "@/components/enablements/geo-filter-map";
import { cn } from "@/lib/utils";

const GeoFilterMap = dynamic(
  () => import("@/components/enablements/geo-filter-map"),
  { ssr: false, loading: () => <Skeleton className="h-[280px] w-full rounded-md" /> },
);

const STRATEGIES = [
  { id: "round_robin", label: "Round-robin", hint: "Deterministic even coverage" },
  { id: "random", label: "Random", hint: "Uniform sample (no repeats per tick)" },
  { id: "zipf", label: "Zipf", hint: "Hot/cold skew (realistic)" },
] as const;

export interface SyntheticFormShape {
  feature_count: number | null;
  updates_per_second: number | null;
  features_per_update: number | null;
  selection_strategy: "round_robin" | "random" | "zipf" | null;
  cot_stale: number;
}

interface Props {
  register: UseFormRegister<any>;
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
  disabled?: boolean;
  geoFilterEnabled: boolean;
  onGeoFilterToggle: (enabled: boolean) => void;
  geoFilterValue: GeoFilterBbox | null;
  onGeoFilterChange: (bbox: GeoFilterBbox | null) => void;
}

export function SyntheticWorkloadFields({
  register,
  watch,
  setValue,
  disabled = false,
  geoFilterEnabled,
  onGeoFilterToggle,
  geoFilterValue,
  onGeoFilterChange,
}: Props) {
  const N = Number(watch("feature_count")) || 0;
  const U = Number(watch("updates_per_second")) || 0;
  const Kraw = Number(watch("features_per_update")) || 0;
  const K = N > 0 ? Math.min(Kraw, N) : Kraw;
  const strategy = (watch("selection_strategy") as string) || "round_robin";

  const aggregate = U * K;
  const refresh = aggregate > 0 ? N / aggregate : Infinity;

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="syn-N">Features (N)</Label>
          <Input
            id="syn-N"
            type="number"
            min={1}
            disabled={disabled}
            {...register("feature_count")}
          />
          <p className="text-xs text-muted-foreground">Population</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="syn-U">Ticks/sec (U)</Label>
          <Input
            id="syn-U"
            type="number"
            min={0.01}
            step={0.1}
            disabled={disabled}
            {...register("updates_per_second")}
          />
          <p className="text-xs text-muted-foreground">Send-loop cadence</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="syn-K">Features/tick (K)</Label>
          <Input
            id="syn-K"
            type="number"
            min={1}
            disabled={disabled}
            {...register("features_per_update")}
          />
          <p className="text-xs text-muted-foreground">Batch size, capped at N</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Selection Strategy</Label>
        <div className="flex flex-wrap gap-2">
          {STRATEGIES.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={disabled}
              onClick={() =>
                setValue("selection_strategy", s.id, { shouldDirty: true })
              }
              className={cn(
                "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                strategy === s.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-muted/50",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {STRATEGIES.find((s) => s.id === strategy)?.hint}
        </p>
      </div>

      {/* Derived workload readout */}
      <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <span>
            <span className="text-muted-foreground">Aggregate rate:</span>{" "}
            <span className="font-mono font-medium tabular-nums">
              {aggregate.toLocaleString(undefined, { maximumFractionDigits: 1 })} ev/s
            </span>
          </span>
          <span>
            <span className="text-muted-foreground">Refresh interval:</span>{" "}
            <span className="font-mono font-medium tabular-nums">
              {isFinite(refresh)
                ? `${refresh.toLocaleString(undefined, { maximumFractionDigits: 2 })}s`
                : "—"}
            </span>
          </span>
          {K !== Kraw && Kraw > 0 && (
            <span className="text-amber-600">K clamped to N ({K})</span>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="syn-stale">CoT Stale Time (seconds)</Label>
        <Input
          id="syn-stale"
          type="number"
          min={1}
          disabled={disabled}
          {...register("cot_stale")}
        />
        <p className="text-xs text-muted-foreground">
          Should be ≥ refresh interval, else TAK clients drop features between updates.
        </p>
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Spawn Bounding Box</p>
            <p className="text-xs text-muted-foreground">
              Features seeded uniformly inside this box. Defaults to CONUS if unset.
            </p>
          </div>
          <Switch
            checked={geoFilterEnabled}
            onCheckedChange={onGeoFilterToggle}
            disabled={disabled}
          />
        </div>

        {geoFilterEnabled && (
          <GeoFilterMap value={geoFilterValue} onChange={onGeoFilterChange} />
        )}
      </div>
    </>
  );
}
