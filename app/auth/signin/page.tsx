// app/auth/signin/page.tsx

import { login } from "@/lib/auth";
import Link from "next/link";

type ParamsShape = { [key: string]: string | string[] | undefined };

function first(param: string | string[] | undefined): string | undefined {
  return Array.isArray(param) ? param[0] : param;
}

function safeDecode(v: string | undefined): string | undefined {
  if (!v) return v;
  try {
    return decodeURIComponent(v);
  } catch {
    return v; // already decoded or not URI-encoded
  }
}

export default async function SignInPage({
  searchParams,
}: {
  // In Next.js App Router, searchParams is async and can include arrays
  searchParams: Promise<ParamsShape>;
}) {
  const params = await searchParams;

  const errorRaw = first(params.error);
  const error = safeDecode(errorRaw);
  const prefill = first(params.username) ?? "";
  const registered = first(params.registered) === "1";

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg mx-4">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Finishing QA Monitoring System</h2>
          <p className="text-gray-600">Log in to key in and view database</p>
        </div>

        {registered && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 p-3 rounded">
            Registration successful. You can sign in now.
          </div>
        )}

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded">
            {error}
          </div>
        )}

        <form action={login} className="mt-6 space-y-4">
          <input type="hidden" name="callbackUrl" value="/main" />

          <div>
            <label className="block text-sm font-medium text-gray-700">Username</label>
            <input
              name="username"
              defaultValue={prefill}
              className="mt-1 w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Username"
              required
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              name="password"
              type="password"
              className="mt-1 w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
