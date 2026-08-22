import { usePageMeta } from "@/lib/pageMeta";
import { Route, Switch } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import Overview from "./dashboard/Overview";
import Migrate from "./dashboard/Migrate";
import Analytics from "./dashboard/Analytics";
import History from "./dashboard/History";

export default function Dashboard() {
  usePageMeta("Dashboard", "Live state of the Policy Registry and Teleport on Arbitrum Sepolia: routes, policy checks and the record of what the protocol allowed and refused.");

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
