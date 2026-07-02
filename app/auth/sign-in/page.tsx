import Link from "next/link";
import { redirect } from "next/navigation";
import { registerPath, safeRelativeReturnPath } from "../../app-auth";
import { getRegisteredUserCount } from "../../server/sqlite-store";

type SignInPageProps = {
  searchParams: Promise<{
    error?: string;
    return_to?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const returnTo = safeRelativeReturnPath(params.return_to ?? "/");
  const registeredUsers = await getRegisteredUserCount();

  if (registeredUsers === 0) {
    redirect(registerPath(returnTo));
  }

  return (
    <main className="min-h-screen bg-[#f6f7f3] px-4 py-12 text-stone-950 sm:px-6">
      <section className="mx-auto max-w-xl rounded-lg border border-stone-300 bg-white p-5">
        <p className="text-sm font-semibold text-teal-700">SecOps AI Workbench</p>
        <h1 className="mt-1 text-2xl font-semibold">Sign in</h1>
        {params.error ? (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">
            {decodeError(params.error)}
          </p>
        ) : null}

        <form action="/auth/sign-in/complete" className="mt-5 grid gap-4" method="post">
          <input name="return_to" type="hidden" value={returnTo} />
          <label className="grid gap-1.5 text-sm font-medium text-stone-700">
            <span>Email</span>
            <input
              autoComplete="email"
              className="rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-teal-700"
              name="email"
              required
              type="email"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-stone-700">
            <span>Password</span>
            <input
              autoComplete="current-password"
              className="rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-teal-700"
              name="password"
              required
              type="password"
            />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-4">
            <Link
              className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:border-stone-700"
              href="/"
            >
              Workbench
            </Link>
            <button
              className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
              type="submit"
            >
              Sign in
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

function decodeError(error: string) {
  if (error === "credentials") return "Email or password is incorrect.";
  if (error === "missing") return "Email and password are required.";
  return "Sign-in failed.";
}
