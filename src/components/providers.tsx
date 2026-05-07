'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';

// The app is dark-only; the `dark` class is hard-coded on <html> in
// app/layout.tsx. We dropped next-themes because in React 19 its inline
// theme-flash <script> trips a "Encountered a script tag while rendering
// React component" warning, and we have nothing to toggle.
export function Providers({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
