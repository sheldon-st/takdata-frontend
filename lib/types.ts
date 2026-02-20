// TypeScript types derived from the OpenAPI spec

export interface CertInfo {
  cert_id: string;
  filename: string;
}

export interface TakConfigResponse {
  id: number;
  cot_url: string;
  cert_path: string | null;
  cot_host_id: string;
  dont_check_hostname: boolean;
  dont_verify: boolean;
  max_out_queue: number;
  max_in_queue: number;
  updated_at: string | null;
}

export interface TakConfigUpdate {
  cot_url?: string;
  cert_path?: string | null;
  cert_password?: string | null;
  cot_host_id?: string;
  dont_check_hostname?: boolean;
  dont_verify?: boolean;
  max_out_queue?: number;
  max_in_queue?: number;
}

export interface TakStatusResponse {
  connected: boolean;
  url: string;
  queue_size: number;
}

export interface EnablementTypeInfo {
  type_id: string;
  display_name: string;
  description: string;
}

export interface SourceResponse {
  id: number;
  enablement_id: number;
  name: string;
  base_url: string;
  endpoint: "geo" | "point" | "mil";
  sleep_interval: number;
  lat: number | null;
  lon: number | null;
  distance: number | null;
  enabled: boolean;
  created_at: string;
}

export interface EnablementResponse {
  id: number;
  type_id: string;
  name: string;
  enabled: boolean;
  cot_stale: number;
  alt_upper: number;
  alt_lower: number;
  uid_key: string;
  geo_filter_min_lat: number | null;
  geo_filter_max_lat: number | null;
  geo_filter_min_lon: number | null;
  geo_filter_max_lon: number | null;
  running: boolean;
  created_at: string;
  updated_at: string;
  sources: SourceResponse[];
}

export interface EnablementCreate {
  type_id: string;
  name: string;
  enabled?: boolean;
  cot_stale?: number;
  alt_upper?: number;
  alt_lower?: number;
  uid_key?: string;
  geo_filter_min_lat?: number | null;
  geo_filter_max_lat?: number | null;
  geo_filter_min_lon?: number | null;
  geo_filter_max_lon?: number | null;
}

export interface EnablementUpdate {
  name?: string | null;
  enabled?: boolean | null;
  cot_stale?: number | null;
  alt_upper?: number | null;
  alt_lower?: number | null;
  uid_key?: string | null;
  geo_filter_min_lat?: number | null;
  geo_filter_max_lat?: number | null;
  geo_filter_min_lon?: number | null;
  geo_filter_max_lon?: number | null;
}

export interface SourceCreate {
  name: string;
  base_url: string;
  endpoint?: "geo" | "point" | "mil";
  sleep_interval?: number;
  lat?: number | null;
  lon?: number | null;
  distance?: number | null;
  enabled?: boolean;
}

export interface SourceUpdate {
  name?: string | null;
  base_url?: string | null;
  endpoint?: "geo" | "point" | "mil" | null;
  sleep_interval?: number | null;
  lat?: number | null;
  lon?: number | null;
  distance?: number | null;
  enabled?: boolean | null;
}

// WebSocket status message shape
export interface SourceStat {
  last_poll: string | null;
  aircraft_count?: number;
  vessel_count?: number;
  [key: string]: unknown;
}

export interface EnablementStatusItem {
  id: number;
  name: string;
  type_id: string;
  running: boolean;
  events_sent: number;
  last_poll_time: string | null;
  last_error: string | null;
  active_items: number;
  source_stats: Record<string, SourceStat>;
}

export interface WsStatusMessage {
  tak_connected: boolean;
  tak_url: string;
  tx_queue_size: number;
  connect_error: string | null;
  enablements: EnablementStatusItem[];
  server_time: string;
}

// API error shapes
export interface ValidationErrorItem {
  loc: (string | number)[];
  msg: string;
  type: string;
  input?: unknown;
  ctx?: Record<string, unknown>;
}

export interface ApiValidationError {
  detail: ValidationErrorItem[];
}

export interface ApiError {
  detail: string;
}

// Packages
export interface PackageResponse {
  package_id: string;
  filename: string;
  size: number;
}

// Known source template (returned by GET /enablements/:id/known-sources)
export interface KnownSource {
  name: string;
  base_url: string;
  endpoint: "geo" | "point" | "mil";
  sleep_interval?: number;
  lat?: number | null;
  lon?: number | null;
  distance?: number | null;
}
