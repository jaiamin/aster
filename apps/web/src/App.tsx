import { ErrorBoundary } from "@/components/error-boundary";
import { AppShell } from "@/components/shell/app-shell";
import { ModuleProvider } from "@/modules/module-context";

export default function App() {
  return (
    <ErrorBoundary>
      <ModuleProvider>
        <AppShell />
      </ModuleProvider>
    </ErrorBoundary>
  );
}
