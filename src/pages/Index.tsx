import { useState, useEffect } from "react";
import { FileUpload } from "@/components/FileUpload";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
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
} from "lucide-react";
import { toast } from "sonner";

interface Document {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  status: string;
  error_message: string | null;
  created_at: string;
}

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
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
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/30">
        <AppSidebar user={user} />

        <main className="flex-1 overflow-y-auto">
          {/* Header */}
          <header className="sticky top-0 z-10 bg-background border-b border-border/50">
            <div className="flex items-center gap-4 px-6 py-4">
              <SidebarTrigger />
              <h1 className="text-2xl font-bold">Document Management</h1>
            </div>
          </header>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Upload Zone */}
            <FileUpload onUploadComplete={fetchDocuments} />

            {/* Documents Table */}
            <div className="border border-border rounded-lg bg-background">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12">
                      <Checkbox />
                    </TableHead>
                    <TableHead>Document Name</TableHead>
                    <TableHead>Type</TableHead>
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
                        <TableCell>{new Date(doc.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>{getStatusBadge(doc.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {doc.status === "pending" && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => processDocument(doc.id)}
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
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </>
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
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Index;