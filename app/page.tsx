import { TakStatusCard } from "@/components/dashboard/tak-status-card";
import { EnablementsStatusList } from "@/components/dashboard/enablements-status-list";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        {/* <p className="mt-1 text-sm text-muted-foreground">
          Live system status — updates every 2 seconds.
        </p> */}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <TakStatusCard />
      </div>

      <EnablementsStatusList />
    </div>
  );
}
