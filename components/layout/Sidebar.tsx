import Link from "next/link";
import {
  CheckCircle2,
  ClipboardList,
  FileText,
  GraduationCap,
  Home,
  Inbox,
  ScrollText,
  Settings,
  Users,
} from "lucide-react";

import { UserMenu } from "./UserMenu";
import { cn } from "@/lib/utils/cn";

interface SidebarItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ITEMS: ReadonlyArray<SidebarItem> = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/leads", label: "Leads", icon: Inbox },
  { href: "/parents", label: "Parents", icon: Users },
  { href: "/students", label: "Students", icon: GraduationCap },
  { href: "/tutors", label: "Tutors", icon: Users },
  { href: "/sessions", label: "Sessions", icon: ClipboardList },
  { href: "/approvals", label: "Approvals", icon: CheckCircle2 },
  { href: "/agent-runs", label: "Agent runs", icon: FileText },
  { href: "/audit-log", label: "Audit log", icon: ScrollText },
  { href: "/automation-settings", label: "Automation", icon: Settings },
];

export function Sidebar({ active }: { active?: string }) {
  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r bg-muted/30 md:flex">
      <div className="flex h-14 items-center border-b px-4 text-sm font-semibold">
        TutorOS AI
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {ITEMS.map((item) => {
          const isActive =
            active === item.href ||
            (item.href !== "/" && active?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <UserMenu />
    </aside>
  );
}
