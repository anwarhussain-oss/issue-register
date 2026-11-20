import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_MAX_AGE, checkPassword, createSessionToken, getSitePassword, safeNext } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const password = typeof form?.get("password") === "string" ? (form!.get("password") as string) : "";
  const next = safeNext(form?.get("next"));

  const fail = (error: string) => {
    const url = new URL("/login", req.url);
    url.searchParams.set("error", error);
    if (next !== "/") url.searchParams.set("next", next);
    return NextResponse.redirect(url, 303);
  };

  if (!getSitePassword()) return fail("config");

  if (!(await checkPassword(password))) {
    // Small fixed delay to slow down guessing.
    await new Promise((r) => setTimeout(r, 750));
    return fail("invalid");
  }

  const res = NextResponse.redirect(new URL(next, req.url), 303);
  res.cookies.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
