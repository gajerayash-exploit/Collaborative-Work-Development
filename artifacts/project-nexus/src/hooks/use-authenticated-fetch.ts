import { useAuth } from "@clerk/react";
import { useCallback } from "react";
import { resolveApiUrl } from "@/lib/runtime-config";

export function useAuthenticatedFetch() {
  const { getToken } = useAuth();

  return useCallback(
    async (url: string, options: RequestInit = {}) => {
      const token = await getToken();
      const headers = new Headers(options.headers ?? {});

      if (token && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      if (options.body != null && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }

      return fetch(resolveApiUrl(url), {
        ...options,
        credentials: options.credentials ?? "include",
        headers,
      });
    },
    [getToken],
  );
}
