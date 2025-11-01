import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { 
  Key, 
  Save, 
  Eye, 
  EyeOff, 
  ExternalLink, 
  Info,
  User,
  Bell,
  Shield
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Settings = () => {
  const [user, setUser] = useState<any>(null);
  const [notionApiKey, setNotionApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/login");
      } else {
        setUser(user);
        fetchUserSettings(user.id);
      }
    });
  }, [navigate]);

  const fetchUserSettings = async (userId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("user_settings")
        .select("notion_api_key")
        .eq("user_id", userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setNotionApiKey(data.notion_api_key || "");
      }
    } catch (error: any) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!user) return;

    const trimmedKey = notionApiKey.trim();
    
    if (trimmedKey && !trimmedKey.startsWith("secret_")) {
      toast.error("Invalid Notion API key format. It should start with 'secret_'");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("user_settings")
        .upsert({
          user_id: user.id,
          notion_api_key: trimmedKey || null,
        }, {
          onConflict: "user_id"
        });

      if (error) throw error;
      toast.success("Settings saved successfully!");
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SidebarProvider>
        <AppSidebar user={user} />
        <SidebarInset>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading settings...</p>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-lg font-semibold">Settings</h1>
        </header>

        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and integrations
          </p>
        </div>

        {/* Profile Section */}
        <Card className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <User className="h-5 w-5 text-muted-foreground mt-1" />
            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-1">Profile</h2>
              <p className="text-sm text-muted-foreground">
                Your account information
              </p>
            </div>
          </div>
          
          <Separator className="mb-6" />

          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src="" />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {user?.email?.substring(0, 2).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <p className="text-sm font-medium">{user?.email}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">User ID</Label>
                  <p className="text-xs font-mono text-muted-foreground">{user?.id}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Notion Integration Section */}
        <Card className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <Key className="h-5 w-5 text-muted-foreground mt-1" />
            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-1">Notion Integration</h2>
              <p className="text-sm text-muted-foreground">
                Connect your Notion workspace to enable automatic CSV formatting
              </p>
            </div>
          </div>

          <Separator className="mb-6" />

          {/* Information Alert */}
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-900">
              <strong>Why add a Notion API key?</strong>
              <br />
              With your personal Notion API key, our AI can fetch your database schema and format CSV exports with exact column headers matching your Notion database. Without it, the AI still extracts structured data but creates generic headers.
            </AlertDescription>
          </Alert>

          {/* API Key Input */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notion-api-key">Notion API Key</Label>
              <div className="relative">
                <Input
                  id="notion-api-key"
                  type={showApiKey ? "text" : "password"}
                  value={notionApiKey}
                  onChange={(e) => setNotionApiKey(e.target.value)}
                  placeholder="secret_xxxxxxxxxxxxxxxxxxxxxxxx"
                  className="pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Your API key is stored securely and never shared. Leave empty to disable Notion integration.
              </p>
            </div>

            {/* Setup Instructions */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Info className="h-4 w-4" />
                How to get your Notion API key
              </h3>
              <ol className="text-sm space-y-2 ml-6 list-decimal">
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
                <li>Copy the <strong>Internal Integration Token</strong> (starts with <code className="bg-muted px-1 py-0.5 rounded text-xs">secret_</code>)</li>
                <li>Paste it above and click Save</li>
              </ol>
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  <strong>Remember:</strong> You need to share your Notion database with your integration by opening the database and clicking "Add connections" in the menu.
                </p>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <Button onClick={saveSettings} disabled={saving} className="gap-2">
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </div>
        </Card>

        {/* Additional Settings Placeholder */}
        <Card className="p-6 opacity-50">
          <div className="flex items-start gap-4 mb-6">
            <Bell className="h-5 w-5 text-muted-foreground mt-1" />
            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-1">Notifications</h2>
              <p className="text-sm text-muted-foreground">
                Email notifications and alerts (Coming soon)
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 opacity-50">
          <div className="flex items-start gap-4 mb-6">
            <Shield className="h-5 w-5 text-muted-foreground mt-1" />
            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-1">Security</h2>
              <p className="text-sm text-muted-foreground">
                Password and security settings (Coming soon)
              </p>
            </div>
          </div>
        </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Settings;
