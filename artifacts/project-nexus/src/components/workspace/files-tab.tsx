import { useState, useRef } from "react";
import { useListFiles, useUploadFile, useDeleteFile, getListFilesQueryKey, WorkspaceRole } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FileIcon, Upload, Trash2, Download, FileText, FileImage, FileCode, FileArchive, Loader2 } from "lucide-react";
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
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <FileImage className="h-4 w-4 text-blue-500" />;
  if (mimeType.startsWith("text/")) return <FileCode className="h-4 w-4 text-orange-500" />;
  if (mimeType.includes("zip") || mimeType.includes("tar") || mimeType.includes("compressed")) return <FileArchive className="h-4 w-4 text-red-500" />;
  return <FileText className="h-4 w-4 text-muted-foreground" />;
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    // In a real app, this would upload to S3/GCS. For now, we simulate with a data URL or blob
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      uploadFile.mutate({
        workspaceId,
        data: {
          name: file.name,
          size: file.size,
          mimeType: file.type || "application/octet-stream",
          url: result // storing the base64 or blob URL
        }
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListFilesQueryKey(workspaceId) });
          if (fileInputRef.current) fileInputRef.current.value = '';
          setIsUploading(false);
        },
        onError: () => setIsUploading(false)
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = (fileId: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;
    deleteFile.mutate({ workspaceId, fileId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListFilesQueryKey(workspaceId) });
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Files</h2>
        {canUpload && (
          <div>
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange}
            />
            <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading || uploadFile.isPending}>
              {isUploading || uploadFile.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Upload File
            </Button>
          </div>
        )}
      </div>

      <div className="border rounded-lg bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Name</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Uploaded By</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
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
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center">
                    <FileIcon className="h-10 w-10 mb-2 opacity-20" />
                    <p>No files uploaded yet.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              files?.map((file) => (
                <TableRow key={file.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {getFileIcon(file.mimeType)}
                      <span className="truncate max-w-[200px]" title={file.name}>{file.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatBytes(file.size)}</TableCell>
                  <TableCell>{file.uploaderName}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <a href={file.url} download={file.name} target="_blank" rel="noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                      {canUpload && (
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(file.id)}>
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
