import { Route, Switch } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import Overview from "./dashboard/Overview";
import Migrate from "./dashboard/Migrate";
import Analytics from "./dashboard/Analytics";
import History from "./dashboard/History";

export default function Dashboard() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/dashboard" component={Overview} />
        <Route path="/dashboard/migrate" component={Migrate} />
        <Route path="/dashboard/analytics" component={Analytics} />
        <Route path="/dashboard/history" component={History} />
      </Switch>
    </DashboardLayout>
  );
}
