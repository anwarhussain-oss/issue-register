"use client";

import { useEffect, useMemo, useState } from "react";
import { PRIORITIES, STATUSES, type Issue, type Priority, type Status } from "@/lib/issues";

type FormState = {
  title: string;
  description: string;
  category: string;
  priority: Priority;
  status: Status;
  assignee: string;
  dueDate: string; // YYYY-MM-DD or ""
};

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  category: "",
  priority: "Medium",
  status: "Open",
  assignee: "",
  dueDate: "",
};

const PRIORITY_STYLES: Record<Priority, string> = {
  Low: "bg-slate-100 text-slate-700 ring-slate-200",
  Medium: "bg-sky-50 text-sky-700 ring-sky-200",
  High: "bg-amber-50 text-amber-800 ring-amber-200",
  Critical: "bg-red-50 text-red-700 ring-red-200",
};

const STATUS_STYLES: Record<Status, string> = {
  Open: "bg-blue-50 text-blue-700 ring-blue-200",
  "In Progress": "bg-violet-50 text-violet-700 ring-violet-200",
  Closed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

const CARD_STYLES: Record<Status, { accent: string; dot: string }> = {
  Open: { accent: "border-blue-500", dot: "bg-blue-500" },
  "In Progress": { accent: "border-violet-500", dot: "bg-violet-500" },
  Closed: { accent: "border-emerald-500", dot: "bg-emerald-500" },
};

// Due dates are stored as UTC midnight, so format in UTC to avoid off-by-one days.
const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })
    : "—";

const todayUtcIso = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())).toISOString();
};

const isOverdue = (i: Issue) => i.status !== "Closed" && !!i.dueDate && i.dueDate < todayUtcIso();

// Quote/escape a CSV field, and neutralise spreadsheet formula injection
// (cells starting with = + - @ tab or CR are prefixed with a single quote).
function csvCell(value: string): string {
  const v = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(v) || v !== v.trim() ? `"${v.replace(/"/g, '""')}"` : v;
}

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}>
      {children}
    </span>
  );
}

