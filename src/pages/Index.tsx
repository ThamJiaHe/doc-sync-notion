import { useState, useEffect } from "react";
import { FileUpload } from "@/components/FileUpload";
import { UserProfileDropdown } from "@/components/UserProfileDropdown";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Eye,
  RefreshCw,
  Download,
  Trash2,
  Edit,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EditDocumentDialog } from "@/components/EditDocumentDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Document {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  status: string;
  error_message: string | null;
  created_at: string;
  source_id: string | null;
}

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<Document | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/login");
      } else {
        setUser(user);
        fetchDocuments();
      }
    });
  }, [navigate]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch documents");
    } finally {
      setLoading(false);
    }
  };

  const processDocument = async (documentId: string) => {
    try {
      toast.info("Processing document...");
      const { error } = await supabase.functions.invoke("process-document", {
        body: { documentId },
      });

      if (error) throw error;
      toast.success("Document processing started");
      fetchDocuments();
    } catch (error: any) {
      toast.error("Failed to process document: " + error.message);
    }
  };

  const downloadCSV = async (documentId: string, filename: string) => {
    try {
      const { data, error } = await supabase
        .from("extracted_data")
        .select("csv_data")
        .eq("document_id", documentId)
        .single();

      if (error) throw error;

      const blob = new Blob([data.csv_data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename.split(".")[0]}_extracted.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("CSV downloaded successfully");
    } catch (error: any) {
      toast.error("Failed to download CSV");
    }
  };

  const toggleDocSelection = (id: string) => {
    const newSelected = new Set(selectedDocs);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedDocs(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedDocs.size === documents.length && documents.length > 0) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(documents.map((d) => d.id)));
    }
  };

  const deleteSelectedDocs = async () => {
    try {
      const idsToDelete = Array.from(selectedDocs);
      const { error } = await supabase
        .from("documents")
        .delete()
        .in("id", idsToDelete);

      if (error) throw error;

      toast.success(`Deleted ${idsToDelete.length} document(s)`);
      setSelectedDocs(new Set());
      fetchDocuments();
    } catch (error: any) {
      toast.error("Failed to delete documents: " + error.message);
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const viewPreview = async (documentId: string, filename: string) => {
    try {
      const { data, error } = await supabase
        .from("extracted_data")
        .select("content, markdown_content, csv_data")
        .eq("document_id", documentId)
        .single();

      if (error) throw error;

      setPreviewDoc({ ...data, filename });
      setPreviewOpen(true);
    } catch (error: any) {
      toast.error("Failed to load preview: " + error.message);
    }
  };

  const openEditDialog = (doc: Document) => {
    setEditDoc(doc);
    setEditDialogOpen(true);
  };

  const reprocessSelected = async () => {
    try {
      const idsToProcess = Array.from(selectedDocs);
      let processed = 0;
      
      for (const id of idsToProcess) {
        const { error } = await supabase.functions.invoke("process-document", {
          body: { documentId: id },
        });
        if (!error) processed++;
      }

      toast.success(`Started reprocessing ${processed} document(s)`);
      setSelectedDocs(new Set());
      fetchDocuments();
    } catch (error: any) {
      toast.error("Failed to reprocess documents: " + error.message);
    }
  };

  const downloadAllCSV = async () => {
    try {
      const idsToDownload = Array.from(selectedDocs);
      
      for (const id of idsToDownload) {
        const doc = documents.find((d) => d.id === id);
        if (doc?.status === "completed") {
          await downloadCSV(id, doc.filename);
        }
      }
      
      toast.success(`Downloaded CSV for selected documents`);
    } catch (error: any) {
      toast.error("Failed to download CSV files: " + error.message);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
    > = {
      pending: { variant: "secondary", label: "Pending" },
      processing: { variant: "default", label: "Processing" },
      completed: { variant: "outline", label: "Complete" },
      error: { variant: "destructive", label: "Error" },
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge
        variant={config.variant}
        className={
          status === "completed" ? "bg-emerald-500/10 text-emerald-600 border-emerald-200" : ""
        }
      >
        {config.label}
      </Badge>
    );
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-border shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Doc Sync Notion
              </h1>
              <p className="text-xs text-muted-foreground">AI Document Processor</p>
            </div>
          </div>
          <UserProfileDropdown user={user} />
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Search & Actions */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {selectedDocs.size > 0 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={reprocessSelected}
              >
                <Play className="h-4 w-4 mr-2" />
                Reprocess ({selectedDocs.size})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadAllCSV}
              >
                <Download className="h-4 w-4 mr-2" />
                Download CSV ({selectedDocs.size})
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete ({selectedDocs.size})
              </Button>
            </div>
          )}
        </div>

        {/* Upload Zone */}
        <FileUpload onUploadComplete={fetchDocuments} />

        {/* Documents Table */}
        <div className="border border-border rounded-lg bg-background shadow-sm">
          <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedDocs.size === documents.length && documents.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Document Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Source ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents
                    .filter((doc) =>
                      doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedDocs.has(doc.id)}
                            onCheckedChange={() => toggleDocSelection(doc.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{doc.filename}</TableCell>
                        <TableCell>{doc.file_type}</TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {doc.source_id || "—"}
                          </span>
                        </TableCell>
                        <TableCell>{new Date(doc.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>{getStatusBadge(doc.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openEditDialog(doc)}
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            
                            {doc.status === "pending" && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => processDocument(doc.id)}
                                title="Process"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            )}
                            
                            {doc.status === "completed" && (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => downloadCSV(doc.id, doc.filename)}
                                  title="Download CSV"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => viewPreview(doc.id, doc.filename)}
                                  title="Preview"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => processDocument(doc.id)}
                                  title="Reprocess"
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            
                            {doc.status === "error" && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => processDocument(doc.id)}
                                title="Retry"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Showing {documents.length} document{documents.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview: {previewDoc?.filename}</DialogTitle>
            <DialogDescription>
              Extracted content from the document
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {previewDoc?.markdown_content && (
              <div>
                <h3 className="font-semibold mb-2">Markdown Content</h3>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap">
                  {previewDoc.markdown_content}
                </pre>
              </div>
            )}
            {previewDoc?.csv_data && (
              <div>
                <h3 className="font-semibold mb-2">CSV Data</h3>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                  {previewDoc.csv_data}
                </pre>
              </div>
            )}
            {previewDoc?.content && (
              <div>
                <h3 className="font-semibold mb-2">JSON Content</h3>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                  {JSON.stringify(previewDoc.content, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Documents?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedDocs.size} document(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteSelectedDocs} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Document Dialog */}
      <EditDocumentDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        document={editDoc}
        onUpdate={fetchDocuments}
      />
    </div>
  );
};

export default Index;