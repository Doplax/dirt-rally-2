import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import type { Role } from '@prisma/client';

const credentialsSchema = z.object({
  username: z.string().min(1).max(64),
  password: z.string().min(1),
});

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username: string;
      role: Role;
      mustChangePassword: boolean;
    } & DefaultSession['user'];
  }

  interface User {
    id?: string;
    username: string;
    role: Role;
    mustChangePassword: boolean;
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id: string;
    username: string;
    role: Role;
    mustChangePassword: boolean;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Usuario', type: 'text' },
        password: { label: 'Contraseña', type: 'password' },
      },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { username: parsed.data.username },
        });
        if (!user) return null;

        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          username: user.username,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
          name: user.username,
          image: user.photoUrl ?? null,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user, trigger, session }) => {
      if (user) {
        token.id = user.id ?? token.sub ?? '';
        token.username = user.username;
        token.role = user.role;
        token.mustChangePassword = user.mustChangePassword;
      }

      if (trigger === 'update' && session && typeof session === 'object') {
        const incoming = session as Partial<{
          mustChangePassword: boolean;
          username: string;
          role: Role;
        }>;
        if (typeof incoming.mustChangePassword === 'boolean') {
          token.mustChangePassword = incoming.mustChangePassword;
        }
        if (incoming.username) token.username = incoming.username;
        if (incoming.role) token.role = incoming.role;
      }

      return token;
    },
    session: async ({ session, token }) => {
      session.user.id = token.id;
      session.user.username = token.username;
      session.user.role = token.role;
      session.user.mustChangePassword = token.mustChangePassword;
      return session;
    },
  },
});
