import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-compatible Auth.js config: no Node-only imports (bcrypt, Prisma).
 * The Credentials provider that needs them lives in src/lib/auth.ts and is
 * only loaded inside the Node runtime. This config is consumed by middleware.
 */
export const authConfig = {
  // Auth.js v5 dropped NEXTAUTH_URL as the trust signal. Without trustHost
  // (or AUTH_TRUST_HOST=true) self-hosted and `npm run start` deployments
  // reject the request with UntrustedHost. Vercel auto-trusts, so this is
  // effectively a no-op there.
  trustHost: true,
  pages: {
    signIn: '/login',
  },
  providers: [],
  session: { strategy: 'jwt' },
  callbacks: {
    authorized: () => true,
  },
} satisfies NextAuthConfig;
