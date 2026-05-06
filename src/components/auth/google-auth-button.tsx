"use client";

import { LogIn, LogOut } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";

type GoogleAuthButtonProps = {
  callbackUrl?: string;
};

export function GoogleAuthButton({ callbackUrl = "/" }: GoogleAuthButtonProps) {
  const { data: session, status } = useSession();
  const user = session?.user;

  if (status === "loading") {
    return (
      <div className="h-10 w-40 animate-pulse rounded-lg bg-slate-100" />
    );
  }

  if (status === "authenticated" && user) {
    return (
      <div className="flex w-full flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:w-auto sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-3">
          {user.image ? (
            <img
              src={user.image}
              alt={user.name ? `${user.name} profile photo` : "Profile photo"}
              className="h-10 w-10 shrink-0 rounded-full border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white">
              {(user.name ?? user.email ?? "U").slice(0, 1).toUpperCase()}
            </div>
          )}

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              {user.name ?? "Signed in"}
            </p>
            {user.email ? (
              <p className="truncate text-xs font-medium text-slate-500">
                {user.email}
              </p>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={() => signOut({ callbackUrl })}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
        >
          <LogOut size={16} aria-hidden="true" />
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => signIn("google", { callbackUrl })}
      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 sm:w-auto"
    >
      <LogIn size={16} aria-hidden="true" />
      Sign in with Google
    </button>
  );
}
