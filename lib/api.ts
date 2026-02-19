import type {
  TakConfigResponse,
  TakConfigUpdate,
  TakStatusResponse,
  CertInfo,
  EnablementTypeInfo,
  EnablementResponse,
  EnablementCreate,
  EnablementUpdate,
  SourceResponse,
  SourceCreate,
  SourceUpdate,
  KnownSource,
} from "./types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    const err = new Error(
      typeof body.detail === "string"
        ? body.detail
        : JSON.stringify(body.detail),
    ) as Error & { status: number; body: unknown };
    err.status = res.status;
    err.body = body;
    throw err;
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;

  return res.json() as Promise<T>;
}

// ── TAK Config ──────────────────────────────────────────────────────────────

export const getTakConfig = () =>
  request<TakConfigResponse>("/api/v1/tak/config");

export const putTakConfig = (data: TakConfigUpdate) =>
  request<TakConfigResponse>("/api/v1/tak/config", {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const postTakConnect = () =>
  request<void>("/api/v1/tak/connect", { method: "POST" });

export const postTakDisconnect = () =>
  request<void>("/api/v1/tak/disconnect", { method: "POST" });

export const getTakStatus = () =>
  request<TakStatusResponse>("/api/v1/tak/status");

// ── Certificates ─────────────────────────────────────────────────────────────

export const getCerts = () => request<CertInfo[]>("/api/v1/tak/certs");

export const uploadCert = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return fetch(`${BASE_URL}/api/v1/tak/certs`, {
    method: "POST",
    body: form,
  }).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({ detail: res.statusText }));
      const err = new Error(
        typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail),
      ) as Error & { status: number; body: unknown };
      err.status = res.status;
      err.body = body;
      throw err;
    }
    return res.json() as Promise<CertInfo>;
  });
};

export const deleteCert = (certId: string) =>
  request<void>(`/api/v1/tak/certs/${certId}`, { method: "DELETE" });

// ── Enablement Types ──────────────────────────────────────────────────────────

export const getEnablementTypes = () =>
  request<EnablementTypeInfo[]>("/api/v1/enablement-types");

// ── Enablements ──────────────────────────────────────────────────────────────

export const getEnablements = () =>
  request<EnablementResponse[]>("/api/v1/enablements");

export const getEnablement = (id: number) =>
  request<EnablementResponse>(`/api/v1/enablements/${id}`);

export const postEnablement = (data: EnablementCreate) =>
  request<EnablementResponse>("/api/v1/enablements", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const putEnablement = (id: number, data: EnablementUpdate) =>
  request<EnablementResponse>(`/api/v1/enablements/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteEnablement = (id: number) =>
  request<void>(`/api/v1/enablements/${id}`, { method: "DELETE" });

export const startEnablement = (id: number) =>
  request<void>(`/api/v1/enablements/${id}/start`, { method: "POST" });

export const stopEnablement = (id: number) =>
  request<void>(`/api/v1/enablements/${id}/stop`, { method: "POST" });

export const getKnownSources = (enablementId: number) =>
  request<KnownSource[]>(`/api/v1/enablements/${enablementId}/known-sources`);

// ── Sources ──────────────────────────────────────────────────────────────────

export const getSources = (enablementId: number) =>
  request<SourceResponse[]>(`/api/v1/enablements/${enablementId}/sources`);

export const postSource = (enablementId: number, data: SourceCreate) =>
  request<SourceResponse>(`/api/v1/enablements/${enablementId}/sources`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const putSource = (enablementId: number, sourceId: number, data: SourceUpdate) =>
  request<SourceResponse>(
    `/api/v1/enablements/${enablementId}/sources/${sourceId}`,
    { method: "PUT", body: JSON.stringify(data) },
  );

export const deleteSource = (enablementId: number, sourceId: number) =>
  request<void>(`/api/v1/enablements/${enablementId}/sources/${sourceId}`, {
    method: "DELETE",
  });
