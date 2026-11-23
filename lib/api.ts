import type {
  User,
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
  PackageResponse,
} from "./types";

// In production behind Traefik/Dokploy, leave NEXT_PUBLIC_API_BASE_URL unset
// to use same-origin requests (data.opengeo.space + /api path split).
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";

/** Non-2xx response from the backend. `detail` is FastAPI's error payload. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    const detail = (body as { detail?: unknown } | null)?.detail;
    super(typeof detail === "string" ? detail : JSON.stringify(detail ?? body));
    this.name = "ApiError";
  }
}

export const isApiError = (e: unknown, status?: number): e is ApiError =>
  e instanceof ApiError && (status === undefined || e.status === status);

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isForm = options.body instanceof FormData;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    // Let the browser set the multipart boundary for FormData bodies.
    headers: isForm
      ? options.headers
      : { "Content-Type": "application/json", ...options.headers },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, body);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

function upload<T>(path: string, file: File): Promise<T> {
  const form = new FormData();
  form.append("file", file);
  return request<T>(path, { method: "POST", body: form });
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export const getMe = () => request<User>("/api/v1/me");

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

export const uploadCert = (file: File) => upload<CertInfo>("/api/v1/tak/certs", file);

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

// ── Packages ─────────────────────────────────────────────────────────────────

export const getPackages = () =>
  request<PackageResponse[]>("/api/v1/packages");

export const getPackageDownloadUrl = (packageId: string) =>
  `${BASE_URL}/api/v1/packages/${packageId}`;

export const uploadPackage = (file: File) =>
  upload<PackageResponse>("/api/v1/packages", file);

export const deletePackage = (packageId: string) =>
  request<void>(`/api/v1/packages/${packageId}`, { method: "DELETE" });
