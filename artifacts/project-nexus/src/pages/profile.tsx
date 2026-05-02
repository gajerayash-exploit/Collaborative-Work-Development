import { useState } from "react";
import { useUser } from "@clerk/react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useGetUserProfile, useUpdateUserProfile } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Check, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfilePage() {
  const { user } = useUser();
  const { toast } = useToast();
  const { data: profile, isLoading, refetch } = useGetUserProfile();
  const updateProfile = useUpdateUserProfile();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");

  const handleEdit = () => {
    setName(profile?.name ?? user?.fullName ?? "");
    setEditing(true);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    updateProfile.mutate(
      { data: { name: name.trim() } },
      {
        onSuccess: () => {
          toast({ title: "✅ Profile updated", description: "Your display name has been updated." });
          setEditing(false);
          refetch();
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" });
        },
      }
    );
  };

  const handleCancel = () => {
    setEditing(false);
    setName("");
  };

  const displayName = profile?.name ?? user?.fullName ?? "User";
  const email = profile?.email ?? user?.primaryEmailAddress?.emailAddress ?? "";
  const avatarUrl = user?.imageUrl ?? profile?.avatarUrl ?? "";
  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <AppLayout>
      <div className="flex flex-col h-full overflow-auto bg-muted/10">
        <div className="max-w-2xl mx-auto w-full p-6 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">👤 My Profile</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your account information</p>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
            </div>
          ) : (
            <>
              {/* Profile Card */}
              <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
                {/* Cover gradient */}
                <div className="h-24 bg-gradient-to-r from-primary/20 via-blue-500/10 to-purple-500/10" />

                <div className="px-6 pb-6">
                  {/* Avatar */}
                  <div className="flex items-end gap-4 -mt-10 mb-4">
                    <Avatar className="h-20 w-20 border-4 border-background shadow-lg ring-2 ring-primary/20">
                      <AvatarImage src={avatarUrl} alt={displayName} />
                      <AvatarFallback className="text-2xl font-black bg-gradient-to-br from-primary/30 to-primary/10 text-primary">
                        {displayName.split(" ").map((p: string) => p[0]).join("").toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="pb-1">
                      <Badge variant="secondary" className="gap-1 text-xs">
                        ✅ Verified
                      </Badge>
                    </div>
                  </div>

                  {/* Name */}
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {editing ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={name}
                          onChange={e => setName(e.target.value)}
                          className="h-9 text-lg font-bold max-w-xs"
                          autoFocus
                          onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") handleCancel(); }}
                        />
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" onClick={handleSave} disabled={updateProfile.isPending}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={handleCancel}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <h2 className="text-2xl font-black">{displayName}</h2>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={handleEdit}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{email}</p>

                  <Separator className="my-4" />

                  {/* Info rows */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-lg flex-shrink-0">
                        👤
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Display Name</p>
                        <p className="text-sm font-semibold">{displayName}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-lg flex-shrink-0">
                        📧
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Email Address</p>
                        <p className="text-sm font-semibold">{email}</p>
                      </div>
                    </div>

                    {memberSince && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="h-9 w-9 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-lg flex-shrink-0">
                          🗓️
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground font-medium">Member Since</p>
                          <p className="text-sm font-semibold">{memberSince}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Auth Info */}
              <div className="bg-card border rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold mb-1 flex items-center gap-2">🔐 Authentication</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Your account is managed through Clerk. Password changes and avatar updates are handled via your OAuth provider.
                </p>
                <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl border">
                  <div className="h-9 w-9 rounded-full bg-white border shadow-sm flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 24 24" className="h-4 w-4">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">Google</p>
                    <p className="text-xs text-muted-foreground truncate">{email}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs gap-1 flex-shrink-0">
                    ✅ Connected
                  </Badge>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
