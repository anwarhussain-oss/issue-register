import { prisma } from "@/lib/prisma";
import { serializeIssue } from "@/lib/issues";
import IssueRegister from "@/components/IssueRegister";

export const dynamic = "force-dynamic";

export default async function Home() {
  const issues = await prisma.issue.findMany({ orderBy: { createdAt: "desc" } });
  return <IssueRegister initialIssues={issues.map(serializeIssue)} />;
}
