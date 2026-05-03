import { useState, useRef } from "react";
import { useListFiles, useUploadFile, useDeleteFile, getListFilesQueryKey, WorkspaceRole } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, Trash2, Download, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function getFileEmoji(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType.startsWith("video/")) return "🎬";
  if (mimeType.startsWith("audio/")) return "🎵";
  if (mimeType.includes("zip") || mimeType.includes("tar") || mimeType.includes("compressed") || mimeType.includes("rar")) return "📦";
  if (mimeType.includes("javascript") || mimeType.includes("typescript")) return "💛";
  if (mimeType.includes("html") || mimeType.includes("css")) return "🌐";
  if (mimeType.includes("json") || mimeType.includes("xml")) return "🗃️";
  if (mimeType.includes("pdf")) return "📄";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "📊";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "📑";
  if (mimeType.startsWith("text/")) return "📃";
  return "📎";
}

function getFileBg(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "bg-blue-100 dark:bg-blue-900/30";
  if (mimeType.startsWith("video/")) return "bg-purple-100 dark:bg-purple-900/30";
  if (mimeType.startsWith("audio/")) return "bg-pink-100 dark:bg-pink-900/30";
  if (mimeType.includes("zip") || mimeType.includes("tar")) return "bg-amber-100 dark:bg-amber-900/30";
  if (mimeType.includes("javascript") || mimeType.includes("typescript") || mimeType.includes("html") || mimeType.includes("css")) return "bg-emerald-100 dark:bg-emerald-900/30";
  if (mimeType.includes("pdf")) return "bg-red-100 dark:bg-red-900/30";
  return "bg-muted";
}

export function FilesTab({ workspaceId, role }: { workspaceId: string, role: WorkspaceRole }) {
  const canUpload = role === "admin" || role === "editor";
  const { data: files, isLoading } = useListFiles(workspaceId, {
    query: { queryKey: getListFilesQueryKey(workspaceId) }
  });

  const uploadFile = useUploadFile();
  const deleteFile = useDeleteFile();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const processFile = (file: File) => {
    setUploadError(null);
    setIsUploading(true);
    const objectUrl = URL.createObjectURL(file);
    uploadFile.mutate({
      workspaceId,
      data: {
        name: file.name,
        size: file.size,
        mimeType: file.type || "application/octet-stream",
        url: objectUrl,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListFilesQueryKey(workspaceId) });
        if (fileInputRef.current) fileInputRef.current.value = "";
        setIsUploading(false);
      },
      onError: () => {
        setIsUploading(false);
        setUploadError("Upload failed. Please try again.");
      },
      onSettled: () => {
        URL.revokeObjectURL(objectUrl);
      },
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!canUpload) return;
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleDelete = (fileId: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;
    deleteFile.mutate({ workspaceId, fileId }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListFilesQueryKey(workspaceId) })
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">📁 Files</h2>
          <p className="text-sm text-muted-foreground">{files?.length ?? 0} files in this workspace</p>
        </div>
        {canUpload && (
          <div>
            <input
              type="file"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || uploadFile.isPending}
              className="gap-2"
            >
              {isUploading || uploadFile.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Upload className="h-4 w-4" />
              }
              Upload File
            </Button>
          </div>
        )}
      </div>

      {/* Drop zone */}
      {canUpload && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl py-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
            dragOver
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/20"
          }`}
        >
          <div className="text-4xl mb-2">{dragOver ? "📂" : "📤"}</div>
          <p className="text-sm font-medium">{dragOver ? "Drop to upload" : "Drag & drop files here"}</p>
          <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
        </div>
      )}
      {uploadError && (
        <p className="text-sm text-destructive">{uploadError}</p>
      )}

      {/* File table */}
      <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-[40%] font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Size</TableHead>
              <TableHead className="font-semibold">Uploaded by</TableHead>
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [1, 2, 3].map(i => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : files?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-40 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="text-4xl">🗂️</div>
                    <p className="text-sm font-medium text-muted-foreground">No files uploaded yet</p>
                    <p className="text-xs text-muted-foreground">Upload your first file using the button above.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              files?.map((file) => (
                <TableRow key={file.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <img
                        src="@assets/image_1777790929735.png"
                        alt=""
                        className={`h-9 w-9 rounded-lg object-cover flex-shrink-0 ${getFileBg(file.mimeType)}`}
                      />
                      <span className="truncate max-w-[180px] text-sm" title={file.name}>{file.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatBytes(file.size)}</TableCell>
                  <TableCell className="text-sm">{file.uploaderName}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" asChild>
                        <a href={file.url} download={file.name} target="_blank" rel="noreferrer" title="Download">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                      {canUpload && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(file.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
