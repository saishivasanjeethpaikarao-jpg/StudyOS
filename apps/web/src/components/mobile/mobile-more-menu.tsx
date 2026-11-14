import * as React from "react";
import { Link } from "@tanstack/react-router";
import {
  Inbox,
  User,
  Lock,
  Palette,
  ListTodo,
  Repeat,
  CalendarDays,
  Bell,
  Key,
  Terminal,
  LogOut,
  ChevronRight,
  Search,
  Smartphone,
  Lightbulb,
  Play,
  FileText,
  BookOpen,
  CheckSquare,
  GraduationCap,
  ClipboardList,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useSearch } from "@/hooks/useSearch";
import { useAiAssistant } from "@/hooks/useAiAssistant";
import { isRunningInstalled } from "@/lib/pwa";
import { InstallAppSheet } from "@/components/pwa/install-app-sheet";

interface MenuItem {
  id: string;
  icon: React.ElementType;
  label: string;
  badge?: string;
  href?: string;
  onClick?: () => void;
  destructive?: boolean;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

interface MobileMoreMenuProps {
  onLogout?: () => void;
}

interface MenuItemComponentProps {
  item: MenuItem;
}

function MenuItemComponent({ item }: MenuItemComponentProps) {
  const Icon = item.icon;

  const content = (
    <>
      <div className="flex items-center gap-3">
        <Icon
          className={cn(
            "h-5 w-5",
            item.destructive
              ? "text-destructive"
              : item.id === "focustube"
              ? "text-red-500"
              : item.id === "assistant"
              ? "text-amber-500"
              : "text-muted-foreground"
          )}
        />
        <span
          className={cn(
            "text-[15px] font-medium",
            item.destructive && "text-destructive"
          )}
        >
          {item.label}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {item.badge && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            {item.badge}
          </span>
        )}
        {!item.destructive && (
          <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
        )}
      </div>
    </>
  );

  const className = cn(
    "flex w-full items-center justify-between px-4 py-3.5",
    "min-h-[50px]",
    "transition-colors",
    "active:bg-accent/50",
    "hover:bg-accent/30"
  );

