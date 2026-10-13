
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { BookOpen, Eye, EyeOff, LoaderCircle } from "lucide-react";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      if (mode === "signup") {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: name.trim() },
          },
        });

        if (authError) throw authError;

        if (data.session) {
          router.replace("/");
          router.refresh();
        } else {
          setMessage(
            "Account created! Check your email for a confirmation link before signing in."
          );
          setMode("signin");
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (authError) throw authError;

        router.replace("/");
        router.refresh();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8fc] px-4 py-10 text-slate-900">
      <div className="mx-auto grid min-h-[80vh] max-w-5xl overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-200/60 md:grid-cols-2">
        <section className="hidden flex-col justify-between bg-gradient-to-br from-indigo-700 via-violet-700 to-purple-800 p-10 text-white md:flex">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/15 p-3">
              <BookOpen size={26} />
            </div>
            <span className="text-xl font-bold">StudyFlow</span>
          </div>

          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-violet-200">
              Your learning journey
            </p>
            <h1 className="text-4xl font-bold leading-tight">
              Make every study session count.
            </h1>
            <p className="mt-5 leading-7 text-violet-100">
              Organize your tasks, plan your time, and build better study habits
              one day at a time.
            </p>
          </div>

          <p className="text-sm text-violet-200">
            Plan smarter. Learn better. Grow every day.
          </p>
        </section>

        <section className="flex flex-col justify-center p-6 sm:p-10 lg:p-12">
          <div className="mb-8 flex items-center gap-3 md:hidden">
            <div className="rounded-xl bg-indigo-600 p-3 text-white">
              <BookOpen size={24} />
            </div>
            <span className="text-xl font-bold">StudyFlow</span>
          </div>

          <p className="text-sm font-semibold text-indigo-600">
            WELCOME TO STUDYFLOW
          </p>
          <h2 className="mt-2 text-3xl font-bold">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {mode === "signup"
              ? "Start organizing your learning today."
              : "Sign in to continue your learning journey."}
          </p>

          <div className="mt-7 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError("");
                setMessage("");
              }}
              className={`rounded-lg py-3 text-sm font-semibold transition ${
                mode === "signup"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Create account
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError("");
                setMessage("");
              }}
              className={`rounded-lg py-3 text-sm font-semibold transition ${
                mode === "signin"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Sign in
            </button>
          </div>

          {message && (
            <div
              role="status"
              className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-800"
            >
              {message}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {mode === "signup" && (
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Full name
                </label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  required
                  minLength={2}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={
                    mode === "signup" ? "new-password" : "current-password"
                  }
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-12 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:bg-slate-100"
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <LoaderCircle size={19} className="animate-spin" />}
              {loading
                ? "Please wait..."
                : mode === "signup"
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {mode === "signup"
              ? "Already have an account?"
              : "New to StudyFlow?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signup" ? "signin" : "signup");
                setError("");
                setMessage("");
              }}
              className="font-semibold text-indigo-600 hover:text-indigo-800"
            >
              {mode === "signup" ? "Sign in" : "Create an account"}
            </button>
          </p>

          <a
            href="/"
            className="mt-6 text-center text-sm text-slate-500 hover:text-indigo-600"
          >
            ← Back to dashboard
          </a>
        </section>
      </div>
    </main>
  );
}
