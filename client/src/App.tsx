import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import FindStation from "./pages/FindStation";
import StationDetail from "./pages/StationDetail";
import Admin from "./pages/Admin";
import HealthDashboard from "./pages/HealthDashboard";
import Profile from "./pages/Profile";
import AiPlan from "./pages/AiPlan";

import MyBookings from "./pages/MyBookings";
import FindExperts from "./pages/FindExperts";
import ExpertInbox from "./pages/ExpertInbox";
import ExpertRegistration from "./pages/ExpertRegistration";
import Login from "./pages/Login";
import KioskLogin from "./pages/KioskLogin";
import MachineSimulator from "./pages/MachineSimulator";
import KioskQR from "./pages/KioskQR";
import EventTeam from "./pages/EventTeam";
import EventCareAdmin from "./pages/EventCareAdmin";
import Events from "./pages/Events";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import { shouldShowInstallPrompt } from "./lib/appRoute";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"\\"} component={Home} />
      <Route path={"/find-station"} component={FindStation} />
      <Route path={"/station/:id"} component={StationDetail} />
      <Route path={"/admin"} component={Admin} />
      <Route path={"/health"} component={HealthDashboard} />
      <Route path={"/profile"} component={Profile} />
      <Route path={"/ai-plan"} component={AiPlan} />
      <Route path={"/my-bookings"} component={MyBookings} />
      <Route path={"/experts"} component={FindExperts} />
      <Route path={"/expert-inbox"} component={ExpertInbox} />
      <Route path={"/expert-registration"} component={ExpertRegistration} />
      <Route path={"/login"} component={Login} />
      <Route path={"/kiosk-login"} component={KioskLogin} />
      <Route path={"/machine-simulator"} component={MachineSimulator} />
      <Route path={"/kiosk-qr"} component={KioskQR} />
      <Route path={"/events/team"} component={EventTeam} />
      <Route path={"/events/care-admin"} component={EventCareAdmin} />
      <Route path={"/events"} component={Events} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  const [location] = useLocation();
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
          {shouldShowInstallPrompt(location) && <PWAInstallPrompt />}
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
