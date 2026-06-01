import React from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { usePermission } from "@/hooks/usePermission";
import { AccessDenied } from "@/components/AccessDenied";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Reports from "@/pages/reports";
import Clients from "@/pages/clients";
import OnlinePayments from "@/pages/online-payments";
import Billing from "@/pages/billing";
import ClientProfile from "@/pages/client-profile";
import AddClient from "@/pages/add-client";
import Users from "@/pages/users";
import Roles from "@/pages/roles";
import Zones from "@/pages/zones";
import Packages from "@/pages/packages";
import Settings from "@/pages/settings";
import Employee from "@/pages/employee";
import Departments from "@/pages/departments";
import NetworkPage from "@/pages/network";
import Support from "@/pages/support";
import { Layout } from "@/components/Layout";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
      <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      <div className="text-slate-400 font-mono text-sm">Loading session...</div>
    </div>
  );
}

function ProtectedRoute({
  component: Component,
  title,
  permission,
}: {
  component: React.ComponentType<any>;
  title: string;
  permission?: string;
}) {
  const { user, isLoading } = useAuth();
  const { can } = usePermission();

  if (isLoading) return <LoadingScreen />;
  if (!user) return <Login />;

  if (permission && !can(permission)) {
    return (
      <Layout title={title}>
        <AccessDenied />
      </Layout>
    );
  }

  return (
    <Layout title={title}>
      <Component />
    </Layout>
  );
}

function RootRedirect() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();

  React.useEffect(() => {
    if (!isLoading) {
      setLocation(user ? "/dashboard" : "/login");
    }
  }, [isLoading, user, setLocation]);

  return <div className="min-h-screen bg-slate-950" />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={RootRedirect} />
      <Route path="/login" component={Login} />
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} title="Dashboard" />
      </Route>
      <Route path="/clients/new">
        <ProtectedRoute component={AddClient} title="Add Client" permission="clients.create" />
      </Route>
      <Route path="/clients/:id">
        <ProtectedRoute component={ClientProfile} title="Client Profile" permission="clients.view" />
      </Route>
      <Route path="/clients">
        <ProtectedRoute component={Clients} title="Clients" permission="clients.view" />
      </Route>
      <Route path="/online-payments">
        <ProtectedRoute component={OnlinePayments} title="Online Payments" permission="payments.view" />
      </Route>
      <Route path="/reports">
        <ProtectedRoute component={Reports} title="Reports" permission="reports.view" />
      </Route>
      <Route path="/billing">
        <ProtectedRoute component={Billing} title="Billing" permission="billing.view" />
      </Route>
      <Route path="/users">
        <ProtectedRoute component={Users} title="Users" permission="users.view" />
      </Route>
      <Route path="/roles">
        <ProtectedRoute component={Roles} title="Roles & Permissions" permission="roles.view" />
      </Route>
      <Route path="/zones">
        <ProtectedRoute component={Zones} title="Zones" permission="zones.view" />
      </Route>
      <Route path="/packages">
        <ProtectedRoute component={Packages} title="Packages" permission="packages.view" />
      </Route>
      <Route path="/settings">
        <ProtectedRoute component={Settings} title="Settings" permission="settings.view" />
      </Route>
      <Route path="/network">
        <ProtectedRoute component={NetworkPage} title="Network" />
      </Route>
      <Route path="/employee">
        <ProtectedRoute component={Employee} title="Employee" />
      </Route>
      <Route path="/departments">
        <ProtectedRoute component={Departments} title="Departments" />
      </Route>
      <Route path="/support">
        <ProtectedRoute component={Support} title="Support & Ticket" />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
