import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-compatible Auth.js config: no Node-only imports (bcrypt, Prisma).
 * The Credentials provider that needs them lives in src/lib/auth.ts and is
 * only loaded inside the Node runtime. This config is consumed by middleware.
 */
export const authConfig = {
  pages: {
    signIn: '/login',
  },
  providers: [],
  session: { strategy: 'jwt' },
  callbacks: {
    authorized: () => true,
  },
} satisfies NextAuthConfig;
