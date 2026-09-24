const DEFAULT_API_URL = "http://localhost:8080/api/v1";

/** URL API cho trình duyệt — Next nhúng giá trị lúc build. */
export const PUBLIC_API_URL: string = process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;

/** URL API cho code chạy trên server (Server Components). Trong Docker: http://backend:8080/api/v1 */
export function getInternalApiUrl(): string {
  return process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;
}

/** Chọn base URL phù hợp với môi trường chạy hiện tại. */
export function getApiBaseUrl(): string {
  return typeof window === "undefined" ? getInternalApiUrl() : PUBLIC_API_URL;
}

export const APP_NAME = "Mekong Tour";
export const AUTH_STORAGE_KEY = "bt.auth";
export const NOTIFICATION_POLL_MS = 30_000;
export const DEFAULT_PAGE_SIZE = 12;
