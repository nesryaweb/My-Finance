import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",

      credentials: {
        email: {
          label: "Email",
          type: "email",
        },

        password: {
          label: "Password",
          type: "password",
        },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = String(credentials.email)
          .trim()
          .toLowerCase();

        const password = String(credentials.password);

        const user = await prisma.user.findUnique({
          where: {
            email,
          },
        });

        if (!user) {
          return null;
        }

        const validPassword = await bcrypt.compare(
          password,
          user.passwordHash,
        );

        if (!validPassword) {
          return null;
        }

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],

  callbacks: {
    // ==================================================
    // JWT
    // ==================================================

    async jwt({ token, user }) {
      // Auth.js automatically stores the user ID
      // in token.sub.
      //
      // We don't need to create token.id.
      // token.sub already contains the database user ID.

      return token;
    },

    // ==================================================
    // SESSION
    // ==================================================

    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }

      return session;
    },
  },

  // ==================================================
  // SESSION STRATEGY
  // ==================================================

  session: {
    strategy: "jwt",
  },
});