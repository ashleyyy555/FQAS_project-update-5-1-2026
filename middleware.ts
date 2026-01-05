// middleware.ts
import NextAuth from "next-auth";
import authConfig from "./auth.config";

// create an edge-safe auth instance that does NOT touch Prisma
export const { auth: middleware } = NextAuth(authConfig);

// keep your route matcher (adjust if yours is different)
export const config = {
  matcher: ["/main/:path*"],
};
