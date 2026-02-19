import { TakConfigForm } from "@/components/settings/tak-config-form";

export default function TakSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">TAK Server Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure the connection to your TAK server, including TLS certificates and
          queue settings.
        </p>
      </div>

      <div className="max-w-xl">
        <TakConfigForm />
      </div>
    </div>
  );
}
