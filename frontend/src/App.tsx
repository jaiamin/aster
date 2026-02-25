import { AppShell } from "@/components/shell/app-shell";
import { ModuleProvider } from "@/modules/module-context";

export default function App() {
  return (
    <ModuleProvider>
      <AppShell />
    </ModuleProvider>
  );
}
