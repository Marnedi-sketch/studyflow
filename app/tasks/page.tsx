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
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  Filter,
  ListTodo,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type Priority = "Low" | "Medium" | "High";
type StatusFilter = "All" | "Pending" | "Completed";

type StudyTask = {
  id: string;
  title: string;
  subject: string;
  dueDate: string;
  priority: Priority;
  minutes: number;
  completed: boolean;
  createdAt: string;
};

type DatabaseTask = {
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

type TaskForm = {
  title: string;
  subject: string;
  dueDate: string;
  priority: Priority;
  minutes: string;
};

const emptyForm: TaskForm = {
  title: "",
  subject: "General",
  dueDate: "",
  priority: "Medium",
  minutes: "30",
};

const subjects = [
  "General",
  "Data Structures",
  "Python",
  "Java",
  "Mathematics",
  "Database Management",
  "Operating Systems",
  "Computer Networks",
  "AI & Machine Learning",
  "Web Development",
];

function fromDatabase(row: DatabaseTask): StudyTask {
  const priority =
    row.priority.charAt(0).toUpperCase() + row.priority.slice(1);

  return {
    id: row.id,
    title: row.title,
    subject: row.subject,
    dueDate: row.due_date ?? "",
    priority: priority as Priority,
    minutes: row.estimated_minutes,
    completed: row.completed,
    createdAt: row.created_at,
  };
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) return `${remainingMinutes} min`;
  if (remainingMinutes === 0) return `${hours} hr`;
  return `${hours} hr ${remainingMinutes} min`;
}

function formatDate(date: string) {
  if (!date) return "No due date";

  const parsedDate = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) return date;

  return parsedDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isOverdue(task: StudyTask) {
  if (!task.dueDate || task.completed) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return new Date(`${task.dueDate}T00:00:00`) < today;
}

function SummaryCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          {icon}
        </span>
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

