'use server';

import bcrypt from 'bcrypt';
import { z } from 'zod';
import { auth, signOut } from '@/lib/auth';
import { prisma } from '@/lib/db';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Introduce tu contraseña actual'),
    newPassword: z
      .string()
      .min(8, 'La nueva contraseña debe tener al menos 8 caracteres')
      .max(128),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    path: ['newPassword'],
    message: 'La nueva contraseña debe ser distinta de la actual',
  });

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; error: string; field?: 'currentPassword' | 'newPassword' | 'confirmPassword' };

export async function changePassword(formData: FormData): Promise<ChangePasswordResult> {
  const session = await auth();
  if (!session) {
    return { ok: false, error: 'Sesión no válida' };
  }

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = typeof issue.path[0] === 'string' ? issue.path[0] : undefined;
    const allowedFields = ['currentPassword', 'newPassword', 'confirmPassword'] as const;
    type FieldName = (typeof allowedFields)[number];
    return {
      ok: false,
      error: issue.message,
      field: allowedFields.includes(field as FieldName) ? (field as FieldName) : undefined,
    };
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return { ok: false, error: 'Usuario no encontrado' };
  }

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    return { ok: false, error: 'La contraseña actual no es correcta', field: 'currentPassword' };
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      mustChangePassword: false,
    },
  });

  return { ok: true };
}

export async function logout() {
  await signOut({ redirectTo: '/login' });
}