export default function IssueRegister({ initialIssues }: { initialIssues: Issue[] }) {
  const [issues, setIssues] = useState<Issue[]>(initialIssues);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "">("");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "">("");

  const [editing, setEditing] = useState<Issue | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<Issue | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  // Close modals with Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (!saving) setFormOpen(false);
      if (!deleteBusy) setDeleting(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saving, deleteBusy]);

  const counts = useMemo(() => {
    const c: Record<Status, number> = { Open: 0, "In Progress": 0, Closed: 0 };
    for (const i of issues) c[i.status]++;
    return c;
  }, [issues]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return issues.filter((i) => {
      if (statusFilter && i.status !== statusFilter) return false;
      if (priorityFilter && i.priority !== priorityFilter) return false;
      if (!q) return true;
      return [i.title, i.description, i.category, i.assignee, `#${i.id}`].some((f) => f.toLowerCase().includes(q));
    });
  }, [issues, search, statusFilter, priorityFilter]);

  const hasFilters = !!(search || statusFilter || priorityFilter);

  function exportCsv() {
    const header = ["ID", "Title", "Description", "Category", "Priority", "Status", "Assignee", "Due Date", "Overdue", "Created At", "Updated At"];
    const rows = filtered.map((i) => [
      String(i.id),
      i.title,
      i.description,
      i.category,
      i.priority,
      i.status,
      i.assignee,
      i.dueDate ? i.dueDate.slice(0, 10) : "",
      isOverdue(i) ? "Yes" : "No",
      i.createdAt,
      i.updatedAt,
    ]);
    const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
    // BOM so Excel opens UTF-8 correctly.
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `issues-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setToast(`Exported ${rows.length} issue${rows.length === 1 ? "" : "s"}`);
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(issue: Issue) {
    setEditing(issue);
    setForm({
      title: issue.title,
      description: issue.description,
      category: issue.category,
      priority: issue.priority,
      status: issue.status,
      assignee: issue.assignee,
      dueDate: issue.dueDate ? issue.dueDate.slice(0, 10) : "",
    });
    setFormError(null);
    setFormOpen(true);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setFormError("Title is required.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch(editing ? `/api/issues/${editing.id}` : "/api/issues", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save issue.");
      const saved = data as Issue;
      setIssues((prev) => (editing ? prev.map((i) => (i.id === saved.id ? saved : i)) : [saved, ...prev]));
      setFormOpen(false);
      setToast(editing ? `Issue #${saved.id} updated` : `Issue #${saved.id} created`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save issue.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/issues/${deleting.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to delete issue.");
      }
      setIssues((prev) => prev.filter((i) => i.id !== deleting.id));
      setToast(`Issue #${deleting.id} deleted`);
      setDeleting(null);
      setFormOpen(false);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Failed to delete issue.");
    } finally {
      setDeleteBusy(false);
    }
  }

  const inputCls =
    "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";
  const labelCls = "mb-1 block text-sm font-medium text-slate-700";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Issue Register</h1>
          <p className="text-sm text-slate-500">Track, prioritise and resolve issues.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form method="POST" action="/api/auth/logout">
            <button type="submit" className="rounded-md px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700">
              Sign out
            </button>
          </form>
          <button
            onClick={exportCsv}
            disabled={filtered.length === 0}
            title={hasFilters ? `Export the ${filtered.length} filtered issues` : `Export all ${filtered.length} issues`}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
              <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
              <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
            </svg>
            Export CSV
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            <span className="text-lg leading-none">+</span> New Issue
          </button>
        </div>
      </header>

      {/* Summary dashboard */}
      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {STATUSES.map((s) => {
          const active = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(active ? "" : s)}
              title={active ? "Clear status filter" : `Show only ${s} issues`}
              className={`rounded-lg border-l-4 bg-white p-5 text-left shadow-sm ring-1 transition hover:shadow-md ${CARD_STYLES[s].accent} ${
                active ? "ring-2 ring-indigo-500" : "ring-slate-200"
              }`}
            >
              <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                <span className={`h-2 w-2 rounded-full ${CARD_STYLES[s].dot}`} />
                {s}
              </div>
              <div className="mt-2 text-3xl font-bold tabular-nums">{counts[s]}</div>
              <div className="mt-1 text-xs text-slate-400">
                {issues.length ? Math.round((counts[s] / issues.length) * 100) : 0}% of {issues.length} total
              </div>
            </button>
          );
        })}
      </section>

      {/* Filters */}
      <section className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.45 4.39l3.08 3.08a.75.75 0 11-1.06 1.06l-3.08-3.08A7 7 0 012 9z" clipRule="evenodd" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, description, category, assignee…"
            className={`${inputCls} pl-9`}
            aria-label="Search issues"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as Status | "")} className={`${inputCls} sm:w-44`} aria-label="Filter by status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as Priority | "")} className={`${inputCls} sm:w-44`} aria-label="Filter by priority">
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        {hasFilters && (
          <button
            onClick={() => {
              setSearch("");
              setStatusFilter("");
              setPriorityFilter("");
            }}
            className="whitespace-nowrap text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            Clear filters
          </button>
        )}
      </section>

      {/* Table */}
      <section className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Assignee</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((i) => (
                <tr key={i.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500">#{i.id}</td>
                  <td className="max-w-xs px-4 py-3">
                    <button onClick={() => openEdit(i)} className="text-left font-medium text-slate-900 hover:text-indigo-600">
                      {i.title}
                    </button>
                    {i.description && <p className="truncate text-xs text-slate-500">{i.description}</p>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{i.category || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge className={PRIORITY_STYLES[i.priority]}>{i.priority}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={STATUS_STYLES[i.status]}>{i.status}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{i.assignee || <span className="text-slate-400">Unassigned</span>}</td>
                  <td className={`whitespace-nowrap px-4 py-3 ${isOverdue(i) ? "font-medium text-red-600" : "text-slate-600"}`}>
                    {fmtDate(i.dueDate)}
                    {isOverdue(i) && <span className="ml-1 text-xs">(overdue)</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button onClick={() => openEdit(i)} className="rounded px-2 py-1 text-sm font-medium text-indigo-600 hover:bg-indigo-50">
                      Edit
                    </button>
                    <button onClick={() => setDeleting(i)} className="ml-1 rounded px-2 py-1 text-sm font-medium text-red-600 hover:bg-red-50">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    {issues.length === 0 ? (
                      <>
                        No issues yet.{" "}
                        <button onClick={openCreate} className="font-medium text-indigo-600 hover:text-indigo-500">
                          Create the first one
                        </button>
                      </>
                    ) : (
                      "No issues match your search or filters."
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500">
          Showing {filtered.length} of {issues.length} issues
        </div>
      </section>

      {/* Create / Edit modal */}
      {formOpen && (
        <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:items-center" onMouseDown={() => !saving && setFormOpen(false)}>
          <form
            onSubmit={submitForm}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-lg bg-white shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="issue-form-title"
          >
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 id="issue-form-title" className="text-lg font-semibold">
                {editing ? `Edit Issue #${editing.id}` : "New Issue"}
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelCls} htmlFor="title">
                  Title <span className="text-red-500">*</span>
                </label>
                <input id="title" autoFocus required maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls} htmlFor="description">Description</label>
                <textarea id="description" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls} htmlFor="category">Category</label>
                <input
                  id="category"
                  list="category-options"
                  placeholder="e.g. Bug, Feature"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className={inputCls}
                />
                <datalist id="category-options">
                  {[...new Set(["Bug", "Feature", "Infrastructure", "Security", "Documentation", ...issues.map((i) => i.category).filter(Boolean)])].map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className={labelCls} htmlFor="assignee">Assignee</label>
                <input id="assignee" value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls} htmlFor="priority">Priority</label>
                <select id="priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })} className={inputCls}>
                  {PRIORITIES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="status">Status</label>
                <select id="status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Status })} className={inputCls}>
                  {STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="dueDate">Due Date</label>
                <input id="dueDate" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className={inputCls} />
              </div>
            </div>

            {formError && <p className="mx-6 mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}

            <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <div>
                {editing && (
                  <button type="button" onClick={() => setDeleting(editing)} className="text-sm font-medium text-red-600 hover:text-red-500">
                    Delete issue
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  disabled={saving}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
                  {saving ? "Saving…" : editing ? "Save Changes" : "Create Issue"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Delete confirmation */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onMouseDown={() => !deleteBusy && setDeleting(null)}>
          <div onMouseDown={(e) => e.stopPropagation()} className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" role="alertdialog" aria-modal="true">
            <h3 className="text-lg font-semibold">Delete issue #{deleting.id}?</h3>
            <p className="mt-2 text-sm text-slate-600">
              &ldquo;{deleting.title}&rdquo; will be permanently deleted. This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleting(null)}
                disabled={deleteBusy}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button onClick={confirmDelete} disabled={deleteBusy} className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50">
                {deleteBusy ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 rounded-md bg-slate-900 px-4 py-2 text-sm text-white shadow-lg" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
