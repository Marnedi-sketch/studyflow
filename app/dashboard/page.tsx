
"use client";
 
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  Coffee,
  Flame,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search,
  Target,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import TasksPage from "../tasks/page";
type StudyTask = {
  id: string;
  user_id: string;
  title: string;
  subject: string;
  priority: "low" | "medium" | "high";
  due_date: string | null;
  estimated_minutes: number;
  completed: boolean;
  created_at: string;
};
 
type NewTask = {
  title: string;
  subject: string;
  priority: "low" | "medium" | "high";
  due_date: string;
  estimated_minutes: number;
};
 
type TimerMode = "focus" | "break";
 
const emptyTask: NewTask = {
  title: "",
  subject: "",
  priority: "medium",
  due_date: "",
  estimated_minutes: 30,
};
 
const priorityStyles = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-amber-50 text-amber-700",
  high: "bg-rose-50 text-rose-600",
};
 
function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
 
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
 
  return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
}
 
function formatDate(date: string | null) {
  if (!date) return "No deadline";
 
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}
 
// Date helpers take the date as an argument (null until the client mounts)
// so server prerendering and the first client render always match.
function getGreeting(date: Date | null) {
  if (!date) return "";
 
  const hour = date.getHours();
 
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
 
function getTodayLabel(date: Date | null) {
  if (!date) return "";
 
  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
 
function getLocalDate(date: Date | null) {
  if (!date) return "";
 
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
 
export default function Home() {
  const router = useRouter();
 
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [userName, setUserName] = useState("Student");
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
 
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTask, setNewTask] = useState<NewTask>(emptyTask);
  const [searchText, setSearchText] = useState("");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "tasks">(
    "dashboard"
  );
 
  // Customizable Focus Room settings.
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [timerMode, setTimerMode] = useState<TimerMode>("focus");
  const [seconds, setSeconds] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
 
  // Set only on the client, after mount, to avoid prerender/hydration issues.
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
 
  useEffect(() => {
    setCurrentDate(new Date());
  }, []);
 
  const selectedMinutes = timerMode === "focus" ? focusMinutes : breakMinutes;
 
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setPageError("");
 
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
 
      if (userError) throw userError;
 
      if (!user) {
        router.replace("/auth");
        return;
      }
 
      setUserEmail(user.email ?? "");
 
      const metadataName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "Student";
 
      setUserName(
        String(metadataName)
          .split(" ")
          .map((part: string) =>
            part ? part[0].toUpperCase() + part.slice(1) : ""
          )
          .join(" ")
      );
 
      const { data, error } = await supabase
        .from("tasks")
        .select(
          "id, user_id, title, subject, priority, due_date, estimated_minutes, completed, created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
 
      if (error) throw error;
 
      setTasks((data ?? []) as StudyTask[]);
    } catch (error) {
      console.error("Dashboard loading error:", error);
      setPageError(
        error instanceof Error
          ? error.message
          : "Could not load your dashboard. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);
 
  useEffect(() => {
    if (activeTab === "dashboard") {
      void loadDashboard();
    }
  }, [activeTab, loadDashboard]);
 
  // Countdown: stops at zero and notifies you when the session ends.
  useEffect(() => {
    if (!timerRunning) return;
 
    const interval = window.setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          setTimerRunning(false);
 
          if (timerMode === "focus") {
            setCompletedSessions((count) => count + 1);
            setNotice("Focus session completed! Take a short break.");
          } else {
            setNotice("Break completed! Ready for another focus session?");
          }
 
          return 0;
        }
 
        return current - 1;
      });
    }, 1000);
 
    return () => window.clearInterval(interval);
  }, [timerRunning, timerMode]);
 
  const completedTasks = useMemo(
    () => tasks.filter((task) => task.completed),
    [tasks]
  );
 
  const pendingTasks = useMemo(
    () => tasks.filter((task) => !task.completed),
    [tasks]
  );
 
  const completionPercent =
    tasks.length > 0
      ? Math.round((completedTasks.length / tasks.length) * 100)
      : 0;
 
  const estimatedCompletedMinutes = completedTasks.reduce(
    (total, task) => total + (task.estimated_minutes || 0),
    0
  );
 
  const overdueCount = pendingTasks.filter(
    (task) =>
      currentDate !== null &&
      task.due_date !== null &&
      task.due_date < getLocalDate(currentDate)
  ).length;
 
  const visibleTasks = useMemo(() => {
    const query = searchText.trim().toLowerCase();
 
    return [...pendingTasks]
      .filter(
        (task) =>
          !query ||
          task.title.toLowerCase().includes(query) ||
          task.subject.toLowerCase().includes(query)
      )
      .sort((a, b) => {
        const aDate = a.due_date || "9999-12-31";
        const bDate = b.due_date || "9999-12-31";
        return aDate.localeCompare(bDate);
      })
      .slice(0, 5);
  }, [pendingTasks, searchText]);
 
  const weeklyActivity = useMemo(() => {
    if (!currentDate) return [];
 
    const today = currentDate;
    const days: { label: string; count: number; date: string }[] = [];
 
    for (let offset = 6; offset >= 0; offset--) {
      const day = new Date(today);
      day.setDate(today.getDate() - offset);
 
      const date = getLocalDate(day);
 
      const count = tasks.filter((task) => {
        const createdDate = new Date(task.created_at);
 
        return (
          createdDate.getFullYear() === day.getFullYear() &&
          createdDate.getMonth() === day.getMonth() &&
          createdDate.getDate() === day.getDate()
        );
      }).length;
 
      days.push({
        label: day.toLocaleDateString("en-IN", { weekday: "short" }),
        count,
        date,
      });
    }
 
    return days;
  }, [tasks, currentDate]);
 
  const maxWeeklyCount = Math.max(
    1,
    ...weeklyActivity.map((day) => day.count)
  );
 
  const timerDisplay = `${String(Math.floor(seconds / 60)).padStart(
    2,
    "0"
  )}:${String(seconds % 60).padStart(2, "0")}`;
 
  function scrollToSection(id: string) {
    setShowMobileMenu(false);
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  }
 
  function openCreateTaskForm() {
    setShowAddForm(true);
    setPageError("");
    setTimeout(() => {
      const el = document.getElementById("create-task-form");
      if (el) {
        el.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        const input = el.querySelector<HTMLInputElement>("input[required]");
        input?.focus();
      }
    }, 50);
  }
 
  async function handleAddTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setPageError("");
 
    const title = newTask.title.trim();
    const subject = newTask.subject.trim();
 
    if (!title || !subject) {
      setPageError("Please enter both a task title and a subject.");
      return;
    }
 
    if (
      !Number.isFinite(newTask.estimated_minutes) ||
      newTask.estimated_minutes <= 0
    ) {
      setPageError("Estimated minutes must be greater than zero.");
      return;
    }
 
    setSaving(true);
 
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
 
      if (userError) throw userError;
 
      if (!user) {
        router.replace("/auth");
        return;
      }
 
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          user_id: user.id,
          title,
          subject,
          priority: newTask.priority,
          due_date: newTask.due_date || null,
          estimated_minutes: newTask.estimated_minutes,
          completed: false,
        })
        .select(
          "id, user_id, title, subject, priority, due_date, estimated_minutes, completed, created_at"
        )
        .single();
 
      if (error) throw error;
 
      setTasks((current) => [data as StudyTask, ...current]);
      setNewTask(emptyTask);
      setShowAddForm(false);
      setNotice("Task added successfully.");
    } catch (error) {
      console.error("Adding task failed:", error);
      setPageError(
        error instanceof Error ? error.message : "Could not add this task."
      );
    } finally {
      setSaving(false);
    }
  }
 
  async function handleToggleTask(task: StudyTask) {
    setPageError("");
    setNotice("");
 
    const nextCompleted = !task.completed;
 
    setTasks((current) =>
      current.map((item) =>
        item.id === task.id ? { ...item, completed: nextCompleted } : item
      )
    );
 
    const { error } = await supabase
      .from("tasks")
      .update({ completed: nextCompleted })
      .eq("id", task.id)
      .eq("user_id", task.user_id);
 
    if (error) {
      setTasks((current) =>
        current.map((item) =>
          item.id === task.id ? { ...item, completed: task.completed } : item
        )
      );
      setPageError(error.message);
      return;
    }
 
    setNotice(nextCompleted ? "Task marked as completed." : "Task reopened.");
  }
 
  async function handleDeleteTask(task: StudyTask) {
    const confirmed = window.confirm(
      `Delete "${task.title}"? This action cannot be undone.`
    );
 
    if (!confirmed) return;
 
    setPageError("");
    setNotice("");
 
    const previousTasks = tasks;
    setTasks((current) => current.filter((item) => item.id !== task.id));
 
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", task.id)
      .eq("user_id", task.user_id);
 
    if (error) {
      setTasks(previousTasks);
      setPageError(error.message);
      return;
    }
 
    setNotice("Task deleted successfully.");
  }
 
  function changeTimerMode(mode: TimerMode) {
    setTimerRunning(false);
    setTimerMode(mode);
    setSeconds((mode === "focus" ? focusMinutes : breakMinutes) * 60);
    setNotice("");
  }
 
  function changeDuration(mode: TimerMode, value: string) {
    const duration = Number(value);
 
    if (!Number.isInteger(duration) || duration < 1 || duration > 180) {
      return;
    }
 
    if (mode === "focus") {
      setFocusMinutes(duration);
    } else {
      setBreakMinutes(duration);
    }
 
    // Update the displayed timer immediately if editing its current mode.
    if (timerMode === mode && !timerRunning) {
      setSeconds(duration * 60);
    }
 
    setNotice("");
  }
 
  function startTimer() {
    if (seconds === 0) {
      setSeconds(selectedMinutes * 60);
    }
 
    setNotice("");
    setTimerRunning(true);
  }
 
  function pauseTimer() {
    setTimerRunning(false);
  }
 
  function resetTimer() {
    setTimerRunning(false);
    setSeconds(selectedMinutes * 60);
    setNotice("");
  }
 
  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
 
    if (error) {
      setPageError(error.message);
      return;
    }
 
    router.replace("/auth");
    router.refresh();
  }
 
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f8fc] text-slate-600">
        <div className="flex flex-col items-center gap-3">
          <LoaderCircle className="h-9 w-9 animate-spin text-violet-600" />
          <p className="text-sm font-medium">Loading your StudyFlow...</p>
        </div>
      </main>
    );
  }
 
  return (
    <div className="min-h-screen bg-[#f7f8fc] text-slate-800">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 lg:hidden">
        <a
          href="#dashboard"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab("dashboard");
            scrollToSection("dashboard");
          }}
          className="flex items-center gap-2 font-bold"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white">
            <BookOpen size={19} />
          </span>
          <span className="text-lg">
            Study<span className="text-violet-600">Flow</span>
          </span>
        </a>
 
        <button
          type="button"
          onClick={() => setShowMobileMenu((open) => !open)}
          className="rounded-lg p-2 hover:bg-slate-100"
          aria-label="Toggle navigation menu"
        >
          {showMobileMenu ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>
 
      <div className="mx-auto flex min-h-screen max-w-[1700px]">
        <aside
          className={`${
            showMobileMenu ? "flex" : "hidden"
          } fixed inset-x-0 top-16 bottom-0 z-20 flex-col overflow-y-auto border-r border-slate-200 bg-white p-5 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[255px] lg:shrink-0`}
        >
          <a
            href="#dashboard"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab("dashboard");
              scrollToSection("dashboard");
            }}
            className="mb-10 hidden items-center gap-3 px-2 lg:flex"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-200">
              <BookOpen size={23} />
            </span>
            <span className="text-xl font-extrabold tracking-tight">
              Study<span className="text-violet-600">Flow</span>
            </span>
          </a>
 
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Workspace
          </p>
 
          <nav className="space-y-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab("dashboard");
                scrollToSection("dashboard");
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                activeTab === "dashboard"
                  ? "bg-violet-50 text-violet-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <LayoutDashboard size={19} />
              Dashboard
            </button>
 
            <button
              type="button"
              onClick={() => {
                setActiveTab("tasks");
                setShowMobileMenu(false);
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                activeTab === "tasks"
                  ? "bg-violet-50 text-violet-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <CheckCircle2 size={19} />
              My Tasks
              <ArrowRight size={15} className="ml-auto" />
            </button>
 
            <button
              type="button"
              onClick={() => {
                setActiveTab("dashboard");
                scrollToSection("focus-room");
              }}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <Clock3 size={19} />
              Focus Room
            </button>
 
            <button
              type="button"
              onClick={() => {
                setActiveTab("dashboard");
                scrollToSection("weekly-activity");
              }}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <Activity size={19} />
              Weekly Activity
            </button>
          </nav>
 
          <div className="mt-9 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 p-5 text-white">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
              <Target size={22} />
            </div>
            <p className="text-sm font-bold">Small steps, big results</p>
            <p className="mt-2 text-xs leading-5 text-violet-100">
              Stay consistent and make time for what matters.
            </p>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-violet-100">
              {completionPercent}% of your tasks completed
            </p>
          </div>
 
          <div className="mt-auto border-t border-slate-100 pt-5">
            <div className="mb-4 flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 font-bold text-violet-700">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{userName}</p>
                <p className="truncate text-xs text-slate-400">{userEmail}</p>
              </div>
            </div>
 
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
            >
              <LogOut size={18} />
              Sign out
            </button>
          </div>
        </aside>
 
        {activeTab === "dashboard" ? (
          <main
            id="dashboard"
            className="min-w-0 flex-1 px-4 py-6 sm:px-7 lg:px-10 lg:py-9"
          >
            <div className="mx-auto max-w-[1250px]">
              <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                <div>
                  <p className="mb-1 min-h-5 text-sm font-medium text-violet-600">
                    {getTodayLabel(currentDate)}
                  </p>
                  <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                    {getGreeting(currentDate)}
                    {currentDate ? ", " : ""}
                    {userName.split(" ")[0]}!
                  </h1>
                  <p className="mt-2 text-sm text-slate-500">
                    Here&apos;s your study progress at a glance.
                  </p>
                </div>
 
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (showAddForm) {
                        setShowAddForm(false);
                      } else {
                        openCreateTaskForm();
                      }
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-violet-200 transition hover:bg-violet-700"
                  >
                    <Plus size={18} />
                    Add a task
                  </button>
 
                  <button
                    type="button"
                    onClick={() => void loadDashboard()}
                    title="Refresh dashboard"
                    aria-label="Refresh dashboard"
                    className="rounded-xl border border-slate-200 bg-white p-3 text-slate-600 transition hover:bg-slate-50"
                  >
                    <RotateCcw size={18} />
                  </button>
                </div>
              </div>
 
              {pageError && (
                <div
                  role="alert"
                  className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
                >
                  <X size={18} className="mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">{pageError}</div>
                  <button
                    type="button"
                    onClick={() => setPageError("")}
                    aria-label="Dismiss error"
                  >
                    <X size={17} />
                  </button>
                </div>
              )}
 
              {notice && (
                <div
                  role="status"
                  className="mb-5 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
                >
                  <CheckCircle2 size={18} className="shrink-0" />
                  <span className="flex-1">{notice}</span>
                  <button
                    type="button"
                    onClick={() => setNotice("")}
                    aria-label="Dismiss notification"
                  >
                    <X size={17} />
                  </button>
                </div>
              )}
 
              {showAddForm && (
                <section
                  id="create-task-form"
                  className="mb-7 scroll-mt-24 rounded-2xl border border-violet-100 bg-white p-5 shadow-sm sm:p-6"
                >
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="font-bold text-slate-900">
                        Create a task
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">
                        Your task will be saved to your Supabase account.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                      aria-label="Close add task form"
                    >
                      <X size={19} />
                    </button>
                  </div>
 
                  <form onSubmit={handleAddTask} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="text-sm font-medium text-slate-700">
                        Task title *
                        <input
                          required
                          maxLength={150}
                          value={newTask.title}
                          onChange={(event) =>
                            setNewTask({
                              ...newTask,
                              title: event.target.value,
                            })
                          }
                          placeholder="e.g. Revise operating systems"
                          className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-3 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                        />
                      </label>
 
                      <label className="text-sm font-medium text-slate-700">
                        Subject *
                        <input
                          required
                          maxLength={100}
                          value={newTask.subject}
                          onChange={(event) =>
                            setNewTask({
                              ...newTask,
                              subject: event.target.value,
                            })
                          }
                          placeholder="e.g. Operating Systems"
                          className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-3 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                        />
                      </label>
 
                      <label className="text-sm font-medium text-slate-700">
                        Priority
                        <select
                          value={newTask.priority}
                          onChange={(event) =>
                            setNewTask({
                              ...newTask,
                              priority: event.target
                                .value as NewTask["priority"],
                            })
                          }
                          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </label>
 
                      <label className="text-sm font-medium text-slate-700">
                        Due date
                        <input
                          type="date"
                          value={newTask.due_date}
                          onChange={(event) =>
                            setNewTask({
                              ...newTask,
                              due_date: event.target.value,
                            })
                          }
                          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                        />
                      </label>
 
                      <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                        Estimated study time (minutes)
                        <input
                          type="number"
                          required
                          min={1}
                          max={1440}
                          value={newTask.estimated_minutes}
                          onChange={(event) =>
                            setNewTask({
                              ...newTask,
                              estimated_minutes: Number(event.target.value),
                            })
                          }
                          className="mt-2 w-full rounded-xl border border-slate-200 px-3.5 py-3 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                        />
                      </label>
                    </div>
 
                    <div className="flex flex-wrap justify-end gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddForm(false)}
                        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {saving && (
                          <LoaderCircle size={16} className="animate-spin" />
                        )}
                        {saving ? "Saving..." : "Save task"}
                      </button>
                    </div>
                  </form>
                </section>
              )}
 
              <section className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Total tasks"
                  value={tasks.length}
                  note="Tasks in your account"
                  icon={<BookOpen size={20} />}
                  iconClass="bg-violet-50 text-violet-600"
                />
                <StatCard
                  label="Completed"
                  value={completedTasks.length}
                  note={`${completionPercent}% completion rate`}
                  icon={<CheckCircle2 size={20} />}
                  iconClass="bg-emerald-50 text-emerald-600"
                />
                <StatCard
                  label="Pending"
                  value={pendingTasks.length}
                  note={
                    overdueCount > 0
                      ? `${overdueCount} overdue`
                      : "Tasks still to do"
                  }
                  icon={<Clock3 size={20} />}
                  iconClass="bg-amber-50 text-amber-600"
                />
                <StatCard
                  label="Completed study time"
                  value={formatMinutes(estimatedCompletedMinutes)}
                  note="Estimated time for completed tasks"
                  icon={<TrendingUp size={20} />}
                  iconClass="bg-sky-50 text-sky-600"
                />
              </section>
 
              <div className="grid items-start gap-6 xl:grid-cols-[1.5fr_1fr]">
                <section className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        Your study plan
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Your upcoming unfinished tasks
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("tasks")}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-violet-600 hover:text-violet-800"
                    >
                      All tasks <ArrowRight size={16} />
                    </button>
                  </div>
 
                  <div className="relative mb-5">
                    <Search
                      size={17}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      value={searchText}
                      onChange={(event) => setSearchText(event.target.value)}
                      placeholder="Search your pending tasks..."
                      aria-label="Search pending tasks"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
                    />
                  </div>
 
                  {visibleTasks.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                        <CheckCircle2 size={23} />
                      </div>
                      <p className="font-semibold text-slate-800">
                        {searchText
                          ? "No matching tasks"
                          : pendingTasks.length === 0
                            ? "You're all caught up!"
                            : "No tasks found"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {searchText
                          ? "Try another task title or subject."
                          : "Add a task to plan your next study session."}
                      </p>
                      {!searchText && (
                        <button
                          type="button"
                          onClick={openCreateTaskForm}
                          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
                        >
                          <Plus size={16} /> Add your first task
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {visibleTasks.map((task) => (
                        <div
                          key={task.id}
                          className="group flex items-start gap-3 py-4 first:pt-0 last:pb-0"
                        >
                          <button
                            type="button"
                            onClick={() => void handleToggleTask(task)}
                            aria-label={`Mark ${task.title} as completed`}
                            title="Mark as completed"
                            className="mt-0.5 shrink-0 rounded-full text-slate-300 transition hover:text-emerald-600"
                          >
                            <Circle size={22} />
                          </button>
 
                          <div className="min-w-0 flex-1">
                            <p className="break-words text-sm font-semibold text-slate-800">
                              {task.title}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-500">
                              <span className="inline-flex items-center gap-1">
                                <BookOpen size={13} />
                                {task.subject}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Clock3 size={13} />
                                {formatMinutes(task.estimated_minutes)}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <CalendarDays size={13} />
                                {formatDate(task.due_date)}
                              </span>
                            </div>
                            {currentDate &&
                              task.due_date &&
                              task.due_date < getLocalDate(currentDate) && (
                                <p className="mt-2 text-xs font-semibold text-rose-600">
                                  Overdue
                                </p>
                              )}
                          </div>
 
                          <div className="flex shrink-0 flex-col items-end gap-2">
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${
                                priorityStyles[task.priority] ??
                                priorityStyles.medium
                              }`}
                            >
                              {task.priority}
                            </span>
                            <button
                              type="button"
                              onClick={() => void handleDeleteTask(task)}
                              aria-label={`Delete ${task.title}`}
                              title="Delete task"
                              className="rounded-lg p-1.5 text-slate-300 opacity-100 transition hover:bg-rose-50 hover:text-rose-600 sm:opacity-0 sm:group-hover:opacity-100"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
 
                  {completedTasks.length > 0 && (
                    <div className="mt-5 border-t border-slate-100 pt-4">
                      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                        Recently completed
                      </p>
                      {completedTasks.slice(0, 2).map((task) => (
                        <div
                          key={task.id}
                          className="flex items-start gap-3 py-2"
                        >
                          <button
                            type="button"
                            onClick={() => void handleToggleTask(task)}
                            aria-label={`Reopen ${task.title}`}
                            title="Reopen task"
                            className="mt-0.5 shrink-0 text-emerald-600"
                          >
                            <CheckCircle2 size={20} />
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className="break-words text-sm text-slate-400 line-through">
                              {task.title}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {task.subject}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleDeleteTask(task)}
                            aria-label={`Delete ${task.title}`}
                            className="rounded-lg p-1.5 text-slate-300 transition hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
 
                {/* Focus Room with editable focus and break durations */}
                <section
                  id="focus-room"
                  className="scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
                >
                  <div className="bg-gradient-to-br from-[#211c45] via-[#30255e] to-[#49388c] px-5 pb-7 pt-6 text-white sm:px-7">
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-200">
                          Focus room
                        </p>
                        <h2 className="mt-2 text-xl font-bold">
                          Stay in the zone
                        </h2>
                      </div>
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
                        <Target size={23} />
                      </div>
                    </div>
 
                    {/* Select the timer mode */}
                    <div className="mb-5 flex rounded-xl bg-black/15 p-1">
                      <button
                        type="button"
                        onClick={() => changeTimerMode("focus")}
                        className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                          timerMode === "focus"
                            ? "bg-white text-violet-900"
                            : "text-violet-100 hover:bg-white/10"
                        }`}
                      >
                        Focus · {focusMinutes} min
                      </button>
                      <button
                        type="button"
                        onClick={() => changeTimerMode("break")}
                        className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                          timerMode === "break"
                            ? "bg-white text-violet-900"
                            : "text-violet-100 hover:bg-white/10"
                        }`}
                      >
                        Break · {breakMinutes} min
                      </button>
                    </div>
 
                    {/* Custom duration inputs */}
                    <div className="mb-6 grid grid-cols-2 gap-3">
                      <label className="text-xs font-semibold text-violet-100">
                        Focus time (minutes)
                        <input
                          type="number"
                          min={1}
                          max={180}
                          step={1}
                          value={focusMinutes}
                          disabled={timerRunning}
                          onChange={(event) =>
                            changeDuration("focus", event.target.value)
                          }
                          aria-label="Focus duration in minutes"
                          className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-base font-bold text-white outline-none focus:border-white focus:ring-2 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </label>
 
                      <label className="text-xs font-semibold text-violet-100">
                        Break time (minutes)
                        <input
                          type="number"
                          min={1}
                          max={180}
                          step={1}
                          value={breakMinutes}
                          disabled={timerRunning}
                          onChange={(event) =>
                            changeDuration("break", event.target.value)
                          }
                          aria-label="Break duration in minutes"
                          className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-base font-bold text-white outline-none focus:border-white focus:ring-2 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </label>
                    </div>
 
                    <p className="mb-5 text-xs leading-5 text-violet-200">
                      Set any whole number from 1 to 180 minutes. Pause the
                      timer before changing your durations.
                    </p>
 
                    <div className="flex flex-col items-center py-2">
                      <div className="relative flex h-48 w-48 items-center justify-center rounded-full border-[7px] border-white/10">
                        <div className="absolute inset-2 rounded-full border border-white/10" />
                        <div className="text-center">
                          <p className="font-mono text-5xl font-semibold tracking-tight">
                            {timerDisplay}
                          </p>
                          <p className="mt-3 text-xs font-medium uppercase tracking-[0.2em] text-violet-200">
                            {timerRunning
                              ? "In progress"
                              : seconds === 0
                                ? "Session ended"
                                : "Ready when you are"}
                          </p>
                        </div>
                      </div>
 
                      <div className="mt-6 flex items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={timerRunning ? pauseTimer : startTimer}
                          className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-violet-900 transition hover:bg-violet-50"
                        >
                          {timerRunning ? (
                            <>
                              <Pause size={17} /> Pause
                            </>
                          ) : (
                            <>
                              <Play size={17} />
                              {seconds === 0 ? "Start again" : "Start session"}
                            </>
                          )}
                        </button>
 
                        <button
                          type="button"
                          onClick={resetTimer}
                          title="Reset timer"
                          aria-label="Reset timer"
                          className="rounded-xl border border-white/20 p-3 text-white transition hover:bg-white/10"
                        >
                          <RotateCcw size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
 
                  <div className="grid grid-cols-2 divide-x divide-slate-100">
                    <div className="p-5 text-center">
                      <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                        <Flame size={19} />
                      </div>
                      <p className="text-xl font-extrabold text-slate-900">
                        {completedSessions}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Focus sessions completed this visit
                      </p>
                    </div>
 
                    <div className="p-5 text-center">
                      <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                        <Coffee size={19} />
                      </div>
                      <p className="text-xl font-extrabold text-slate-900">
                        {selectedMinutes} min
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Selected session length
                      </p>
                    </div>
                  </div>
                </section>
              </div>
 
              <section
                id="weekly-activity"
                className="mt-6 scroll-mt-24 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Weekly activity
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Tasks created during the last seven days
                    </p>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700">
                    <Activity size={15} />
                    Last 7 days
                  </div>
                </div>
 
                <div className="grid h-48 grid-cols-7 gap-2 sm:gap-5">
                  {weeklyActivity.map((day) => {
                    const height =
                      day.count === 0
                        ? 4
                        : Math.max(12, (day.count / maxWeeklyCount) * 100);
 
                    return (
                      <div
                        key={day.date}
                        className="flex min-w-0 flex-col items-center justify-end"
                        title={`${day.count} task(s) created`}
                      >
                        <span className="mb-2 text-xs font-semibold text-slate-600">
                          {day.count}
                        </span>
                        <div className="flex h-32 w-full max-w-12 items-end overflow-hidden rounded-t-lg bg-violet-50">
                          <div
                            className={`w-full rounded-t-lg transition-all duration-500 ${
                              day.count > 0 ? "bg-violet-500" : "bg-slate-200"
                            }`}
                            style={{ height: `${height}%` }}
                          />
                        </div>
                        <span className="mt-3 text-xs font-medium text-slate-500">
                          {day.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
 
                {tasks.length === 0 && (
                  <p className="mt-4 text-center text-xs text-slate-400">
                    Create tasks to start seeing your activity here.
                  </p>
                )}
              </section>
 
              <section className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Target size={22} />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900">
                      Your task progress
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Based on your saved tasks
                    </p>
                  </div>
                </div>
 
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-600">
                    Overall completion
                  </span>
                  <span className="font-bold text-slate-900">
                    {completionPercent}%
                  </span>
                </div>
 
                <div
                  className="h-3 overflow-hidden rounded-full bg-slate-100"
                  role="progressbar"
                  aria-valuenow={completionPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Overall task completion"
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
 
                <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">All tasks</p>
                    <p className="mt-1 text-xl font-extrabold text-slate-900">
                      {tasks.length}
                    </p>
                  </div>
                  <div className="rounded-xl bg-emerald-50/70 p-4">
                    <p className="text-xs text-emerald-700">Finished</p>
                    <p className="mt-1 text-xl font-extrabold text-emerald-700">
                      {completedTasks.length}
                    </p>
                  </div>
                  <div className="col-span-2 rounded-xl bg-amber-50/70 p-4 sm:col-span-1">
                    <p className="text-xs text-amber-700">Still to do</p>
                    <p className="mt-1 text-xl font-extrabold text-amber-700">
                      {pendingTasks.length}
                    </p>
                  </div>
                </div>
              </section>
 
              <footer className="py-8 text-center text-xs text-slate-400">
                StudyFlow · Build good habits, one session at a time.
              </footer>
            </div>
          </main>
        ) : (
          <div className="min-w-0 flex-1">
            <TasksPage onBack={() => setActiveTab("dashboard")} />
          </div>
        )}
      </div>
    </div>
  );
}
 
function StatCard({
  label,
  value,
  note,
  icon,
  iconClass,
}: {
  label: string;
  value: string | number;
  note: string;
  icon: ReactNode;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 break-words text-2xl font-extrabold tracking-tight text-slate-900">
            {value}
          </p>
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>
      </div>
      <p className="text-xs text-slate-500">{note}</p>
    </div>
  );
}
 