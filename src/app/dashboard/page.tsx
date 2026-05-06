import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <section className="mx-auto max-w-3xl">
        <div className="mb-6">
          <p className="text-sm font-semibold text-emerald-700">Protected</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Dashboard
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            This page only renders after NextAuth confirms an active session.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-slate-500">User ID</dt>
              <dd className="mt-1 break-all font-medium text-slate-900">
                {session.user.id ?? "Not linked"}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-500">Name</dt>
              <dd className="mt-1 font-medium text-slate-900">
                {session.user.name ?? "No name provided"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-semibold text-slate-500">Email</dt>
              <dd className="mt-1 break-all font-medium text-slate-900">
                {session.user.email ?? "No email provided"}
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </main>
  );
}
