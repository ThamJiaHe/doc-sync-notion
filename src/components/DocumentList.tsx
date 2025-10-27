import { useEffect, useState } from "react";
import { FileText, Download, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
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

interface DocumentListProps {
  refreshTrigger: number;
}

export const DocumentList = ({ refreshTrigger }: DocumentListProps) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, [refreshTrigger]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const processDocument = async (documentId: string) => {
    try {
      toast.info("Processing document...");
      
      const { error } = await supabase.functions.invoke('process-document', {
        body: { documentId }
      });

      if (error) throw error;
      
      toast.success("Document processing started");
      fetchDocuments();
    } catch (error: any) {
      console.error('Error processing document:', error);
      toast.error(error.message || "Failed to process document");
    }
  };

  const downloadCSV = async (documentId: string, filename: string) => {
    try {
      const { data, error } = await supabase
        .from('extracted_data')
        .select('csv_data')
        .eq('document_id', documentId)
        .single();

      if (error) throw error;

      if (!data?.csv_data) {
        toast.error("No CSV data available");
        return;
      }

      const blob = new Blob([data.csv_data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename.replace(/\.[^/.]+$/, '')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success("CSV downloaded successfully");
    } catch (error: any) {
      console.error('Error downloading CSV:', error);
      toast.error("Failed to download CSV");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-accent"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'processing':
        return <Badge className="bg-secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <Card className="p-12 text-center">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
        <p className="text-sm text-muted-foreground">
          Upload your first document to get started
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <Card key={doc.id} className="p-6 hover:shadow-elegant transition-smooth">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="p-3 rounded-lg bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold">{doc.filename}</h4>
                <p className="text-sm text-muted-foreground">
                  {(doc.file_size / 1024 / 1024).toFixed(2)} MB • {new Date(doc.created_at).toLocaleDateString()}
                </p>
                {doc.error_message && (
                  <p className="text-sm text-destructive mt-1">{doc.error_message}</p>
                )}
              </div>
              {getStatusBadge(doc.status)}
            </div>
            <div className="flex gap-2 ml-4">
              {doc.status === 'pending' && (
                <Button
                  onClick={() => processDocument(doc.id)}
                  variant="outline"
                  size="sm"
                  className="gradient-primary text-white"
                >
                  Process
                </Button>
              )}
              {doc.status === 'completed' && (
                <Button
                  onClick={() => downloadCSV(doc.id, doc.filename)}
                  variant="outline"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};