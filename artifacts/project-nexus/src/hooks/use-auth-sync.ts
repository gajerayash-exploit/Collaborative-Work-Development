import { useEffect } from "react";
import { useUser } from "@clerk/react";

export function useAuthSync() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded || !user) return;

    const syncUser = async () => {
      try {
        await fetch("/api/user/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
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
  }, [user, isLoaded]);
}
