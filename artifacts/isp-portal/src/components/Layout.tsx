import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { usePermission } from "@/hooks/usePermission";
import { 
  LayoutDashboard, BarChart3, Users, CreditCard, FileText, TrendingDown, Store, Receipt, Wallet, 
  Package, UserPlus, Clock, Network, UserCog, MessageSquare, BarChart2, Wifi, 
  MapPin, Layers, Banknote, UserCheck, ShieldCheck, HeadphonesIcon, Server, 
  RefreshCw, LogIn, Settings, Search, ChevronRight, Menu, LogOut, ChevronDown,
  KeyRound
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: ReactNode;
  title: string;
}

type MenuItem = {
  icon: React.ElementType;
  label: string;
  href: string;
  permission?: string;
};

const MENU_ITEMS: MenuItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: BarChart3, label: "Reports", href: "/reports", permission: "reports.view" },
  { icon: Users, label: "Clients", href: "/clients", permission: "clients.view" },
  { icon: CreditCard, label: "Online Payments", href: "/online-payments", permission: "payments.view" },
  { icon: FileText, label: "Billing", href: "/billing", permission: "billing.view" },
  { icon: TrendingDown, label: "Expense", href: "#" },
  { icon: Store, label: "Mac Reseller", href: "#" },
  { icon: Receipt, label: "Vendor Bills", href: "#" },
  { icon: Wallet, label: "Others Bill", href: "#" },
  { icon: Package, label: "Store", href: "#" },
  { icon: UserPlus, label: "New Signup", href: "#" },
  { icon: Clock, label: "Upcoming", href: "#" },
  { icon: Network, label: "Network Diagram", href: "#" },
  { icon: UserCog, label: "Agent", href: "#" },
  { icon: MessageSquare, label: "SMS", href: "#" },
  { icon: BarChart2, label: "Graph Report", href: "#" },
  { icon: Wifi, label: "Network", href: "/network" },
  { icon: MapPin, label: "Zone", href: "/zones", permission: "zones.view" },
  { icon: Layers, label: "Packages", href: "/packages", permission: "packages.view" },
  { icon: Banknote, label: "Salary", href: "#" },
  { icon: UserCheck, label: "Employee", href: "/employee" },
  { icon: ShieldCheck, label: "Users", href: "/users", permission: "users.view" },
  { icon: KeyRound, label: "Roles", href: "/roles", permission: "roles.view" },
  { icon: HeadphonesIcon, label: "Support & Ticket", href: "/support" },
  { icon: Server, label: "Servers", href: "#" },
  { icon: RefreshCw, label: "Package Change", href: "#" },
  { icon: LogIn, label: "User Login Report", href: "#" },
  { icon: Settings, label: "Settings", href: "/settings", permission: "settings.view" },
];

export function Layout({ children, title }: LayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { can, isSuperAdmin } = usePermission();

  if (!user) return null;

  const visibleItems = MENU_ITEMS.filter((item) => {
    if (!item.permission) return true;
    return can(item.permission);
  });

  return (
    <div className="flex h-[100dvh] w-full bg-slate-50 overflow-hidden text-slate-800">
      {/* Sidebar */}
      <aside className="w-[220px] bg-white border-r border-slate-200 flex flex-col shrink-0 hidden md:flex">
        <div className="h-12 px-4 flex items-center border-b border-slate-200 shrink-0">
          <Server className="w-5 h-5 text-sky-500 mr-2" />
          <span className="font-bold text-slate-900 tracking-tight">ISP Manager Pro</span>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          <nav className="space-y-0.5 px-2">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-sky-50 text-sky-600"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-200 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <Avatar className="w-8 h-8 rounded-md bg-slate-100">
                <AvatarFallback className="text-xs bg-slate-100 text-slate-600 rounded-md">
                  {user.fullName?.charAt(0) || user.username?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="truncate">
                <p className="text-sm font-medium text-slate-800 truncate">{user.username}</p>
                <p className="text-xs text-slate-400 truncate">
                  {isSuperAdmin ? "Super Admin" : user.role?.name || "Staff"}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-slate-900 hover:bg-slate-100 shrink-0"
              onClick={logout}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <Button variant="ghost" size="icon" className="md:hidden h-8 w-8 text-slate-500">
              <Menu className="w-4 h-4" />
            </Button>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400 font-medium hidden sm:inline-block">Portal</span>
              <ChevronRight className="w-4 h-4 text-slate-300 hidden sm:inline-block" />
              <span className="font-semibold text-slate-800">{title}</span>
            </div>

            <div className="max-w-md w-full ml-4 hidden md:flex items-center relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3" />
              <Input
                placeholder="Search clients, bills, IPs..."
                className="w-full h-8 bg-slate-50 border-slate-200 pl-9 text-xs focus-visible:ring-1 focus-visible:ring-sky-500 text-slate-700 placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 gap-2 px-2 hover:bg-slate-100">
                  <Avatar className="w-6 h-6 rounded bg-slate-100">
                    <AvatarFallback className="text-[10px] bg-sky-100 text-sky-700 rounded">
                      {user.fullName?.charAt(0) || user.username?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-slate-700 hidden sm:inline-block">
                    {user.fullName || user.username}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white border-slate-200 text-slate-800">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-slate-900">{user.fullName}</p>
                    <p className="text-xs leading-none text-slate-400">{user.email}</p>
                    {isSuperAdmin && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-purple-600 font-medium mt-1">
                        <ShieldCheck className="w-3 h-3" /> Super Admin
                      </span>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-200" />
                <DropdownMenuItem
                  className="focus:bg-slate-100 focus:text-slate-900 cursor-pointer"
                  onClick={() => logout()}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
