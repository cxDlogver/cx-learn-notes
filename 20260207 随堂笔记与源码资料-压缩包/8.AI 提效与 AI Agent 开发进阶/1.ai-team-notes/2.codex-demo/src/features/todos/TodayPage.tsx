import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  BatteryFull,
  CalendarDays,
  Clock3,
  FolderKanban,
  ListTodo,
  Plus,
  Signal,
  Timer,
  Wifi,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { createTodo, getTodoStats, toggleTodo } from "./todoLogic";
import { loadTodos, saveTodos } from "./todoStorage";
import type { Todo } from "./todoTypes";

type Priority = "High" | "Med" | "Low" | "Done";

type TaskMeta = {
  time: string;
  list: string;
  priority: Priority;
};

type TabItem = {
  label: string;
  icon: typeof ListTodo;
  active?: boolean;
};

const DEFAULT_TODOS: Todo[] = [
  createSeedTodo("todo-spec", "Write the product spec", false, 0),
  createSeedTodo("todo-launch-checklist", "Review launch checklist", false, 1),
  createSeedTodo("todo-design-review", "Book design review", false, 2),
  createSeedTodo("todo-invoice-follow-up", "Send invoice follow-up", true, 3),
  createSeedTodo("todo-evening-reset", "Plan evening reset", false, 4),
  createSeedTodo("todo-analytics-events", "Confirm analytics events", false, 5),
  createSeedTodo("todo-roadmap-notes", "Sync roadmap notes", false, 6),
  createSeedTodo("todo-support-reply", "Draft support reply", false, 7),
  createSeedTodo("todo-stale-reminders", "Archive stale reminders", false, 8),
];

const TASK_META_BY_TITLE: Record<string, TaskMeta> = {
  "Write the product spec": {
    time: "9:00 AM",
    list: "Inbox",
    priority: "High",
  },
  "Review launch checklist": {
    time: "10:30 AM",
    list: "Launch",
    priority: "High",
  },
  "Book design review": {
    time: "1:00 PM",
    list: "Team",
    priority: "Med",
  },
  "Send invoice follow-up": {
    time: "Done",
    list: "Admin",
    priority: "Done",
  },
  "Plan evening reset": {
    time: "6:30 PM",
    list: "Personal",
    priority: "Low",
  },
  "Confirm analytics events": {
    time: "2:00 PM",
    list: "Product",
    priority: "Med",
  },
  "Sync roadmap notes": {
    time: "3:30 PM",
    list: "Planning",
    priority: "Low",
  },
  "Draft support reply": {
    time: "4:15 PM",
    list: "Support",
    priority: "Low",
  },
  "Archive stale reminders": {
    time: "5:00 PM",
    list: "Inbox",
    priority: "Low",
  },
};

const TAB_ITEMS: TabItem[] = [
  { label: "Today", icon: ListTodo, active: true },
  { label: "Calendar", icon: CalendarDays },
  { label: "Projects", icon: FolderKanban },
  { label: "Focus", icon: Timer },
];

