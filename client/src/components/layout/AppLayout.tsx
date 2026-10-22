import { Link, useLocation } from "react-router-dom";
import { BarChart3, Gauge, Languages, Layers, ListOrdered, UserCircle, Users } from "lucide-react";
import type { ReactNode } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/context/session";
import { maskKey } from "@/utils";

const groups = [
  {
    label: "Service Management",
    items: [
      { title: "Account", url: "/account", icon: UserCircle },
      { title: "Plans", url: "/plans", icon: Layers },
      { title: "Users", url: "/users", icon: Users },
      { title: "Consumption", url: "/consumption", icon: Gauge },
      { title: "Records", url: "/records", icon: ListOrdered },
    ],
  },
  {
    label: "Translation Demo",
    items: [{ title: "Translation", url: "/translation", icon: Languages }],
  },
] as const;

export function AppLayout({ children }: { children: ReactNode }) {
  const { pathname: path } = useLocation();
  const { apiKey } = useSession();
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1.5 font-semibold">
            <BarChart3 className="h-5 w-5 shrink-0" />
            <span className="truncate group-data-[collapsible=icon]:hidden">Usage Metering</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          {groups.map((g) => (
            <SidebarGroup key={g.label}>
              <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {g.items.map((i) => (
                    <SidebarMenuItem key={i.url}>
                      <SidebarMenuButton asChild isActive={path === i.url} tooltip={i.title}>
                        <Link to={i.url}>
                          <i.icon className="h-4 w-4" />
                          <span>{i.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background px-4">
          <SidebarTrigger />
          <Badge variant="demo">
            {["/account", "/plans", "/users", "/consumption"].includes(path)
              ? "Backend API"
              : "Demo mode · mock data"}
          </Badge>
          <span className="hidden text-xs text-muted-foreground xl:inline">
            Records and Translation are mocks; real accounts are not shared.
          </span>
          <span className="ml-auto text-xs text-muted-foreground font-mono">
            {apiKey ? `x-api-key: ${maskKey(apiKey)}` : "Not connected"}
          </span>
        </header>
        <main className="mx-auto w-full max-w-5xl p-4 md:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
