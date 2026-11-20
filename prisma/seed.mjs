import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const day = (n) => new Date(Date.now() + n * 86400000);

const issues = [
  { title: "Login page times out on slow networks", description: "Users on 3G report the login request failing after 10s.", category: "Bug", priority: "High", status: "Open", assignee: "Aisha", dueDate: day(3) },
  { title: "Add CSV export to reports", description: "Finance team needs monthly reports as CSV.", category: "Feature", priority: "Medium", status: "In Progress", assignee: "Daniel", dueDate: day(10) },
  { title: "Database backups failing", description: "Nightly backup job exits with code 1 since Tuesday.", category: "Infrastructure", priority: "Critical", status: "In Progress", assignee: "Mei Ling", dueDate: day(1) },
  { title: "Typo on pricing page", description: "\"Anual\" should be \"Annual\".", category: "Content", priority: "Low", status: "Closed", assignee: "Ravi", dueDate: day(-2) },
  { title: "Update privacy policy", description: "Reflect new data retention rules.", category: "Compliance", priority: "Medium", status: "Open", assignee: "", dueDate: day(-1) },
];

const count = await prisma.issue.count();
if (count === 0) {
  await prisma.issue.createMany({ data: issues });
  console.log(`Seeded ${issues.length} issues.`);
} else {
  console.log(`Database already has ${count} issues; skipping seed.`);
}
await prisma.$disconnect();
