import { useState, useCallback, useEffect } from "react";
import { Upload, File, X } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface FileUploadProps {
  onUploadComplete: () => void;
}

export const FileUpload = ({ onUploadComplete }: FileUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [sourceId, setSourceId] = useState("");
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Load default source ID from user settings on mount
  useEffect(() => {
    const loadDefaultSourceId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Try to fetch from user_settings
        const { data, error } = await supabase
          .from("user_settings")
          .select("default_source_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!error && data?.default_source_id) {
          setSourceId(data.default_source_id);
        }
      } catch (error) {
        console.error("Error loading default source ID:", error);
      } finally {
        setLoadingSettings(false);
      }
    };

    loadDefaultSourceId();
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.heic'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (files.length === 0) {
      toast.error("Please select files to upload");
      return;
    }

    // Validate Notion Source ID if provided (UUID with or without dashes)
    const trimmedSource = sourceId.trim();
    if (trimmedSource && !/^[a-f0-9-]{32,36}$/i.test(trimmedSource)) {
      toast.error("Invalid Notion Source ID format. Paste the Database ID (UUID).");
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to upload files");
        return;
      }

      for (const file of files) {
        // Upload file to storage
        const filePath = `${user.id}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);

        // Create document record
        const { data: documentData, error: dbError } = await supabase
          .from('documents')
          .insert({
            user_id: user.id,
            filename: file.name,
            file_url: publicUrl,
            file_type: file.type,
            file_size: file.size,
            status: 'pending',
            source_id: sourceId || null
          })
          .select()
          .single();

        if (dbError) throw dbError;

        // Trigger processing immediately
        if (documentData) {
          supabase.functions.invoke('process-document', {
            body: { documentId: documentData.id }
          }).catch(err => console.error('Failed to trigger processing:', err));
        }
      }

      toast.success(`Successfully uploaded ${files.length} file(s)`);
      setFiles([]);
      onUploadComplete();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || "Failed to upload files");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-6">
        <label className="text-sm font-medium block mb-2">Notion Database ID (optional)</label>
        <Input value={sourceId} onChange={(e) => setSourceId(e.target.value)} placeholder="e.g., 1a2b3c4d5e6f7g8h9i0j" />
        <p className="text-xs text-muted-foreground mt-1">
          Add your Notion Database ID to format CSV output to match your database columns.
          <a href="https://developers.notion.com/docs/create-a-notion-integration#getting-started" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">
            Learn more
          </a>
        </p>
      </div>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-smooth hover:border-primary ${
          isDragActive ? 'border-primary bg-primary/5' : 'border-border'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">
          {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          or click to browse
        </p>
        <p className="text-xs text-muted-foreground">
          Supports: PDF, DOC, DOCX, Images (PNG, JPG, WEBP, HEIC)
        </p>
      </div>

      {files.length > 0 && (
        <div className="mt-6 space-y-2">
          <h4 className="font-semibold text-sm">Selected Files ({files.length})</h4>
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-muted rounded-lg"
            >
              <div className="flex items-center gap-3">
                <File className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            onClick={uploadFiles}
            disabled={uploading}
            className="w-full mt-4 gradient-primary"
          >
            {uploading ? 'Uploading...' : `Upload ${files.length} File(s)`}
          </Button>
        </div>
      )}
    </Card>
  );
};