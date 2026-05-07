import { auth } from '@/lib/auth';
import type { Role } from '@prisma/client';

export type SessionUser = {
  id: string;
  username: string;
  role: Role;
  mustChangePassword: boolean;
};

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export async function requireSession(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) throw new AuthError('Sesión requerida', 401);
  return session.user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireSession();
  if (user.role !== 'ADMIN') throw new AuthError('Solo administradores', 403);
  return user;
}
