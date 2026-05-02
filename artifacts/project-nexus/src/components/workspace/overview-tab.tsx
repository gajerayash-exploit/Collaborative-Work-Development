import { useGetWorkspaceStats, useGetWorkspaceActivity, getGetWorkspaceActivityQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow, format } from "date-fns";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileEmoji(mimeType: string) {
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType.startsWith("video/")) return "🎬";
  if (mimeType.startsWith("audio/")) return "🎵";
  if (mimeType.includes("zip") || mimeType.includes("tar") || mimeType.includes("rar")) return "📦";
  if (mimeType.includes("javascript") || mimeType.includes("typescript") || mimeType.includes("html") || mimeType.includes("css") || mimeType.includes("json")) return "💻";
  if (mimeType.includes("pdf")) return "📄";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "📊";
  return "📎";
}

function getActivityEmoji(type: string) {
  if (type === "task_created") return "📋";
  if (type === "task_status_changed") return "🔄";
  if (type === "task_assigned") return "👤";
  if (type === "task_priority_changed") return "🚦";
  if (type === "file_uploaded") return "📤";
  if (type === "member_joined") return "🎉";
  if (type === "member_role_changed") return "👑";
  return "⚡";
}

function getActivityBg(type: string) {
  if (type.startsWith("task_")) return "bg-violet-100 dark:bg-violet-900/30";
  if (type === "file_uploaded") return "bg-emerald-100 dark:bg-emerald-900/30";
  if (type === "member_joined" || type === "member_role_changed") return "bg-purple-100 dark:bg-purple-900/30";
  return "bg-muted";
}

function roleColor(role: string) {
  if (role === "admin") return "default";
  if (role === "editor") return "secondary";
  return "outline";
}

function roleEmoji(role: string) {
  if (role === "admin") return "👑";
  if (role === "editor") return "✏️";
  return "👁️";
}

function StatCard({
  title, value, icon, sub, gradient,
}: {
  title: string;
  value: string | number;
  icon: string;
  sub?: string;
  gradient: string;
}) {
  return (
    <Card className="relative overflow-hidden group hover:shadow-md transition-all duration-200">
      <div className={`absolute inset-0 opacity-40 ${gradient}`} />
      <CardHeader className="flex flex-row items-center justify-between pb-1.5 space-y-0 relative z-10 p-3 sm:p-6 sm:pb-2">
        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-xl sm:text-2xl">{icon}</div>
      </CardHeader>
      <CardContent className="relative z-10 p-3 pt-0 sm:p-6 sm:pt-0">
        <div className="text-2xl sm:text-3xl font-black tracking-tight">{value}</div>
        {sub && <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export function OverviewTab({ workspaceId }: { workspaceId: string }) {
  const { data: stats, isLoading } = useGetWorkspaceStats(workspaceId);
  const { data: activityData } = useGetWorkspaceActivity(workspaceId, { limit: 50 }, {
    query: {
      queryKey: getGetWorkspaceActivityQueryKey(workspaceId, { limit: 50 }),
      refetchInterval: 30_000,
      enabled: !!workspaceId,
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Skeleton className="lg:col-span-3 h-[500px] rounded-xl" />
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-56 rounded-xl" />
            <Skeleton className="h-56 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const daysActive = Math.max(1, Math.floor(
    (Date.now() - new Date(stats.workspaceCreatedAt).getTime()) / (1000 * 60 * 60 * 24)
  ));

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Members"
          value={stats.memberCount}
          icon="👥"
          sub={stats.memberCount === 1 ? "1 person" : `${stats.memberCount} people`}
          gradient="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/20"
        />
        <StatCard
          title="Files"
          value={stats.fileCount}
          icon="📁"
          sub="uploaded"
          gradient="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20"
        />
        <StatCard
          title="Messages"
          value={stats.messageCount}
          icon="💬"
          sub="sent total"
          gradient="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/20"
        />
        <StatCard
          title="Days Active"
          value={daysActive}
          icon="🔥"
          sub={`Since ${format(new Date(stats.workspaceCreatedAt), "MMM d, yyyy")}`}
          gradient="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/20"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Activity Feed */}
        <Card className="lg:col-span-3 flex flex-col">
          <CardHeader className="pb-3 flex-shrink-0">
            <CardTitle className="text-base flex items-center gap-2">⚡ Activity Feed</CardTitle>
            <CardDescription>Everything happening in this workspace</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-[480px] px-6 pb-6">
              {!activityData || activityData.events.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <div className="text-4xl mb-3">🌱</div>
                  <p className="text-sm font-semibold">No activity yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Create tasks, upload files, or invite members to see events here.</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
                  <div className="space-y-5">
                    {activityData.events.map((activity) => (
                      <div key={activity.id} className="flex gap-4 relative">
                        <div className={`h-8 w-8 rounded-full border-2 border-background flex items-center justify-center flex-shrink-0 z-10 text-sm ${getActivityBg(activity.type)}`}>
                          {getActivityEmoji(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Avatar className="h-5 w-5 border">
                              <AvatarImage src={activity.userAvatarUrl ?? undefined} />
                              <AvatarFallback className="text-[9px]">
                                {activity.userName.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-semibold leading-snug">{activity.userName}</span>
                            <span className="text-sm text-muted-foreground leading-snug">{activity.description}</span>
                          </div>
                          <p className="text-xs text-muted-foreground/60 mt-1">
                            {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Files */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">📂 Recent Files</CardTitle>
              <CardDescription>Latest uploads</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {stats.recentFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <div className="text-3xl mb-2">🗂️</div>
                  <p className="text-sm text-muted-foreground">No files yet</p>
                </div>
              ) : (
                <div className="divide-y">
                  {stats.recentFiles.map((file) => (
                    <div key={file.id} className="flex items-center gap-3 px-6 py-3 hover:bg-muted/30 transition-colors">
                      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 text-lg">
                        {getFileEmoji(file.mimeType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatBytes(file.size)} · {file.uploaderName} · {formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Members */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">👥 Team</CardTitle>
              <CardDescription>{stats.memberCount} {stats.memberCount === 1 ? "member" : "members"}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {stats.recentMembers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="text-3xl mb-2">🤝</div>
                  <p className="text-sm text-muted-foreground">No members yet</p>
                </div>
              ) : (
                <div className="divide-y">
                  {stats.recentMembers.map((member) => (
                    <div key={member.id} className="flex items-center gap-3 px-6 py-3">
                      <Avatar className="h-8 w-8 border-2 border-border flex-shrink-0">
                        <AvatarImage src={member.avatarUrl ?? undefined} />
                        <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
                          {member.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{member.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      </div>
                      <span className="text-sm">{roleEmoji(member.role)}</span>
                    </div>
                  ))}
                  {stats.memberCount > stats.recentMembers.length && (
                    <div className="px-6 py-3 text-xs text-muted-foreground text-center">
                      +{stats.memberCount - stats.recentMembers.length} more member{stats.memberCount - stats.recentMembers.length === 1 ? "" : "s"}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Messages */}
          {stats.recentMessages.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">💬 Latest Messages</CardTitle>
                <CardDescription>Recent conversation</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {stats.recentMessages.map((msg) => (
                    <div key={msg.id} className="flex gap-3 px-6 py-3">
                      <Avatar className="h-7 w-7 border flex-shrink-0 mt-0.5">
                        <AvatarImage src={msg.senderAvatarUrl ?? undefined} />
                        <AvatarFallback className="text-[10px]">{msg.senderName.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-semibold">{msg.senderName}</span>
                          <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
