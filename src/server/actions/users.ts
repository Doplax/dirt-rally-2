'use server';

import bcrypt from 'bcrypt';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/db';
import { AuthError, requireAdmin, requireSession } from '@/lib/permissions';
import { UploadError, saveUpload } from '@/lib/uploads';
import type { ActionResult } from '@/server/actions/locations';

const DEFAULT_PASSWORD = 'P@ssw0rd';

const usernameSchema = z
  .string()
  .min(2, 'Mínimo 2 caracteres')
  .max(32, 'Máximo 32 caracteres')
  .regex(/^[A-Za-z0-9_-]+$/, 'Solo letras, números, guiones y guion bajo');

const emailSchema = z
  .union([
    z.literal('').transform(() => null),
    z.string().email('Email no válido').max(190),
  ])
  .optional()
  .nullable();

const createUserSchema = z.object({
  username: usernameSchema,
  role: z.nativeEnum(Role),
  email: emailSchema,
});

const updateUserSchema = z.object({
  username: usernameSchema,
  role: z.nativeEnum(Role),
  email: emailSchema,
});

const profileSchema = z.object({
  username: usernameSchema,
});

const passwordSchema = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .max(128);

function fail(err: unknown): ActionResult {
  if (err instanceof AuthError) return { ok: false, error: err.message };
  if (err instanceof UploadError) return { ok: false, error: err.message };
  if (err instanceof z.ZodError) return { ok: false, error: err.issues[0]?.message ?? 'Datos inválidos' };
  if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2002') {
    return { ok: false, error: 'Ese nombre de usuario ya existe' };
  }
  console.error('[users action]', err);
  return { ok: false, error: 'Error inesperado' };
}

export async function createUser(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = createUserSchema.parse({
      username: formData.get('username'),
      role: formData.get('role'),
      email: formData.get('email'),
    });

    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
    await prisma.user.create({
      data: {
        username: parsed.username,
        role: parsed.role,
        email: parsed.email ?? null,
        passwordHash,
        mustChangePassword: true,
      },
    });
    revalidatePath('/usuarios');
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function updateUser(id: string, formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = updateUserSchema.parse({
      username: formData.get('username'),
      role: formData.get('role'),
      email: formData.get('email'),
    });

    await prisma.user.update({
      where: { id },
      data: {
        username: parsed.username,
        role: parsed.role,
        email: parsed.email ?? null,
      },
    });
    revalidatePath('/usuarios');
    revalidatePath(`/usuarios/${id}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function uploadUserPhoto(id: string, formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: 'Selecciona un archivo' };
    }
    const photoUrl = await saveUpload(file, 'users');
    await prisma.user.update({ where: { id }, data: { photoUrl } });
    revalidatePath('/usuarios');
    revalidatePath(`/usuarios/${id}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteUser(id: string): Promise<ActionResult> {
  try {
    const me = await requireAdmin();
    if (id === me.id) {
      return { ok: false, error: 'No puedes borrar tu propio usuario' };
    }

    const referenced = await prisma.timeRecord.count({
      where: { OR: [{ runnerId: id }, { registrarId: id }] },
    });
    if (referenced > 0) {
      return {
        ok: false,
        error: `No se puede borrar: el usuario tiene ${referenced} tiempo(s) asociado(s)`,
      };
    }

    await prisma.user.delete({ where: { id } });
    revalidatePath('/usuarios');
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function resetUserPassword(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
    await prisma.user.update({
      where: { id },
      data: { passwordHash, mustChangePassword: true },
    });
    revalidatePath('/usuarios');
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function updateOwnProfile(formData: FormData): Promise<ActionResult> {
  try {
    const me = await requireSession();
    const parsed = profileSchema.parse({ username: formData.get('username') });
    await prisma.user.update({
      where: { id: me.id },
      data: { username: parsed.username },
    });
    revalidatePath('/perfil');
    revalidatePath('/usuarios');
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function uploadOwnPhoto(formData: FormData): Promise<ActionResult> {
  try {
    const me = await requireSession();
    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: 'Selecciona un archivo' };
    }
    const photoUrl = await saveUpload(file, 'users');
    await prisma.user.update({ where: { id: me.id }, data: { photoUrl } });
    revalidatePath('/perfil');
    revalidatePath('/usuarios');
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function changeOwnPassword(formData: FormData): Promise<ActionResult> {
  try {
    const me = await requireSession();
    const current = String(formData.get('currentPassword') ?? '');
    const next = passwordSchema.parse(formData.get('newPassword'));

    const user = await prisma.user.findUnique({ where: { id: me.id } });
    if (!user) return { ok: false, error: 'Usuario no encontrado' };

    const ok = await bcrypt.compare(current, user.passwordHash);
    if (!ok) return { ok: false, error: 'Contraseña actual incorrecta' };

    const passwordHash = await bcrypt.hash(next, 12);
    await prisma.user.update({
      where: { id: me.id },
      data: { passwordHash, mustChangePassword: false },
    });
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
