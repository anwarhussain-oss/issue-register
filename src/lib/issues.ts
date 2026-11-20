export const PRIORITIES = ["Low", "Medium", "High", "Critical"] as const;
export const STATUSES = ["Open", "In Progress", "Closed"] as const;

export type Priority = (typeof PRIORITIES)[number];
export type Status = (typeof STATUSES)[number];

export type Issue = {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: Priority;
  status: Status;
  assignee: string;
  dueDate: string | null; // ISO string
  createdAt: string;
  updatedAt: string;
};

export type IssueInput = {
  title: string;
  description: string;
  category: string;
  priority: Priority;
  status: Status;
  assignee: string;
  dueDate: Date | null;
};

/** Validates an untrusted request body. Returns either data or an error message. */
export function parseIssueInput(body: unknown): { data: IssueInput } | { error: string } {
  if (!body || typeof body !== "object") return { error: "Invalid request body." };
  const b = body as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  const title = str(b.title);
  if (!title) return { error: "Title is required." };
  if (title.length > 200) return { error: "Title must be 200 characters or fewer." };

  const priority = str(b.priority) || "Medium";
  if (!PRIORITIES.includes(priority as Priority)) return { error: `Priority must be one of: ${PRIORITIES.join(", ")}.` };

  const status = str(b.status) || "Open";
  if (!STATUSES.includes(status as Status)) return { error: `Status must be one of: ${STATUSES.join(", ")}.` };

  let dueDate: Date | null = null;
  const rawDue = str(b.dueDate);
  if (rawDue) {
    // Accept "YYYY-MM-DD" from <input type="date"> and store as UTC midnight.
    const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(rawDue) ? `${rawDue}T00:00:00.000Z` : rawDue);
    if (isNaN(d.getTime())) return { error: "Due date is invalid." };
    dueDate = d;
  }

  return {
    data: {
      title,
      description: str(b.description),
      category: str(b.category),
      priority: priority as Priority,
      status: status as Status,
      assignee: str(b.assignee),
      dueDate,
    },
  };
}

export function serializeIssue(i: {
  id: number; title: string; description: string; category: string; priority: string;
  status: string; assignee: string; dueDate: Date | null; createdAt: Date; updatedAt: Date;
}): Issue {
  return {
    ...i,
    priority: i.priority as Priority,
    status: i.status as Status,
    dueDate: i.dueDate ? i.dueDate.toISOString() : null,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  };
}