export default function TasksPage({ onBack }: { onBack?: () => void } = {}) {
  const router = useRouter();

  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [ready, setReady] = useState(false);
  const [pageError, setPageError] = useState("");
  const [saving, setSaving] = useState(false);
  const [workingTaskId, setWorkingTaskId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TaskForm>(emptyForm);
  const [formError, setFormError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("All");
  const [subjectFilter, setSubjectFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");

  const loadTasks = useCallback(async () => {
    setReady(false);
    setPageError("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;

      if (!authData.user) {
        router.replace("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", authData.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setTasks(
        ((data ?? []) as DatabaseTask[]).map(fromDatabase)
      );
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to load your tasks. Please try again."
      );
    } finally {
      setReady(true);
    }
  }, [router]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesSearch =
        !query ||
        task.title.toLowerCase().includes(query) ||
        task.subject.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Pending" && !task.completed) ||
        (statusFilter === "Completed" && task.completed);

      const matchesSubject =
        subjectFilter === "All" || task.subject === subjectFilter;

      const matchesPriority =
        priorityFilter === "All" || task.priority === priorityFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesSubject &&
        matchesPriority
      );
    });
  }, [tasks, search, statusFilter, subjectFilter, priorityFilter]);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const overdueTasks = tasks.filter(isOverdue).length;

  const totalStudyMinutes = tasks
    .filter((task) => task.completed)
    .reduce((total, task) => total + task.minutes, 0);

  const completionRate =
    totalTasks === 0
      ? 0
      : Math.round((completedTasks / totalTasks) * 100);

  function openCreateForm() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setShowForm(true);
  }

  function openEditForm(task: StudyTask) {
    setEditingId(task.id);
    setForm({
      title: task.title,
      subject: task.subject,
      dueDate: task.dueDate,
      priority: task.priority,
      minutes: String(task.minutes),
    });
    setFormError("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
  }

  async function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = form.title.trim();
    const subject = form.subject.trim();
    const minutes = Number(form.minutes);

    if (!title) {
      setFormError("Please enter a task title.");
      return;
    }

    if (!subject) {
      setFormError("Please enter a subject.");
      return;
    }

    if (
      !Number.isInteger(minutes) ||
      minutes < 5 ||
      minutes > 720
    ) {
      setFormError("Study duration must be between 5 and 720 minutes.");
      return;
    }

    if (
      form.dueDate &&
      !/^\d{4}-\d{2}-\d{2}$/.test(form.dueDate)
    ) {
      setFormError("Please enter a valid due date.");
      return;
    }

    setSaving(true);
    setFormError("");
    setPageError("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;

      if (!authData.user) {
        router.replace("/auth");
        return;
      }

      const values = {
        title,
        subject,
        due_date: form.dueDate || null,
        priority: form.priority.toLowerCase() as
          | "low"
          | "medium"
          | "high",
        estimated_minutes: minutes,
      };

      if (editingId) {
        const { data, error } = await supabase
          .from("tasks")
          .update(values)
          .eq("id", editingId)
          .eq("user_id", authData.user.id)
          .select("*")
          .single();

        if (error) throw error;

        const updatedTask = fromDatabase(data as DatabaseTask);

        setTasks((current) =>
          current.map((task) =>
            task.id === editingId ? updatedTask : task
          )
        );
      } else {
        const { data, error } = await supabase
          .from("tasks")
          .insert({
            ...values,
            user_id: authData.user.id,
          })
          .select("*")
          .single();

        if (error) throw error;

        setTasks((current) => [
          fromDatabase(data as DatabaseTask),
          ...current,
        ]);
      }

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      setFormError("");
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to save this task."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleTask(id: string) {
    const task = tasks.find((item) => item.id === id);
    if (!task || workingTaskId) return;

    setWorkingTaskId(id);
    setPageError("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;

      if (!authData.user) {
        router.replace("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("tasks")
        .update({ completed: !task.completed })
        .eq("id", id)
        .eq("user_id", authData.user.id)
        .select("*")
        .single();

      if (error) throw error;

      const updatedTask = fromDatabase(data as DatabaseTask);

      setTasks((current) =>
        current.map((item) => (item.id === id ? updatedTask : item))
      );
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to update this task."
      );
    } finally {
      setWorkingTaskId(null);
    }
  }

  async function deleteTask(id: string) {
    if (workingTaskId) return;

    const confirmed = window.confirm(
      "Delete this study task? This action cannot be undone."
    );

    if (!confirmed) return;

    setWorkingTaskId(id);
    setPageError("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;

      if (!authData.user) {
        router.replace("/auth");
        return;
      }

      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", id)
        .eq("user_id", authData.user.id);

      if (error) throw error;

      setTasks((current) => current.filter((task) => task.id !== id));
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to delete this task."
      );
    } finally {
      setWorkingTaskId(null);
    }
  }

  function resetFilters() {
    setSearch("");
    setStatusFilter("All");
    setSubjectFilter("All");
    setPriorityFilter("All");
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                aria-label="Back to dashboard"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100"
              >
                <ArrowLeft size={19} />
              </button>
            ) : (
              <Link
                href="/"
                aria-label="Back to dashboard"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100"
              >
                <ArrowLeft size={19} />
              </Link>
            )}

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <BookOpen size={21} />
            </div>

            <div>
              <h1 className="text-lg font-bold tracking-tight">
                StudyFlow
              </h1>
              <p className="text-xs text-slate-500">
                Your personal study planner
              </p>
            </div>
          </div>

          <button
            onClick={openCreateForm}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">New task</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {pageError && (
          <div
            role="alert"
            className="mb-6 flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
          >
            <p>{pageError}</p>
            <button
              onClick={() => setPageError("")}
              aria-label="Dismiss error"
              className="shrink-0 rounded p-1 hover:bg-rose-100"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <section className="mb-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                <Sparkles size={14} />
                Make every study session count
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                My study tasks
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                Organize your subjects, plan your time, and track your
                progress one task at a time.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-3 sm:self-auto">
              <CheckCircle2 className="text-emerald-600" size={20} />
              <div>
                <p className="text-sm font-bold">{completionRate}% complete</p>
                <p className="text-xs text-slate-500">Overall progress</p>
              </div>
            </div>
          </div>
        </section>

        <section
          aria-label="Task statistics"
          className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <SummaryCard
            icon={<ListTodo size={21} />}
            label="Total tasks"
            value={totalTasks}
            detail="All your study tasks"
          />
          <SummaryCard
            icon={<Clock3 size={21} />}
            label="Pending"
            value={pendingTasks}
            detail="Tasks still to complete"
          />
          <SummaryCard
            icon={<CheckCircle2 size={21} />}
            label="Completed"
            value={completedTasks}
            detail="Tasks finished successfully"
          />
          <SummaryCard
            icon={<CalendarDays size={21} />}
            label="Overdue"
            value={overdueTasks}
            detail="Pending tasks past their due date"
          />
        </section>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Filter size={18} className="text-indigo-600" />
            <h3 className="font-semibold">Find your tasks</h3>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search title or subject..."
                aria-label="Search tasks"
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              aria-label="Filter by status"
              className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="All">All statuses</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
            </select>

            <select
              value={subjectFilter}
              onChange={(event) => setSubjectFilter(event.target.value)}
              aria-label="Filter by subject"
              className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="All">All subjects</option>
              {Array.from(new Set(tasks.map((task) => task.subject)))
                .sort()
                .map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              aria-label="Filter by priority"
              className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="All">All priorities</option>
              <option value="High">High priority</option>
              <option value="Medium">Medium priority</option>
              <option value="Low">Low priority</option>
            </select>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <div className="flex flex-wrap gap-2">
              {(["All", "Pending", "Completed"] as StatusFilter[]).map(
                (status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      statusFilter === status
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {status}
                  </button>
                )
              )}
            </div>

            <button
              onClick={resetFilters}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              Clear filters
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
            <div>
              <h3 className="text-lg font-bold">Your tasks</h3>
              <p className="mt-1 text-sm text-slate-500">
                {filteredTasks.length}{" "}
                {filteredTasks.length === 1 ? "task" : "tasks"} shown
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Saved in Supabase
            </div>
          </div>

          {!ready ? (
            <div className="flex flex-col items-center justify-center px-5 py-20 text-center">
              <LoaderCircle
                size={32}
                className="animate-spin text-indigo-600"
              />
              <p className="mt-4 font-semibold">Loading your tasks...</p>
              <p className="mt-1 text-sm text-slate-500">
                Connecting to your study planner.
              </p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center px-5 py-16 text-center sm:py-20">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <BookOpen size={29} />
              </div>

              <h4 className="mt-5 text-lg font-bold">
                {tasks.length === 0
                  ? "Start your study journey"
                  : "No matching tasks"}
              </h4>

              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                {tasks.length === 0
                  ? "Create your first task to organize your subjects and start tracking your progress."
                  : "Try changing your search or filters to find the tasks you are looking for."}
              </p>

              {tasks.length === 0 ? (
                <button
                  onClick={openCreateForm}
                  className="mt-6 flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  <Plus size={18} />
                  Create your first task
                </button>
              ) : (
                <button
                  onClick={resetFilters}
                  className="mt-5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredTasks.map((task) => {
                const overdue = isOverdue(task);
                const busy = workingTaskId === task.id;

                const priorityClasses =
                  task.priority === "High"
                    ? "bg-rose-50 text-rose-700 ring-rose-200"
                    : task.priority === "Medium"
                      ? "bg-amber-50 text-amber-700 ring-amber-200"
                      : "bg-emerald-50 text-emerald-700 ring-emerald-200";

                return (
                  <article
                    key={task.id}
                    className={`flex flex-col gap-4 px-5 py-5 transition hover:bg-slate-50/70 sm:px-6 lg:flex-row lg:items-center lg:justify-between ${
                      task.completed ? "bg-slate-50/50" : ""
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <button
                        onClick={() => void toggleTask(task.id)}
                        disabled={Boolean(workingTaskId)}
                        aria-label={
                          task.completed
                            ? `Mark ${task.title} as pending`
                            : `Complete ${task.title}`
                        }
                        title={
                          task.completed
                            ? "Mark as pending"
                            : "Mark as completed"
                        }
                        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:text-indigo-600 disabled:cursor-wait"
                      >
                        {busy ? (
                          <LoaderCircle
                            size={22}
                            className="animate-spin text-indigo-600"
                          />
                        ) : task.completed ? (
                          <CheckCircle2
                            size={23}
                            className="text-emerald-600"
                          />
                        ) : (
                          <Circle size={23} />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <h4
                          className={`break-words font-semibold ${
                            task.completed
                              ? "text-slate-400 line-through"
                              : "text-slate-900"
                          }`}
                        >
                          {task.title}
                        </h4>

                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1.5">
                            <BookOpen size={14} />
                            {task.subject}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Clock3 size={14} />
                            {formatDuration(task.minutes)}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1.5 ${
                              overdue ? "font-semibold text-rose-600" : ""
                            }`}
                          >
                            <CalendarDays size={14} />
                            {overdue ? "Overdue · " : ""}
                            {formatDate(task.dueDate)}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${priorityClasses}`}
                          >
                            {task.priority} priority
                          </span>

                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              task.completed
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {task.completed ? "Completed" : "Pending"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pl-10 lg:pl-0">
                      <button
                        onClick={() => openEditForm(task)}
                        disabled={Boolean(workingTaskId)}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50"
                      >
                        <Pencil size={14} />
                        Edit
                      </button>

                      <button
                        onClick={() => void deleteTask(task.id)}
                        disabled={Boolean(workingTaskId)}
                        aria-label={`Delete ${task.title}`}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5">
            <div className="flex items-center gap-2 text-indigo-700">
              <Sparkles size={19} />
              <h3 className="font-semibold">Your progress</h3>
            </div>

            <div className="mt-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-3xl font-bold text-slate-900">
                  {completionRate}%
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  of your tasks completed
                </p>
              </div>
              <p className="text-sm font-semibold text-indigo-700">
                {completedTasks}/{totalTasks}
              </p>
            </div>

            <div
              className="mt-4 h-2.5 overflow-hidden rounded-full bg-indigo-100"
              role="progressbar"
              aria-label="Task completion progress"
              aria-valuenow={completionRate}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5">
            <div className="flex items-center gap-2 text-emerald-700">
              <Clock3 size={19} />
              <h3 className="font-semibold">Study time completed</h3>
            </div>
            <p className="mt-4 text-3xl font-bold text-slate-900">
              {formatDuration(totalStudyMinutes)}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Estimated time across your completed tasks
            </p>
          </div>
        </section>

        <footer className="py-8 text-center text-xs text-slate-400">
          StudyFlow · Stay consistent, keep learning, and make progress.
        </footer>
      </div>

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-form-title"
            className="my-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
              <div>
                <h3
                  id="task-form-title"
                  className="text-xl font-bold text-slate-900"
                >
                  {editingId ? "Edit study task" : "Create a study task"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Add the details to plan your study session.
                </p>
              </div>

              <button
                onClick={closeForm}
                disabled={saving}
                aria-label="Close task form"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveTask} className="space-y-5 p-5 sm:p-6">
              {formError && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
                >
                  {formError}
                </div>
              )}

              <div>
                <label
                  htmlFor="task-title"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Task title <span className="text-rose-500">*</span>
                </label>
                <input
                  id="task-title"
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="e.g. Revise linked lists"
                  maxLength={200}
                  required
                  autoFocus
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label
                  htmlFor="task-subject"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Subject <span className="text-rose-500">*</span>
                </label>
                <input
                  id="task-subject"
                  list="study-subject-options"
                  value={form.subject}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      subject: event.target.value,
                    }))
                  }
                  placeholder="Choose or type a subject"
                  maxLength={100}
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
                <datalist id="study-subject-options">
                  {subjects.map((subject) => (
                    <option key={subject} value={subject} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="task-priority"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Priority
                  </label>
                  <select
                    id="task-priority"
                    value={form.priority}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        priority: event.target.value as Priority,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="task-minutes"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Study time (minutes)
                  </label>
                  <input
                    id="task-minutes"
                    type="number"
                    min={5}
                    max={720}
                    step={5}
                    required
                    value={form.minutes}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        minutes: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    Between 5 and 720 minutes
                  </p>
                </div>
              </div>

              <div>
                <label
                  htmlFor="task-due-date"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Due date <span className="text-xs font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  id="task-due-date"
                  type="date"
                  value={form.dueDate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      dueDate: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <LoaderCircle size={17} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      {editingId ? <Check size={17} /> : <Plus size={17} />}
                      {editingId ? "Save changes" : "Create task"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}