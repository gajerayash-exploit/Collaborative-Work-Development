import { useAuth } from "@clerk/react";
import { useCallback } from "react";

export function useAuthenticatedFetch() {
  const { getToken } = useAuth();

  return useCallback(async (url: string, options: RequestInit = {}) => {
    const token = await getToken();
    return fetch(url, {
      ...options,
      headers: {
        ...(options.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
      },
    });
  }, [getToken]);
}
