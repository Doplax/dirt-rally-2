'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { AuthError, requireAdmin, requireSession } from '@/lib/permissions';
import { UploadError, saveUpload } from '@/lib/uploads';
import type { ActionResult } from '@/server/actions/locations';

const carSchema = z.object({
  name: z.string().min(1, 'Nombre obligatorio').max(120),
  className: z.string().min(1, 'Clase obligatoria').max(120),
  classCode: z.string().min(1, 'Código de clase obligatorio').max(64),
  drivetrain: z.string().max(8).optional().nullable(),
  year: z
    .union([z.coerce.number().int().min(1950).max(2100), z.literal('').transform(() => undefined)])
    .optional()
    .nullable(),
  isDlc: z.boolean(),
  dlcPack: z.string().max(120).optional().nullable(),
  isRallycross: z.boolean(),
});

function readBoolean(value: FormDataEntryValue | null): boolean {
  return value === 'true' || value === 'on' || value === '1';
}

function fail(err: unknown): ActionResult {
  if (err instanceof AuthError) return { ok: false, error: err.message };
  if (err instanceof UploadError) return { ok: false, error: err.message };
  if (err instanceof z.ZodError) return { ok: false, error: err.issues[0]?.message ?? 'Datos inválidos' };
  console.error('[cars action]', err);
  return { ok: false, error: 'Error inesperado' };
}

function payloadFromForm(formData: FormData) {
  return carSchema.parse({
    name: formData.get('name'),
    className: formData.get('className'),
    classCode: formData.get('classCode'),
    drivetrain: (formData.get('drivetrain') as string | null) || null,
    year: formData.get('year') ?? undefined,
    isDlc: readBoolean(formData.get('isDlc')),
    dlcPack: (formData.get('dlcPack') as string | null) || null,
    isRallycross: readBoolean(formData.get('isRallycross')),
  });
}

export async function createCar(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin();
    const data = payloadFromForm(formData);
    const car = await prisma.car.create({ data });
    revalidatePath('/coches');
    return { ok: true, data: { id: car.id } };
  } catch (err) {
    return fail(err);
  }
}

export async function updateCar(id: string, formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
    const data = payloadFromForm(formData);
    await prisma.car.update({ where: { id }, data });
    revalidatePath('/coches');
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteCar(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.car.delete({ where: { id } });
    revalidatePath('/coches');
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function toggleFavoriteCar(
  carId: string,
): Promise<ActionResult<{ favorited: boolean }>> {
  try {
    const user = await requireSession();
    const existing = await prisma.favoriteCar.findUnique({
      where: { userId_carId: { userId: user.id, carId } },
    });
    if (existing) {
      await prisma.favoriteCar.delete({
        where: { userId_carId: { userId: user.id, carId } },
      });
      revalidatePath('/coches');
      revalidatePath(`/coches/${carId}`);
      return { ok: true, data: { favorited: false } };
    }
    await prisma.favoriteCar.create({ data: { userId: user.id, carId } });
    revalidatePath('/coches');
    revalidatePath(`/coches/${carId}`);
    return { ok: true, data: { favorited: true } };
  } catch (err) {
    return fail(err);
  }
}

export async function uploadCarPhoto(id: string, formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: 'Selecciona un archivo' };
    }
    const photoUrl = await saveUpload(file, 'cars');
    await prisma.car.update({ where: { id }, data: { photoUrl } });
    revalidatePath('/coches');
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
