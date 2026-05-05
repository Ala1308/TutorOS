import Link from "next/link";

import { UserMenu } from "./UserMenu";
import {
  BookOpen,
  Bot,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Cloud,
  FileText,
  GraduationCap,
  Home,
  Inbox,
  Library,
  MessageSquare,
  Notebook,
  Receipt,
  ScrollText,
  Settings,
  Users,
} from "lucide-react";
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
  {
    href: "/academics/assessments",
    label: "Assessments",
    icon: ClipboardCheck,
  },
  { href: "/academics/homework", label: "Homework", icon: Notebook },
  {
    href: "/academics/learning-plans",
    label: "Learning plans",
    icon: BookOpen,
  },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  {
    href: "/communications",
    label: "Communications",
    icon: MessageSquare,
  },
  { href: "/approvals", label: "Approvals", icon: CheckCircle2 },
  { href: "/agent-runs", label: "Agent runs", icon: FileText },
  { href: "/audit-log", label: "Audit log", icon: ScrollText },
  { href: "/automation-settings", label: "Automation", icon: Settings },
  { href: "/settings/organization", label: "Organization", icon: Building2 },
  { href: "/settings/agents", label: "Agents", icon: Bot },
  { href: "/settings/knowledge", label: "Knowledge", icon: Library },
  {
    href: "/settings/integrations/google",
    label: "Google",
    icon: Cloud,
  },
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
