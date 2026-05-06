'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from 'next-themes';

export function Providers({ children, ...props }: ThemeProviderProps) {
  return (
    <SessionProvider>
      <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem={false} {...props}>
        {children}
      </NextThemesProvider>
    </SessionProvider>
  );
}
