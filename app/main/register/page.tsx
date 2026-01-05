"use server";

import { register } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export default async function RegisterPage({ searchParams }: any) {
  // 🔒 Admin-only check
  const session = await auth();
  const currentUserId = session?.user?.id;

  if (!currentUserId) redirect("/auth/signin?error=Admin+access+required");

  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
  });

  if (!currentUser?.isAdmin) redirect("/auth/signin?error=Admin+access+required");

  const error = searchParams?.error ? String(searchParams.error) : undefined;
  const prefill = searchParams?.username ? String(searchParams.username) : "";

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg mx-4">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Create an account</h2>
        </div>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded">
            {decodeURIComponent(error)}
          </div>
        )}

        {/* Server action */}
        <form action={register} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Username</label>
            <input
              name="username"
              defaultValue={prefill}
              className="mt-1 w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="your username"
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
              autoComplete="new-password"
              minLength={8}
            />
          </div>

          {/* Admin checkbox */}
          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              id="isAdmin"
              name="isAdmin"
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
            />
            <label htmlFor="isAdmin" className="text-sm text-gray-700">
              Make this user an admin
            </label>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            Create account
          </button>
        </form>
      </div>
    </div>
  );
}
