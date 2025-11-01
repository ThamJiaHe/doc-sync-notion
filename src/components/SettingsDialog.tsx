import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Key, 
  Save, 
  Eye, 
  EyeOff, 
  ExternalLink, 
  Info,
  User,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
}

export function SettingsDialog({ open, onOpenChange, user }: SettingsDialogProps) {
  const [notionApiKey, setNotionApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchUserSettings(user.id);
    }
  }, [open, user]);

  const fetchUserSettings = async (userId: string) => {
    try {
      setLoading(true);
      
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Try to call edge function to fetch and decrypt settings
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      try {
        const response = await fetch(
          `${supabaseUrl}/functions/v1/update-user-settings`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setNotionApiKey(data.notion_api_key || "");
          return; // Success, exit early
        }
        
        // If edge function fails, log and fall back to direct DB read
        console.warn('Edge function failed, falling back to direct database read');
      } catch (edgeFunctionError) {
        console.warn('Edge function not available, using fallback:', edgeFunctionError);
      }

      // Fallback: Read directly from database (unencrypted or legacy data)
      const { data, error } = await supabase
        .from("user_settings")
        .select("notion_api_key")
        .eq("user_id", userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (data) {
        // If key exists and doesn't look encrypted, show it
        // Encrypted keys are base64 and won't start with notion key prefixes
        const apiKey = data.notion_api_key || "";
        const looksEncrypted = apiKey && !apiKey.startsWith('secret_') && !apiKey.startsWith('ntn_');
        
        if (looksEncrypted) {
          // Key is encrypted but we can't decrypt it client-side
          toast.warning("API key is encrypted. Please re-enter it to continue using Notion integration.");
          setNotionApiKey("");
        } else {
          setNotionApiKey(apiKey);
        }
      }
    } catch (error: any) {
      console.error("Error fetching settings:", error);
      toast.error(error.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!user) return;

    const trimmedKey = notionApiKey.trim();
    
    // Validate Notion API key format (accepts both OAuth and Internal Integration tokens)
    if (trimmedKey && !trimmedKey.startsWith("secret_") && !trimmedKey.startsWith("ntn_")) {
      toast.error("Invalid Notion API key format. It should start with 'secret_' or 'ntn_'");
      return;
    }

    setSaving(true);
    try {
      // Call edge function to encrypt and save the API key
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Get Supabase URL from environment variables
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/update-user-settings`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            notion_api_key: trimmedKey || null,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save settings');
      }

      toast.success("Settings saved successfully!");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error(error.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-2xl font-bold">Settings</DialogTitle>
          <DialogDescription className="text-base">
            Manage your account settings and integrations
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-140px)]">
          <div className="px-6 pb-6 space-y-8">
            {/* Profile Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Profile</h3>
              </div>
              <Separator />
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white text-2xl font-semibold">
                    {user?.email?.substring(0, 2).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <div>
                    <Label className="text-sm text-muted-foreground">Email</Label>
                    <p className="text-base font-medium">{user?.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">User ID</Label>
                    <p className="text-sm font-mono text-muted-foreground break-all">{user?.id}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Notion Integration Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Key className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Notion Integration</h3>
              </div>
              <Separator />

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <>
                  {/* Information Alert */}
                  <Alert className="border-blue-200 bg-blue-50">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-sm text-blue-900 leading-relaxed">
                      <strong>Why add a Notion API key?</strong>
                      <br />
                      With your personal Notion API key, our AI can fetch your database schema and format CSV exports with exact column headers matching your Notion database.
                    </AlertDescription>
                  </Alert>

                  {/* API Key Input */}
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <Label htmlFor="notion-api-key" className="text-sm font-medium">Notion API Key</Label>
                      <div className="relative">
                        <Input
                          id="notion-api-key"
                          type={showApiKey ? "text" : "password"}
                          value={notionApiKey}
                          onChange={(e) => setNotionApiKey(e.target.value)}
                          placeholder="ntn_xxxxxxxxxxxxxxxxxxxxxxxx or secret_xxxxxxxxxxxxxxxxxxxxxxxx"
                          className="pr-10 font-mono text-sm h-11"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showApiKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Your API key is stored securely. Leave empty to disable Notion integration.
                      </p>
                    </div>

                    {/* Setup Instructions */}
                    <div className="bg-muted/50 rounded-lg p-5 space-y-3">
                      <h4 className="font-semibold text-base flex items-center gap-2">
                        <Info className="h-5 w-5" />
                        How to get your Notion API key
                      </h4>
                      <ol className="text-sm space-y-2.5 ml-6 list-decimal leading-relaxed">
                        <li>
                          Go to{" "}
                          <a
                            href="https://www.notion.so/my-integrations"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1"
                          >
                            Notion Integrations
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </li>
                        <li>Click <strong>+ New integration</strong></li>
                        <li>Give it a name (e.g., "Doc Sync Notion")</li>
                        <li>Select your workspace</li>
                        <li>Click <strong>Submit</strong></li>
                        <li>Copy the <strong>Internal Integration Secret</strong> (starts with <code className="bg-muted px-1 py-0.5 rounded text-xs">ntn_</code> or <code className="bg-muted px-1 py-0.5 rounded text-xs">secret_</code>)</li>
                        <li>Paste it above and click Save</li>
                      </ol>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </ScrollArea>

        <div className="px-6 py-5 border-t bg-muted/20 flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-10 px-6 text-sm">
            Cancel
          </Button>
          <Button onClick={saveSettings} disabled={saving || loading} className="gap-2 h-10 px-6 text-sm">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
