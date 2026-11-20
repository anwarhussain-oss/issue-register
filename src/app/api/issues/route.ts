import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseIssueInput, serializeIssue } from "@/lib/issues";

export const dynamic = "force-dynamic";

export async function GET() {
  const issues = await prisma.issue.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(issues.map(serializeIssue));
}

export async function POST(req: Request) {
  const parsed = parseIssueInput(await req.json().catch(() => null));
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const issue = await prisma.issue.create({ data: parsed.data });
  return NextResponse.json(serializeIssue(issue), { status: 201 });
}
