import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { useAuthInterceptor } from "@/lib/auth";

import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Employees from "@/pages/employees";
import Consultants from "@/pages/consultants";
import Trainees from "@/pages/trainees";
import Companies from "@/pages/companies";
import Nonprofits from "@/pages/nonprofits";
import NonprofitCompanies from "@/pages/nonprofit-companies";
import Services from "@/pages/services";
import Projects from "@/pages/projects";
import Users from "@/pages/users";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const token = localStorage.getItem("dama_token");
  if (!token) return <Redirect to="/login" />;
  return <Component />;
}

function Router() {
  const token = localStorage.getItem("dama_token");

  return (
    <Switch>
      <Route path="/">
        <Redirect to="/login" />
      </Route>
      <Route path="/login">
        {token ? <Redirect to="/dashboard" /> : <Login />}
      </Route>
      <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
      <Route path="/employees"><ProtectedRoute component={Employees} /></Route>
      <Route path="/consultants"><ProtectedRoute component={Consultants} /></Route>
      <Route path="/trainees"><ProtectedRoute component={Trainees} /></Route>
      <Route path="/companies"><ProtectedRoute component={Companies} /></Route>
      <Route path="/nonprofits"><ProtectedRoute component={Nonprofits} /></Route>
      <Route path="/nonprofit-companies"><ProtectedRoute component={NonprofitCompanies} /></Route>
      <Route path="/services"><ProtectedRoute component={Services} /></Route>
      <Route path="/projects"><ProtectedRoute component={Projects} /></Route>
      <Route path="/users"><ProtectedRoute component={Users} /></Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useAuthInterceptor();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;