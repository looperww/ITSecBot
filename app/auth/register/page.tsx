import Link from "next/link";
import { getCurrentUser, safeRelativeReturnPath, signInPath } from "../../app-auth";
import { getRegisteredUserCount } from "../../server/sqlite-store";
import { redirect } from "next/navigation";

type RegisterPageProps = {
  searchParams: Promise<{
    error?: string;
    return_to?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const returnTo = safeRelativeReturnPath(params.return_to ?? "/");
  const registeredUsers = await getRegisteredUserCount();
  const currentUser = registeredUsers > 0 ? await getCurrentUser() : null;

  if (registeredUsers > 0 && !currentUser) {
    redirect(signInPath("/"));
  }

  const canCreateUser = registeredUsers === 0 || currentUser?.role === "admin";

  return (
    <main className="min-h-screen bg-[#f6f7f3] px-4 py-12 text-stone-950 sm:px-6">
      <section className="mx-auto max-w-xl rounded-lg border border-stone-300 bg-white p-5">
        <p className="text-sm font-semibold text-teal-700">SecOps AI Workbench</p>
        <h1 className="mt-1 text-2xl font-semibold">
          {registeredUsers === 0 ? "Create admin account" : "Create user account"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-stone-700">
          {registeredUsers === 0
            ? "The first account becomes the administrator for this self-hosted app."
            : "Only an administrator can create additional user accounts."}
        </p>
        {params.error ? (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800">
            {decodeError(params.error)}
          </p>
        ) : null}

        {canCreateUser ? (
          <form action="/auth/register/complete" className="mt-5 grid gap-4" method="post">
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
              <span>Display name</span>
              <input
                autoComplete="name"
                className="rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-teal-700"
                name="display_name"
                required
                type="text"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-stone-700">
              <span>Password</span>
              <input
                autoComplete="new-password"
                className="rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-teal-700"
                minLength={12}
                name="password"
                required
                type="password"
              />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-4">
              <Link
                className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:border-stone-700"
                href={registeredUsers === 0 ? signInPath(returnTo) : "/settings"}
              >
                Cancel
              </Link>
              <button
                className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
                type="submit"
              >
                Create account
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-4">
            <Link
              className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:border-stone-700"
              href="/"
            >
              Workbench
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}

function decodeError(error: string) {
  if (error === "duplicate") return "A user with this email already exists.";
  if (error === "forbidden") return "Administrator access is required.";
  if (error === "max-users") return "The maximum number of users has been reached.";
  if (error === "password") return "Password must be at least 12 characters.";
  if (error === "missing") return "Email, display name, and password are required.";
  return "Account creation failed.";
}
