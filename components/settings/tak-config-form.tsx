"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, PlugZap, Plug } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { CertList } from "@/components/settings/cert-list";
import { getTakConfig, putTakConfig, postTakConnect, postTakDisconnect } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useWsStatus } from "@/components/ws-context";

const schema = z.object({
  cot_url: z.string().min(1, "Required"),
  cert_path: z.string().nullable(),
  cert_password: z.string().nullable(),
  cot_host_id: z.string().min(1, "Required"),
  dont_check_hostname: z.boolean(),
  dont_verify: z.boolean(),
  max_out_queue: z.coerce.number().int().min(1),
  max_in_queue: z.coerce.number().int().min(1),
});

type FormValues = z.infer<typeof schema>;

export function TakConfigForm() {
  const queryClient = useQueryClient();
  const { status: wsStatus } = useWsStatus();
  const takConnected = wsStatus?.tak_connected ?? false;

  const { data: config, isLoading } = useQuery({
    queryKey: queryKeys.takConfig,
    queryFn: getTakConfig,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      cot_url: "tls://localhost:8089",
      cert_path: null,
      cert_password: null,
      cot_host_id: "tak-manager",
      dont_check_hostname: true,
      dont_verify: true,
      max_out_queue: 1000,
      max_in_queue: 1000,
    },
  });

  useEffect(() => {
    if (config) {
      reset({
        cot_url: config.cot_url,
        cert_path: config.cert_path,
        cert_password: null,
        cot_host_id: config.cot_host_id,
        dont_check_hostname: config.dont_check_hostname,
        dont_verify: config.dont_verify,
        max_out_queue: config.max_out_queue,
        max_in_queue: config.max_in_queue,
      });
    }
  }, [config, reset]);

  const saveMut = useMutation({
    mutationFn: (values: FormValues) => putTakConfig(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.takConfig });
      toast.success("TAK configuration saved");
    },
    onError: (e: Error) => toast.error(`Save failed: ${e.message}`),
  });

  const connectMut = useMutation({
    mutationFn: postTakConnect,
    onSuccess: () => toast.success("Connect request sent"),
    onError: (e: Error) => toast.error(`Connect failed: ${e.message}`),
  });

  const disconnectMut = useMutation({
    mutationFn: postTakDisconnect,
    onSuccess: () => toast.success("Disconnected from TAK server"),
    onError: (e: Error) => toast.error(`Disconnect failed: ${e.message}`),
  });

  const certPath = watch("cert_path");

  const handleCertSelect = (certId: string | null) => {
    setValue("cert_path", certId ? `data/certs/${certId}` : null, {
      shouldDirty: true,
    });
  };

  // Derive selected cert_id from the stored cert_path (e.g. "data/certs/<cert_id>")
  const selectedCertId = certPath
    ? certPath.replace(/^data\/certs\//, "")
    : null;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit((v) => saveMut.mutate(v))} className="space-y-8">
      {/* Connection */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Connection
        </h2>

        <div className="space-y-1.5">
          <Label htmlFor="cot_url">CoT URL</Label>
          <Input
            id="cot_url"
            placeholder="tls://10.0.0.5:8089"
            {...register("cot_url")}
          />
          {errors.cot_url && (
            <p className="text-xs text-destructive">{errors.cot_url.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cot_host_id">Host ID</Label>
          <Input
            id="cot_host_id"
            placeholder="tak-manager"
            {...register("cot_host_id")}
          />
          <p className="text-xs text-muted-foreground">
            Identifier embedded in every CoT event
          </p>
          {errors.cot_host_id && (
            <p className="text-xs text-destructive">
              {errors.cot_host_id.message}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
          <div>
            <p className="text-sm font-medium">Skip hostname verification</p>
            <p className="text-xs text-muted-foreground">
              Recommended for internal networks
            </p>
          </div>
          <Switch
            checked={watch("dont_check_hostname")}
            onCheckedChange={(v) =>
              setValue("dont_check_hostname", v, { shouldDirty: true })
            }
          />
        </div>

        <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
          <div>
            <p className="text-sm font-medium">Skip TLS verification</p>
            <p className="text-xs text-muted-foreground">
              Recommended for internal networks
            </p>
          </div>
          <Switch
            checked={watch("dont_verify")}
            onCheckedChange={(v) =>
              setValue("dont_verify", v, { shouldDirty: true })
            }
          />
        </div>
      </section>

      <Separator />

      {/* Certificate */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Client Certificate
        </h2>

        <CertList selectedCertId={selectedCertId} onSelect={handleCertSelect} />

        {selectedCertId && (
          <div className="space-y-1.5">
            <Label htmlFor="cert_password">Certificate Password</Label>
            <Input
              id="cert_password"
              type="password"
              placeholder="Password for .p12 file"
              {...register("cert_password")}
            />
            <p className="text-xs text-muted-foreground">
              Write-only — leave blank to keep existing password
            </p>
          </div>
        )}
      </section>

      <Separator />

      {/* Advanced */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Advanced
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="max_out_queue">Max Outbound Queue</Label>
            <Input
              id="max_out_queue"
              type="number"
              min={1}
              {...register("max_out_queue")}
            />
            {errors.max_out_queue && (
              <p className="text-xs text-destructive">
                {errors.max_out_queue.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="max_in_queue">Max Inbound Queue</Label>
            <Input
              id="max_in_queue"
              type="number"
              min={1}
              {...register("max_in_queue")}
            />
            {errors.max_in_queue && (
              <p className="text-xs text-destructive">
                {errors.max_in_queue.message}
              </p>
            )}
          </div>
        </div>
      </section>

      <Separator />

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          disabled={saveMut.isPending || !isDirty}
          className="gap-1.5"
        >
          <Save className="h-4 w-4" />
          {saveMut.isPending ? "Saving…" : "Save"}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => connectMut.mutate()}
          disabled={connectMut.isPending || disconnectMut.isPending}
          className="gap-1.5"
        >
          <PlugZap className="h-4 w-4" />
          {takConnected ? "Reconnect" : "Connect"}
        </Button>

        {takConnected && (
          <Button
            type="button"
            variant="outline"
            onClick={() => disconnectMut.mutate()}
            disabled={connectMut.isPending || disconnectMut.isPending}
            className="gap-1.5 text-destructive hover:text-destructive"
          >
            <Plug className="h-4 w-4" />
            Disconnect
          </Button>
        )}
      </div>
    </form>
  );
}
