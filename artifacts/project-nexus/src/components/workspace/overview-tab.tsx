import { useGetWorkspaceStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users, FileText, MessageSquare, Calendar,
  MessageCircle, Upload, UserPlus, FileImage,
  FileCode, FileArchive, File, Music, Video,
  Inbox
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <FileImage className="h-4 w-4 text-blue-500" />;
  if (mimeType.startsWith("video/")) return <Video className="h-4 w-4 text-purple-500" />;
  if (mimeType.startsWith("audio/")) return <Music className="h-4 w-4 text-pink-500" />;
  if (mimeType.includes("zip") || mimeType.includes("tar") || mimeType.includes("rar")) return <FileArchive className="h-4 w-4 text-yellow-600" />;
  if (mimeType.includes("javascript") || mimeType.includes("typescript") || mimeType.includes("html") || mimeType.includes("css") || mimeType.includes("json") || mimeType.includes("xml")) return <FileCode className="h-4 w-4 text-green-500" />;
  if (mimeType.includes("pdf")) return <FileText className="h-4 w-4 text-red-500" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
}

function ActivityTypeIcon({ type }: { type: string }) {
  const base = "h-4 w-4";
  if (type === "message") return <MessageCircle className={`${base} text-blue-500`} />;
  if (type === "file_upload") return <Upload className={`${base} text-green-500`} />;
  if (type === "member_joined") return <UserPlus className={`${base} text-purple-500`} />;
  return <Inbox className={`${base} text-muted-foreground`} />;
}

function ActivityDotColor(type: string): string {
  if (type === "message") return "bg-blue-500";
  if (type === "file_upload") return "bg-green-500";
  if (type === "member_joined") return "bg-purple-500";
  return "bg-muted-foreground";
}

function roleColor(role: string) {
  if (role === "admin") return "default";
  if (role === "editor") return "secondary";
  return "outline";
}

function StatCard({
  title, value, icon, sub,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  sub?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export function OverviewTab({ workspaceId }: { workspaceId: string }) {
  const { data: stats, isLoading } = useGetWorkspaceStats(workspaceId);

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
          icon={<Users className="h-4 w-4 text-primary" />}
          sub={stats.memberCount === 1 ? "1 person" : `${stats.memberCount} people`}
        />
        <StatCard
          title="Files"
          value={stats.fileCount}
          icon={<FileText className="h-4 w-4 text-primary" />}
          sub="uploaded"
        />
        <StatCard
          title="Messages"
          value={stats.messageCount}
          icon={<MessageSquare className="h-4 w-4 text-primary" />}
          sub="sent total"
        />
        <StatCard
          title="Days Active"
          value={daysActive}
          icon={<Calendar className="h-4 w-4 text-primary" />}
          sub={`Since ${format(new Date(stats.workspaceCreatedAt), "MMM d, yyyy")}`}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Activity Feed */}
        <Card className="lg:col-span-3 flex flex-col">
          <CardHeader className="pb-3 flex-shrink-0">
            <CardTitle className="text-base">Activity Feed</CardTitle>
            <CardDescription>Everything happening in this workspace</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-[480px] px-6 pb-6">
              {stats.recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Inbox className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">No activity yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Start chatting, uploading files, or inviting members.</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
                  <div className="space-y-5">
                    {stats.recentActivity.map((activity, i) => (
                      <div key={i} className="flex gap-4 relative">
                        {/* Timeline dot */}
                        <div className={`h-8 w-8 rounded-full border-2 border-background flex items-center justify-center flex-shrink-0 z-10 ${
                          activity.type === "message" ? "bg-blue-100" :
                          activity.type === "file_upload" ? "bg-green-100" :
                          "bg-purple-100"
                        }`}>
                          <ActivityTypeIcon type={activity.type} />
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Avatar className="h-5 w-5 border">
                              <AvatarImage src={activity.avatarUrl ?? undefined} />
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
              <CardTitle className="text-base">Recent Files</CardTitle>
              <CardDescription>Latest uploads</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {stats.recentFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <FileText className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No files yet</p>
                </div>
              ) : (
                <div className="divide-y">
                  {stats.recentFiles.map((file) => (
                    <div key={file.id} className="flex items-center gap-3 px-6 py-3 hover:bg-muted/30 transition-colors">
                      <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                        {getFileIcon(file.mimeType)}
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
              <CardTitle className="text-base">Team</CardTitle>
              <CardDescription>{stats.memberCount} {stats.memberCount === 1 ? "member" : "members"}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {stats.recentMembers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Users className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No members yet</p>
                </div>
              ) : (
                <div className="divide-y">
                  {stats.recentMembers.map((member) => (
                    <div key={member.id} className="flex items-center gap-3 px-6 py-3">
                      <Avatar className="h-8 w-8 border flex-shrink-0">
                        <AvatarImage src={member.avatarUrl ?? undefined} />
                        <AvatarFallback className="text-xs">{member.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{member.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      </div>
                      <Badge variant={roleColor(member.role) as any} className="capitalize text-[10px] px-2 py-0 flex-shrink-0">
                        {member.role}
                      </Badge>
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
                <CardTitle className="text-base">Latest Messages</CardTitle>
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
