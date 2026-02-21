"use client";

import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, Trash2, FileKey } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCerts, uploadCert, deleteCert } from "@/lib/api";
import { AdminOnly } from "@/components/AdminOnly";
import { queryKeys } from "@/lib/query-keys";
import type { CertInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CertListProps {
  selectedCertId: string | null;
  onSelect: (certId: string | null) => void;
}

export function CertList({ selectedCertId, onSelect }: CertListProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: certs, isLoading } = useQuery({
    queryKey: queryKeys.certs,
    queryFn: getCerts,
  });

  const uploadMut = useMutation({
    mutationFn: uploadCert,
    onSuccess: (cert: CertInfo) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.certs });
      toast.success(`Uploaded ${cert.filename}`);
      onSelect(cert.cert_id);
    },
    onError: (e: Error) => toast.error(`Upload failed: ${e.message}`),
  });

  const deleteMut = useMutation({
    mutationFn: deleteCert,
    onSuccess: (_data, certId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.certs });
      if (selectedCertId === certId) onSelect(null);
      toast.success("Certificate deleted");
    },
    onError: (e: Error) => toast.error(`Delete failed: ${e.message}`),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMut.mutate(file);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Certificates (.p12)</p>
        <AdminOnly>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMut.isPending}
          >
            <Upload className="h-3.5 w-3.5" />
            Upload .p12
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".p12"
            className="hidden"
            onChange={handleFileChange}
          />
        </AdminOnly>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : !certs?.length ? (
        <p className="rounded-md border border-dashed border-border py-4 text-center text-sm text-muted-foreground">
          No certificates uploaded
        </p>
      ) : (
        <div className="divide-y divide-border rounded-md border border-border">
          {/* None option */}
          <button
            type="button"
            onClick={() => onSelect(null)}
            className={cn(
              "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50",
              selectedCertId === null && "bg-primary/5 font-medium",
            )}
          >
            <span className="text-muted-foreground">No certificate</span>
          </button>

          {certs.map((cert) => (
            <div
              key={cert.cert_id}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 transition-colors",
                selectedCertId === cert.cert_id && "bg-primary/5",
              )}
            >
              <button
                type="button"
                className="flex flex-1 items-center gap-2 text-left"
                onClick={() =>
                  onSelect(
                    selectedCertId === cert.cert_id ? null : cert.cert_id,
                  )
                }
              >
                <FileKey className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span
                  className={cn(
                    "truncate text-sm",
                    selectedCertId === cert.cert_id && "font-medium",
                  )}
                >
                  {cert.filename}
                </span>
              </button>
              <AdminOnly>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteMut.mutate(cert.cert_id)}
                  disabled={deleteMut.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AdminOnly>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
