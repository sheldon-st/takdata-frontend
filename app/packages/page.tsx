"use client";

import { useCallback, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  deletePackage,
  getPackageDownloadUrl,
  getPackages,
  uploadPackage,
} from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { AdminOnly } from "@/components/AdminOnly";
import { cn } from "@/lib/utils";

const MAX_SIZE = 100 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PackagesPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const { data: packages, isLoading } = useQuery({
    queryKey: queryKeys.packages,
    queryFn: getPackages,
  });

  const uploadMut = useMutation({
    mutationFn: uploadPackage,
    onSuccess: (pkg) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.packages });
      toast.success(`Uploaded ${pkg.filename}`);
      setUploadError(null);
    },
    onError: (e: Error & { status?: number }) => {
      const msg =
        e.status === 413
          ? "File exceeds the 100 MB limit."
          : e.status === 400
            ? "Invalid file. Only .zip files are accepted."
            : `Upload failed: ${e.message}`;
      setUploadError(msg);
    },
  });

  const deleteMut = useMutation({
    mutationFn: deletePackage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.packages });
      toast.success("Package deleted");
    },
    onError: (e: Error) => toast.error(`Delete failed: ${e.message}`),
  });

  const handleFile = useCallback(
    (file: File) => {
      setUploadError(null);
      if (!file.name.toLowerCase().endsWith(".zip")) {
        setUploadError("Only .zip files are accepted.");
        return;
      }
      if (file.size > MAX_SIZE) {
        setUploadError("File exceeds the 100 MB limit.");
        return;
      }
      uploadMut.mutate(file);
    },
    [uploadMut],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
      e.target.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDeleteConfirm = () => {
    if (pendingDeleteId) {
      deleteMut.mutate(pendingDeleteId);
      setPendingDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Packages</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload and share data packages (.zip) with other clients.
        </p>
      </div>

      {/* Upload zone */}
      <AdminOnly>
        <div className="space-y-2">
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload a .zip file"
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/30",
              uploadMut.isPending && "pointer-events-none opacity-60",
            )}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ")
                fileInputRef.current?.click();
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={() => setIsDragging(false)}
          >
            <UploadCloud
              className={cn(
                "h-8 w-8",
                isDragging ? "text-primary" : "text-muted-foreground",
              )}
            />
            {uploadMut.isPending ? (
              <p className="text-sm text-muted-foreground">Uploading…</p>
            ) : (
              <>
                <p className="text-sm font-medium">
                  Drag & drop a .zip file here, or click to select
                </p>
                <p className="text-xs text-muted-foreground">Max size: 100 MB</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            className="hidden"
            onChange={handleFileChange}
          />
          {uploadError && (
            <p className="text-sm text-destructive">{uploadError}</p>
          )}
        </div>
      </AdminOnly>

      {/* Package list */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium">Uploaded packages</h2>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !packages?.length ? (
          <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            No packages uploaded yet
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filename</TableHead>
                  <TableHead className="w-28">Size</TableHead>
                  <TableHead className="w-20 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages.map((pkg) => (
                  <TableRow key={pkg.package_id}>
                    <TableCell className="font-mono text-sm">
                      {pkg.filename}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatBytes(pkg.size)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={getPackageDownloadUrl(pkg.package_id)}
                          download={pkg.filename}
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "icon-sm" }),
                            "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                        <AdminOnly>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => setPendingDeleteId(pkg.package_id)}
                            disabled={deleteMut.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AdminOnly>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete package?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the package. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
