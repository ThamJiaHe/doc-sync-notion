import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EditDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: {
    id: string;
    filename: string;
    source_id: string | null;
  } | null;
  onUpdate: () => void;
}

export function EditDocumentDialog({
  open,
  onOpenChange,
  document,
  onUpdate,
}: EditDocumentDialogProps) {
  const [filename, setFilename] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (document) {
      setFilename(document.filename);
      setSourceId(document.source_id || "");
    }
  }, [document]);

  const handleSave = async () => {
    if (!document) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("documents")
        .update({
          filename,
          source_id: sourceId || null,
        })
        .eq("id", document.id);

      if (error) throw error;

      toast.success("Document updated successfully");
      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Failed to update document: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Document</DialogTitle>
          <DialogDescription>
            Update document name and Notion Source ID
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="filename">Document Name</Label>
            <Input
              id="filename"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="Document name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="source_id">Notion Source ID (optional)</Label>
            <Input
              id="source_id"
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              placeholder="e.g., Notion Database ID"
            />
            <p className="text-xs text-muted-foreground">
              Used to format CSV data for your specific Notion database
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
