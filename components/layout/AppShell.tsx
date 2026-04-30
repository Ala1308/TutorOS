import { Sidebar } from "./Sidebar";

interface AppShellProps {
  children: React.ReactNode;
  active?: string;
}

export function AppShell({ children, active }: AppShellProps) {
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar {...(active ? { active } : {})} />
      <main className="flex-1 overflow-x-auto">
        <div className="mx-auto w-full max-w-screen-2xl">{children}</div>
      </main>
    </div>
  );
}
