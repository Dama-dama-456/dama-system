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
import Services from "@/pages/services";
import Projects from "@/pages/projects";
import Users from "@/pages/users";

const queryClient = new QueryClient();

function Router() {
  const token = localStorage.getItem("dama_token");

  return (
    <Switch>
      <Route path="/">
        <Redirect to="/login" />
      </Route>
      <Route path="/login" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/employees" component={Employees} />
      <Route path="/consultants" component={Consultants} />
      <Route path="/trainees" component={Trainees} />
      <Route path="/companies" component={Companies} />
      <Route path="/nonprofits" component={Nonprofits} />
      <Route path="/services" component={Services} />
      <Route path="/projects" component={Projects} />
      <Route path="/users" component={Users} />
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
