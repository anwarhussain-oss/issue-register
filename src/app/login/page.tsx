import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SESSION_COOKIE, safeNext, verifySessionToken } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in · Issue Register" };
export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  invalid: "Incorrect password. Please try again.",
  config: "Sign-in is not configured. Set SITE_PASSWORD on the server.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const dest = safeNext(next);

  // Already signed in? Skip the form.
  if (await verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value)) redirect(dest);

  const message = error ? ERRORS[error] ?? ERRORS.invalid : null;

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6" aria-hidden>
              <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Issue Register</h1>
          <p className="mt-1 text-sm text-slate-500">Enter the site password to continue.</p>
        </div>

        <form method="POST" action="/api/auth/login" className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <input type="hidden" name="next" value={dest} />
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoFocus
            autoComplete="current-password"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          {message && (
            <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {message}
            </p>
          )}
          <button
            type="submit"
            className="mt-4 w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
