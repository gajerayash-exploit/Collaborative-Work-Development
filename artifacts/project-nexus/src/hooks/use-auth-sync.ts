import { useEffect } from "react";
import { useUser } from "@clerk/react";
import { useAuthenticatedFetch } from "./use-authenticated-fetch";

export function useAuthSync() {
  const { user, isLoaded } = useUser();
  const authenticatedFetch = useAuthenticatedFetch();

  useEffect(() => {
    if (!isLoaded || !user) return;

    const syncUser = async () => {
      try {
        await authenticatedFetch("/api/user/sync", {
          method: "POST",
          body: JSON.stringify({
            email: user.primaryEmailAddress?.emailAddress || "",
            name: user.fullName || user.firstName || "User",
            avatarUrl: user.imageUrl || "",
          }),
        });
      } catch (err) {
        console.error("Failed to sync user:", err);
      }
    };

    syncUser();
  }, [user, isLoaded, authenticatedFetch]);
}
