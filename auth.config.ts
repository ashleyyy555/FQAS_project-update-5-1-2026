// auth.config.ts
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

const authConfig = {
  // Minimal, edge-safe provider so the type is satisfied
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      // IMPORTANT: no prisma / db here, this runs in Edge (middleware)
      async authorize() {
        // Middleware never actually calls authorize in practice,
        // so we can safely return null here.
        return null;
      },
    }),
  ],

  session: { strategy: "jwt" },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const t = token as {
          id?: string;
          username?: string;
          isAdmin?: boolean;
          [key: string]: any;
        };

        t.id = (user as any).id;
        t.username = (user as any).username;
        t.isAdmin = (user as any).isAdmin;
        return t;
      }
      return token;
    },

    async session({ session, token }) {
      const t = token as {
        id?: string;
        username?: string;
        isAdmin?: boolean;
        [key: string]: any;
      };

      if (session.user) {
        (session.user as any).id = t.id;
        (session.user as any).username = t.username;
        (session.user as any).isAdmin = t.isAdmin;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;
