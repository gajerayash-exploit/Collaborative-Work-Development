const ABSOLUTE_URL_RE = /^https?:\/\//i;

function normalizeBaseUrl(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, "");
}

export const apiBaseUrl = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL);

export function resolveApiUrl(path: string): string {
  if (!path || ABSOLUTE_URL_RE.test(path)) return path;
  if (!path.startsWith("/")) return path;
  return apiBaseUrl ? `${apiBaseUrl}${path}` : path;
}

export function getApiOrigin(): string {
  if (!apiBaseUrl) return window.location.origin;
  return new URL(apiBaseUrl).origin;
}

export function hasCrossOriginApi(): boolean {
  if (!apiBaseUrl) return false;
  return getApiOrigin() !== window.location.origin;
}

export function isWebsocketTransportEnabled(): boolean {
  const override = import.meta.env.VITE_ENABLE_WEBSOCKETS;
  if (override === "true") return !hasCrossOriginApi();
  if (override === "false") return false;
  return import.meta.env.DEV && !hasCrossOriginApi();
}

export function isSrsLiveSyncEnabled(): boolean {
  const override = import.meta.env.VITE_ENABLE_SRS_LIVE_SYNC;
  if (override === "true") return !hasCrossOriginApi();
  if (override === "false") return false;
  return import.meta.env.DEV && !hasCrossOriginApi();
}
