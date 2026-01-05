"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signIn, signOut, auth } from "@/auth"; // NextAuth v5
import { AuthError } from "next-auth";

/**
 * LOGIN
 * Everyone can login
 */
export async function login(formData: FormData) {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  const callbackUrl = String(formData.get("callbackUrl") || "/dashboard");

  if (!username || !password) {
    redirect(
      `/auth/signin?error=Missing+credentials&username=${encodeURIComponent(
        username
      )}`
    );
  }

  const exists = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (!exists) {
    // Redirect back to sign-in with a specific error message
    redirect(
      `/auth/signin?error=${encodeURIComponent(
        "Username does not exist"
      )}&username=${encodeURIComponent(username)}`
    );
  }

  try {
    await signIn("credentials", {
      username,
      password,
      redirectTo: callbackUrl,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(
        `/auth/signin?error=${encodeURIComponent(
          "Incorrect username or password"
        )}&username=${encodeURIComponent(username)}`
      );
    }
    throw error;
  }
}

/**
 * REGISTER (Admin-only)
 * Only admins can register new users
 */
export async function register(formData: FormData) {
  // Current logged-in user
  const session = await auth();
  const currentUserId = session?.user?.id;

  if (!currentUserId) {
    redirect("/auth/signin?error=Admin+access+required");
  }

  // Fetch current user
  const currentUser = await prisma.user.findUnique({
    where: { id: currentUserId },
  });

  // Only admins can register new users
  if (!currentUser?.isAdmin) {
    redirect("/auth/signin?error=Admin+access+required");
  }

  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  const isAdmin = formData.get("isAdmin") === "on"; // Checkbox support

  if (!username || !password) {
    redirect(
      `/register?error=Missing+fields&username=${encodeURIComponent(username)}`
    );
  }

  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) {
    redirect(
      `/register?error=Username+already+in+use&username=${encodeURIComponent(
        username
      )}`
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      username,
      passwordHash,
      isAdmin, // Use the checkbox value
    },
  });

  redirect(
    `/auth/signin?registered=1&username=${encodeURIComponent(username)}`
  );
}

/**
 * LOGOUT
 */
export async function logout() {
  await signOut({ redirectTo: "/auth/signin" });
}