function createSeedTodo(
  id: string,
  title: string,
  completed: boolean,
  dayOffset: number,
): Todo {
  const timestamp = new Date(Date.UTC(2026, 5, 6, 1 + dayOffset)).toISOString();

  return {
    id,
    title,
    completed,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function loadInitialTodos() {
  const storedTodos = loadTodos(window.localStorage);

  return storedTodos.length > 0 ? storedTodos : DEFAULT_TODOS;
}

function getTaskMeta(todo: Todo): TaskMeta {
  if (todo.completed) {
    return {
      time: "Done",
      list: TASK_META_BY_TITLE[todo.title]?.list ?? "Inbox",
      priority: "Done",
    };
  }

  return (
    TASK_META_BY_TITLE[todo.title] ?? {
      time: "Inbox",
      list: "Inbox",
      priority: "Med",
    }
  );
}

export function TodayPage() {
  const [todos, setTodos] = useState<Todo[]>(loadInitialTodos);
  const [draftTitle, setDraftTitle] = useState("");
  const stats = useMemo(() => getTodoStats(todos), [todos]);
  const dueSoonCount = Math.min(3, stats.active);

  useEffect(() => {
    saveTodos(window.localStorage, todos);
  }, [todos]);

  function handleCapture(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const todo = createTodo(draftTitle);

    if (!todo) {
      return;
    }

    setTodos((currentTodos) => [todo, ...currentTodos]);
    setDraftTitle("");
  }

  return (
    <main className="min-h-screen bg-[var(--today-canvas)] text-[var(--today-foreground-primary)]">
      <section className="mx-auto flex min-h-screen w-full max-w-[390px] flex-col overflow-hidden bg-[var(--today-surface-primary)] shadow-[0_24px_70px_rgba(26,26,26,0.16)] sm:my-8 sm:min-h-[711px] sm:rounded-[20px]">
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <HeroRibbons />
          <StatusBar />
          <div className="relative z-10 min-h-0 flex-1 overflow-y-auto px-[18px] pb-[18px] pt-2">
            <QuickCapture
              draftTitle={draftTitle}
              onDraftTitleChange={setDraftTitle}
              onSubmit={handleCapture}
            />
            <div className="mt-6 grid grid-cols-3 gap-[10px]">
              <StatTile label="Tasks left" value={String(stats.active)} />
              <StatTile label="Due soon" value={String(dueSoonCount)} />
              <StatTile label="Orbit done" value="72%" />
            </div>
            <section className="mt-6 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4">
                <h1 className="font-today-heading text-[22px] font-bold leading-tight">
                  Pinned tasks
                </h1>
                <button
                  type="button"
                  className="flex h-[27px] items-center gap-1.5 rounded-[4px] bg-[var(--today-surface-soft)] px-[10px] py-1.5 font-today-caption text-[11px] font-semibold text-[var(--today-accent-deep)] transition-colors hover:bg-[var(--today-tab-active)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--today-accent-primary)]"
                >
                  <ArrowUpDown aria-hidden="true" className="h-[14px] w-[14px]" />
                  <span>Priority</span>
                </button>
              </div>
              <ul className="flex flex-col gap-[10px]">
                {todos.map((todo) => (
                  <TaskRow
                    key={todo.id}
                    todo={todo}
                    meta={getTaskMeta(todo)}
                    onToggle={() =>
                      setTodos((currentTodos) => toggleTodo(currentTodos, todo.id))
                    }
                  />
                ))}
              </ul>
            </section>
          </div>
          <TabBar />
        </div>
      </section>
    </main>
  );
}

function HeroRibbons() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
      <svg
        className="absolute left-[90px] top-[-76px] h-[270px] w-[380px] blur-[0.6px]"
        viewBox="-40 -60 560 340"
      >
        <defs>
          <linearGradient
            id="today-ribbon-primary"
            x1="85%"
            x2="15%"
            y1="0%"
            y2="100%"
          >
            <stop
              offset="0%"
              stopColor="var(--today-accent-primary)"
              stopOpacity="0.86"
            />
            <stop
              offset="55%"
              stopColor="var(--today-accent-secondary)"
              stopOpacity="0.8"
            />
            <stop
              offset="100%"
              stopColor="var(--today-accent-tertiary)"
              stopOpacity="0.72"
            />
          </linearGradient>
        </defs>
        <path
          d="M24 148c100-130 244-68 326-138 120-102 208 22 108 116-98 92-244-10-326 118-56 88-176 16-108-96z"
          fill="url(#today-ribbon-primary)"
        />
      </svg>
      <svg
        className="absolute left-[170px] top-4 h-[210px] w-[300px]"
        viewBox="-30 -40 460 260"
      >
        <defs>
          <linearGradient
            id="today-ribbon-secondary"
            x1="0%"
            x2="100%"
            y1="0%"
            y2="100%"
          >
            <stop
              offset="0%"
              stopColor="var(--today-accent-tertiary)"
              stopOpacity="0.76"
            />
            <stop
              offset="48%"
              stopColor="var(--today-accent-secondary)"
              stopOpacity="0.8"
            />
            <stop
              offset="100%"
              stopColor="var(--today-accent-primary)"
              stopOpacity="0.67"
            />
          </linearGradient>
        </defs>
        <path
          d="M8 98c76-86 168-68 238-118 90-64 186 38 126 112-66 80-182 6-264 96-62 68-166-8-100-90z"
          fill="url(#today-ribbon-secondary)"
        />
      </svg>
    </div>
  );
}

function StatusBar() {
  return (
    <header className="relative z-10 flex h-[62px] shrink-0 items-center justify-between bg-[var(--today-surface-panel)] px-5 font-today-heading text-[15px] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-sm">
      <span>9:41</span>
      <div className="flex items-center gap-2">
        <Signal aria-hidden="true" className="h-[18px] w-[18px]" />
        <Wifi aria-hidden="true" className="h-[18px] w-[18px]" />
        <BatteryFull aria-hidden="true" className="h-[22px] w-[22px]" />
      </div>
    </header>
  );
}

