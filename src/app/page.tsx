"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type User = { id: string; username: string };
type Task = { id: string; title: string; completed: boolean; createdAt: string; updatedAt: string };
type Filter = "all" | "active" | "done";

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "same-origin",
    cache: "no-store",
    ...options,
    headers: { ...(options?.body ? { "Content-Type": "application/json" } : {}), ...options?.headers },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data as T;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "register">("register");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [title, setTitle] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { user } = await api<{ user: User }>("/api/auth/me");
        const { tasks } = await api<{ tasks: Task[] }>("/api/tasks");
        if (active) {
          setUser(user);
          setTasks(tasks);
        }
      } catch {
        // A missing session simply shows the sign-in screen.
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  const remaining = tasks.filter((task) => !task.completed).length;
  const visibleTasks = useMemo(() => tasks.filter((task) => {
    if (filter === "active") return !task.completed;
    if (filter === "done") return task.completed;
    return true;
  }), [tasks, filter]);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await api<{ user: User }>(`/api/auth/${mode === "register" ? "register" : "login"}`, {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      const taskResult = await api<{ tasks: Task[] }>("/api/tasks");
      setUser(result.user);
      setTasks(taskResult.tasks);
      setPassword("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    setError("");
    setBusy(true);
    try {
      const { task } = await api<{ task: Task }>("/api/tasks", {
        method: "POST",
        body: JSON.stringify({ title }),
      });
      setTasks((current) => [task, ...current]);
      setTitle("");
      setFilter("all");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add task.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(task: Task) {
    setError("");
    setPendingId(task.id);
    try {
      const { task: changed } = await api<{ task: Task }>(`/api/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ completed: !task.completed }),
      });
      setTasks((current) => current.map((item) => item.id === task.id ? changed : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update task.");
    } finally {
      setPendingId(null);
    }
  }

  async function remove(task: Task) {
    setError("");
    setPendingId(task.id);
    try {
      await api<{ ok: true }>(`/api/tasks/${task.id}`, { method: "DELETE" });
      setTasks((current) => current.filter((item) => item.id !== task.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete task.");
    } finally {
      setPendingId(null);
    }
  }

  async function signOut() {
    setError("");
    setBusy(true);
    try {
      await api<{ ok: true }>("/api/auth/logout", { method: "POST" });
      setUser(null);
      setTasks([]);
      setPassword("");
      setMode("login");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign out.");
    } finally {
      setBusy(false);
    }
  }

  const today = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date());

  if (loading) return <main className="loading-screen"><span className="brand-mark">✳</span><p>Getting your day ready…</p></main>;

  if (!user) return (
    <main className="auth-page">
      <section className="auth-intro">
        <div className="brand"><span className="brand-mark">✳</span><span>daymark<span className="brand-dot">.</span></span></div>
        <div className="intro-content">
          <span className="eyebrow">YOUR SPACE TO FOCUS</span>
          <h1>Make room for<br /><em>what matters.</em></h1>
          <p>Little plans become meaningful progress. Keep your tasks close, clear, and entirely yours.</p>
          <div className="intro-art" aria-hidden="true"><span className="art-orbit art-orbit-one" /><span className="art-orbit art-orbit-two" /><span className="art-core">✓</span><span className="art-star art-star-one">✦</span><span className="art-star art-star-two">✦</span></div>
        </div>
        <span className="intro-footer">A simpler way to show up for your day.</span>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <span className="eyebrow">WELCOME TO DAYMARK</span>
          <h2>{mode === "register" ? "Start fresh today" : "Welcome back"}</h2>
          <p className="auth-subtitle">{mode === "register" ? "Create your private space in a moment." : "Pick up right where you left off."}</p>
          <div className="auth-tabs" role="tablist" aria-label="Account action">
            <button type="button" role="tab" aria-selected={mode === "register"} className={mode === "register" ? "selected" : ""} onClick={() => { setMode("register"); setError(""); }}>Create account</button>
            <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "selected" : ""} onClick={() => { setMode("login"); setError(""); }}>Sign in</button>
          </div>
          <form onSubmit={submitAuth} className="auth-form">
            <label htmlFor="username">Username</label>
            <input id="username" name="username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="your_username" minLength={3} maxLength={24} required />
            <span className="field-hint">3–24 letters, numbers, or underscores</span>
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" minLength={8} maxLength={128} required />
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-button" type="submit" disabled={busy}>{busy ? "One moment…" : mode === "register" ? "Create my space" : "Sign in"}<span aria-hidden="true">→</span></button>
          </form>
          <p className="auth-note">Your list is private to your account.</p>
        </div>
      </section>
    </main>
  );

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">✳</span><span>daymark<span className="brand-dot">.</span></span></div>
        <div className="side-section-label">WORKSPACE</div>
        <div className="side-link active"><span className="side-link-icon">▤</span> My tasks <span className="side-count">{tasks.length}</span></div>
        <div className="side-bottom">
          <div className="side-quote"><span>“</span>Small steps still move you forward.</div>
          <div className="profile"><span className="avatar">{user.username[0].toUpperCase()}</span><div><strong>{user.username}</strong><small>Personal workspace</small></div></div>
          <button className="signout-button" type="button" onClick={signOut} disabled={busy}>Sign out <span aria-hidden="true">↗</span></button>
        </div>
      </aside>
      <section className="main-content">
        <header className="mobile-header"><div className="brand"><span className="brand-mark">✳</span><span>daymark<span className="brand-dot">.</span></span></div><button onClick={signOut} disabled={busy}>Sign out</button></header>
        <div className="content-inner">
          <div className="topline"><span className="eyebrow">MY WORKSPACE</span><span className="date-label">{today}</span></div>
          <div className="heading-row"><div><h1>Make today count<span className="heading-dot">.</span></h1><p>One thing at a time, you&apos;ve got this.</p></div><div className="progress-badge"><span className="progress-number">{remaining}</span><span>left to do</span></div></div>
          <form className="add-form" onSubmit={add}><span className="add-plus" aria-hidden="true">＋</span><input aria-label="New task" placeholder="What would you like to get done?" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} /><button type="submit" disabled={busy || !title.trim()}>Add task <span aria-hidden="true">→</span></button></form>
          {error && <p className="form-error app-error" role="alert">{error}</p>}
          <div className="list-header"><div><h2>Your tasks</h2><span>{tasks.length} total</span></div><div className="filters" aria-label="Filter tasks">{(["all", "active", "done"] as const).map((item) => <button key={item} type="button" aria-pressed={filter === item} className={filter === item ? "selected" : ""} onClick={() => setFilter(item)}>{item === "all" ? "All" : item === "active" ? "To do" : "Done"}</button>)}</div></div>
          {visibleTasks.length ? <ul className="task-list">{visibleTasks.map((task) => <li className={`task-row ${task.completed ? "completed" : ""}`} key={task.id}><button className="check-button" type="button" aria-label={task.completed ? `Mark ${task.title} incomplete` : `Complete ${task.title}`} aria-pressed={task.completed} disabled={pendingId === task.id} onClick={() => toggle(task)}>{task.completed ? "✓" : ""}</button><span className="task-title">{task.title}</span><button className="delete-button" type="button" aria-label={`Delete ${task.title}`} title="Delete task" disabled={pendingId === task.id} onClick={() => remove(task)}>×</button></li>)}</ul> : <div className="empty-state"><div className="empty-icon">✳</div><h3>{tasks.length ? "Nothing in this view" : "A clear page, a fresh start"}</h3><p>{tasks.length ? "Try another filter to see your tasks." : "Add your first task above and take the next step."}</p></div>}
          <p className="list-footer">{remaining === 0 && tasks.length > 0 ? "All done. Enjoy the breathing room." : `${remaining} ${remaining === 1 ? "task" : "tasks"} to go. Keep your momentum.`}</p>
        </div>
      </section>
    </main>
  );
}
