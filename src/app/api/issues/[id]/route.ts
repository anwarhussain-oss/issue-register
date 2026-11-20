import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseIssueInput, serializeIssue } from "@/lib/issues";

type Ctx = { params: Promise<{ id: string }> };

async function getId(ctx: Ctx) {
  const id = Number((await ctx.params).id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const notFound = (e: unknown) =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025";

export async function GET(_req: Request, ctx: Ctx) {
  const id = await getId(ctx);
  if (!id) return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  const issue = await prisma.issue.findUnique({ where: { id } });
  if (!issue) return NextResponse.json({ error: "Issue not found." }, { status: 404 });
  return NextResponse.json(serializeIssue(issue));
}

export async function PUT(req: Request, ctx: Ctx) {
  const id = await getId(ctx);
  if (!id) return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  const parsed = parseIssueInput(await req.json().catch(() => null));
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const issue = await prisma.issue.update({ where: { id }, data: parsed.data });
    return NextResponse.json(serializeIssue(issue));
  } catch (e) {
    if (notFound(e)) return NextResponse.json({ error: "Issue not found." }, { status: 404 });
    throw e;
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const id = await getId(ctx);
  if (!id) return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  try {
    await prisma.issue.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    if (notFound(e)) return NextResponse.json({ error: "Issue not found." }, { status: 404 });
    throw e;
  }
}