  if (item.href) {
    return (
      <Link to={item.href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={item.onClick} className={className}>
      {content}
    </button>
  );
}

interface MenuSectionComponentProps {
  section: MenuSection;
  isLast?: boolean;
}

function MenuSectionComponent({ section, isLast }: MenuSectionComponentProps) {
  return (
    <div className="mb-4">
      {section.title && (
        <div className="px-4 py-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {section.title}
          </h3>
        </div>
      )}

      <div className="bg-card rounded-xl mx-3 overflow-hidden border border-border/50 shadow-sm">
        {section.items.map((item, index) => (
          <React.Fragment key={item.id}>
            <MenuItemComponent item={item} />
            {index < section.items.length - 1 && (
              <div className="mx-4 border-b border-border/40" />
            )}
          </React.Fragment>
        ))}
      </div>

      {!isLast && (
        <div className="mx-6 mt-4 border-t border-dashed border-border/40" />
      )}
    </div>
  );
}

export function MobileMoreMenu({ onLogout }: MobileMoreMenuProps) {
  const { logout } = useAuth();
  const { openSearch } = useSearch();
  const { openAssistant } = useAiAssistant();
  const [installOpen, setInstallOpen] = React.useState(false);
  const showInstall = React.useMemo(() => !isRunningInstalled(), []);

  const handleLogout = React.useCallback(() => {
    logout();
    onLogout?.();
  }, [logout, onLogout]);

  const menuSections: MenuSection[] = React.useMemo(
    () => [
      {
        title: "AI Study Assistant",
        items: [
          {
            id: "assistant",
            icon: Sparkles,
            label: "Ask AI Learning Assistant",
            badge: "Grounded",
            onClick: openAssistant,
          },
        ],
      },
      {
        title: "Academics & Study Suite",
        items: [
          {
            id: "focustube",
            icon: Play,
            label: "FocusTube",
            badge: "Videos",
            href: "/app/focustube",
          },
          {
            id: "notes",
            icon: FileText,
            label: "Lecture Notes",
            href: "/app/notes",
          },
          {
            id: "resources",
            icon: BookOpen,
            label: "Course Resources & Files",
            href: "/app/resources",
          },
          {
            id: "quizzes",
            icon: CheckSquare,
            label: "Knowledge Checks & Quizzes",
            href: "/app/quizzes",
          },
          {
            id: "assignments",
            icon: ClipboardList,
            label: "Assignments & Deadlines",
            href: "/app/assignments",
          },
          {
            id: "subjects",
            icon: GraduationCap,
            label: "Subjects & Syllabi",
            href: "/app/subjects",
          },
        ],
      },
      {
        title: "Time, Tasks & Native Alarms",
        items: [
          {
            id: "reminders",
            icon: Bell,
            label: "Reminders & Clock Alarms",
            badge: "Native",
            href: "/app/reminders",
          },
          {
            id: "calendar",
            icon: CalendarDays,
            label: "Weekly Planner & Calendar",
            href: "/app/calendar",
          },
          {
            id: "tasks-list",
            icon: ListTodo,
            label: "All Tasks & Board",
            href: "/app/tasks",
          },
          {
            id: "routines",
            icon: Repeat,
            label: "Daily Routines",
            href: "/app/routines",
          },
          {
            id: "ideas",
            icon: Lightbulb,
            label: "Quick Ideas",
            href: "/app/ideas",
          },
          {
            id: "search",
            icon: Search,
            label: "Global Search",
            onClick: openSearch,
          },
          {
            id: "backlog",
            icon: Inbox,
            label: "Backlog",
            href: "/app/tasks?backlog=1",
          },
          ...(showInstall
            ? [
                {
                  id: "install",
                  icon: Smartphone,
                  label: "Add to Home Screen",
                  onClick: () => setInstallOpen(true),
                },
              ]
            : []),
        ],
      },
      {
        title: "Settings",
        items: [
          {
            id: "profile",
            icon: User,
            label: "Profile",
            href: "/app/settings?tab=profile",
          },
          {
            id: "notifications",
            icon: Bell,
            label: "Notification Settings",
            href: "/app/settings?tab=notifications",
          },
          {
            id: "appearance",
            icon: Palette,
            label: "Appearance & Themes",
            href: "/app/settings?tab=appearance",
          },
          {
            id: "tasks",
            icon: ListTodo,
            label: "Task Defaults",
            href: "/app/settings?tab=tasks",
          },
          {
            id: "calendars",
            icon: CalendarDays,
            label: "Connected Calendars",
            href: "/app/settings?tab=calendars",
          },
          {
            id: "security",
            icon: Lock,
            label: "Security & Passwords",
            href: "/app/settings?tab=security",
          },
          {
            id: "mcp",
            icon: Terminal,
            label: "MCP & Telegram Agent",
            href: "/app/settings?tab=mcp",
          },
          {
            id: "api",
            icon: Key,
            label: "API Keys",
            href: "/app/settings?tab=api",
          },
        ],
      },
      {
        title: "Account",
        items: [
          {
            id: "logout",
            icon: LogOut,
            label: "Log out",
            onClick: handleLogout,
            destructive: true,
          },
        ],
      },
    ],
    [handleLogout, openSearch, openAssistant, showInstall]
  );

  return (
    <div
      className="min-h-full pb-20 pt-4"
      style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="px-4 pb-4">
        <h1 className="text-2xl font-bold tracking-tight">More Features</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Academics, FocusTube, Native Alarms & Settings
        </p>
      </div>

      {menuSections.map((section, index) => (
        <MenuSectionComponent
          key={section.title || index}
          section={section}
          isLast={index === menuSections.length - 1}
        />
      ))}

      {showInstall && (
        <InstallAppSheet open={installOpen} onOpenChange={setInstallOpen} />
      )}
    </div>
  );
}