type QuickCaptureProps = {
  draftTitle: string;
  onDraftTitleChange: (title: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function QuickCapture({
  draftTitle,
  onDraftTitleChange,
  onSubmit,
}: QuickCaptureProps) {
  return (
    <form
      className="relative z-10 flex h-11 items-center gap-[10px] rounded-[8px] bg-[var(--today-foreground-primary)] px-3 text-[var(--today-foreground-inverse)] shadow-[0_8px_20px_rgba(0,0,0,0.12)] focus-within:ring-2 focus-within:ring-[var(--today-accent-primary)]"
      onSubmit={onSubmit}
    >
      <button
        type="submit"
        aria-label="Capture task"
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[var(--today-foreground-inverse)] transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--today-foreground-inverse)]"
      >
        <Plus aria-hidden="true" className="h-5 w-5" />
      </button>
      <input
        aria-label="Capture an inbox task"
        className="h-full min-w-0 flex-1 bg-transparent font-today-body text-[15px] text-[var(--today-foreground-inverse)] outline-none placeholder:text-[var(--today-surface-panel)]"
        placeholder="Capture an inbox task"
        value={draftTitle}
        onChange={(event) => onDraftTitleChange(event.target.value)}
      />
    </form>
  );
}

type StatTileProps = {
  label: string;
  value: string;
};

function StatTile({ label, value }: StatTileProps) {
  return (
    <div className="flex min-h-[73px] flex-col gap-1.5 rounded-[8px] bg-[linear-gradient(135deg,var(--today-accent-primary)_0%,var(--today-accent-secondary)_55%,var(--today-accent-tertiary)_100%)] p-3 text-[var(--today-foreground-inverse)] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <p className="font-today-heading text-2xl font-bold leading-none">
        {value}
      </p>
      <p className="min-w-0 font-today-caption text-[11px] leading-tight text-[rgba(255,255,255,0.85)]">
        {label}
      </p>
    </div>
  );
}

type TaskRowProps = {
  todo: Todo;
  meta: TaskMeta;
  onToggle: () => void;
};

function TaskRow({ todo, meta, onToggle }: TaskRowProps) {
  const chipClassName = getPriorityChipClassName(meta.priority);

  return (
    <li className="flex min-h-[61px] items-center gap-3 rounded-[8px] bg-[var(--today-surface-panel)] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <button
        type="button"
        role="checkbox"
        aria-checked={todo.completed}
        aria-label={todo.completed ? "Mark task active" : "Mark task done"}
        className={cn(
          "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 border-[var(--today-accent-secondary)] bg-[var(--today-surface-primary)] transition-colors hover:border-[var(--today-accent-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--today-accent-primary)]",
          todo.completed &&
            "border-[var(--today-state-done)] bg-[var(--today-state-done)]",
        )}
        onClick={onToggle}
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "break-words font-today-body text-[15px] font-medium leading-tight",
            todo.completed
              ? "text-[var(--today-foreground-secondary)]"
              : "text-[var(--today-foreground-primary)]",
          )}
        >
          {todo.title}
        </p>
        <div className="mt-1 flex min-w-0 items-center gap-1.5 font-today-caption text-[11px] text-[var(--today-foreground-secondary)]">
          <Clock3 aria-hidden="true" className="h-[13px] w-[13px] shrink-0" />
          <span className="truncate">
            {meta.time} · {meta.list}
          </span>
        </div>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-[4px] px-2 py-1 font-today-caption text-[11px] font-semibold leading-none",
          chipClassName,
        )}
      >
        {meta.priority}
      </span>
    </li>
  );
}

function getPriorityChipClassName(priority: Priority) {
  if (priority === "High") {
    return "bg-[var(--today-priority-high-bg)] text-[var(--today-accent-deep)]";
  }

  if (priority === "Med") {
    return "bg-[var(--today-surface-soft)] text-[var(--today-accent-primary)]";
  }

  if (priority === "Done") {
    return "bg-[var(--today-state-done-soft)] text-[var(--today-state-done)]";
  }

  return "bg-[var(--today-priority-low-bg)] text-[var(--today-foreground-secondary)]";
}

function TabBar() {
  return (
    <nav className="relative z-20 shrink-0 bg-[var(--today-surface-primary)] px-4 pb-3">
      <div className="flex h-[62px] items-center gap-1 rounded-[31px] bg-[var(--today-tab-surface)] p-1.5 shadow-[0_6px_18px_rgba(0,0,0,0.08)] backdrop-blur-md">
        {TAB_ITEMS.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              type="button"
              className={cn(
                "flex h-full flex-1 flex-col items-center justify-center gap-0.5 rounded-[25px] font-today-caption text-[10px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--today-accent-primary)]",
                item.active
                  ? "bg-[var(--today-tab-active)] text-[var(--today-accent-primary)]"
                  : "text-[var(--today-foreground-secondary)] hover:bg-[var(--today-surface-soft)]",
              )}
            >
              <Icon aria-hidden="true" className="h-[21px] w-[21px]" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
