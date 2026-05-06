"use client";

import { Suspense, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

import { GoogleAuthButton } from "@/components/auth/google-auth-button";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const error = searchParams.get("error");

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(callbackUrl);
    }
  }, [callbackUrl, router, status]);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-lg border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <div className="absolute left-0 top-0 h-1.5 w-full bg-emerald-600" />

        <div className="mb-8 mt-2 flex items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-500 bg-emerald-600 text-xl font-bold text-white shadow-sm">
            S
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            SyncForge
          </h1>
        </div>

        <div className="mb-8 text-center">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Continue with Google to access your workspaces.
          </p>
        </div>

        {error ? (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            Sign-in failed: {error}. Try again, then check the server console if
            it repeats.
          </div>
        ) : null}

        <GoogleAuthButton callbackUrl={callbackUrl} />
      </div>

      <div className="absolute bottom-6 left-0 w-full text-center text-xs font-medium text-slate-400">
        &copy; 2026 Ternary Koders. Built for CodeKada Hackathon.
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
