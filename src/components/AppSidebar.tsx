import { useState } from "react";
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  ShoppingCart,
  File,
  User,
  Building2,
  Users,
  Contact,
  Receipt,
  HelpCircle,
  FolderPlus,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AppSidebarProps {
  user?: any;
}

export function AppSidebar({ user }: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [openSections, setOpenSections] = useState({
    management: false,
    reports: false,
    sales: false,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
  };

  return (
    <Sidebar className={collapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarHeader className="border-b border-border/50 p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
            <FileText className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                    {user?.email?.substring(0, 2).toUpperCase() || "HD"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user?.email?.split("@")[0] || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground">Sales Manager</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    isActive
                      ? "bg-primary text-primary-foreground font-medium"
                      : "hover:bg-muted"
                  }
                >
                  <LayoutDashboard className="h-4 w-4" />
                  {!collapsed && <span>Dashboard</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <Collapsible
              open={openSections.management}
              onOpenChange={() => toggleSection("management")}
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton>
                    <FileText className="h-4 w-4" />
                    {!collapsed && (
                      <>
                        <span className="flex-1">Document Management</span>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            openSections.management ? "rotate-180" : ""
                          }`}
                        />
                      </>
                    )}
                  </SidebarMenuButton>
                </CollapsibleTrigger>
              </SidebarMenuItem>
              {!collapsed && (
                <CollapsibleContent className="pl-6 space-y-1">
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink to="/document-detail" className="text-sm">
                        Document Detail
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </CollapsibleContent>
              )}
            </Collapsible>

            <Collapsible
              open={openSections.reports}
              onOpenChange={() => toggleSection("reports")}
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton>
                    <BarChart3 className="h-4 w-4" />
                    {!collapsed && (
                      <>
                        <span className="flex-1">Document Reports</span>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            openSections.reports ? "rotate-180" : ""
                          }`}
                        />
                      </>
                    )}
                  </SidebarMenuButton>
                </CollapsibleTrigger>
              </SidebarMenuItem>
            </Collapsible>

            <Collapsible
              open={openSections.sales}
              onOpenChange={() => toggleSection("sales")}
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton>
                    <ShoppingCart className="h-4 w-4" />
                    {!collapsed && (
                      <>
                        <span className="flex-1">Sales Documents</span>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            openSections.sales ? "rotate-180" : ""
                          }`}
                        />
                      </>
                    )}
                  </SidebarMenuButton>
                </CollapsibleTrigger>
              </SidebarMenuItem>
            </Collapsible>

            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink to="/personal" className="hover:bg-muted">
                  <File className="h-4 w-4" />
                  {!collapsed && <span>Personal Documents</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink to="/supplier" className="hover:bg-muted">
                  <Building2 className="h-4 w-4" />
                  {!collapsed && <span>Supplier Documents</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink to="/user" className="hover:bg-muted">
                  <User className="h-4 w-4" />
                  {!collapsed && <span>User Documents</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink to="/customer" className="hover:bg-muted">
                  <Users className="h-4 w-4" />
                  {!collapsed && <span>Customer Documents</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink to="/contacts" className="hover:bg-muted">
                  <Contact className="h-4 w-4" />
                  {!collapsed && <span>Contacts</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink to="/receipts" className="hover:bg-muted">
                  <Receipt className="h-4 w-4" />
                  {!collapsed && <span>Receipts</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <button className="w-full hover:bg-muted">
                <HelpCircle className="h-4 w-4" />
                {!collapsed && <span>Support / Help</span>}
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <button className="w-full hover:bg-muted">
                <FolderPlus className="h-4 w-4" />
                {!collapsed && <span>Add New Folder</span>}
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <button
                onClick={handleSignOut}
                className="w-full hover:bg-destructive/10 text-destructive"
              >
                <LogOut className="h-4 w-4" />
                {!collapsed && <span>Sign Out</span>}
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
