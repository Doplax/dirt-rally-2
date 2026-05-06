'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { AuthError, requireAdmin } from '@/lib/permissions';
import { UploadError, saveUpload } from '@/lib/uploads';
import { Direction } from '@prisma/client';

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

const locationSchema = z.object({
  name: z.string().min(1, 'Nombre obligatorio').max(120),
  country: z.string().min(1, 'País obligatorio').max(120),
  surface: z.string().min(1, 'Superficie obligatoria').max(120),
  isDlc: z.boolean(),
  dlcPack: z.string().max(120).optional().nullable(),
});

const stageSchema = z.object({
  name: z.string().min(1, 'Nombre obligatorio').max(120),
  distanceKm: z.coerce.number().positive('Distancia > 0').max(99),
  direction: z.nativeEnum(Direction),
  locationId: z.string().min(1),
});

function fail(err: unknown): ActionResult {
  if (err instanceof AuthError) return { ok: false, error: err.message };
  if (err instanceof UploadError) return { ok: false, error: err.message };
  if (err instanceof z.ZodError) return { ok: false, error: err.issues[0]?.message ?? 'Datos inválidos' };
  console.error('[locations action]', err);
  return { ok: false, error: 'Error inesperado' };
}

function readBoolean(value: FormDataEntryValue | null): boolean {
  return value === 'true' || value === 'on' || value === '1';
}

export async function createLocation(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin();
    const parsed = locationSchema.parse({
      name: formData.get('name'),
      country: formData.get('country'),
      surface: formData.get('surface'),
      isDlc: readBoolean(formData.get('isDlc')),
      dlcPack: (formData.get('dlcPack') as string | null) || null,
    });

    const location = await prisma.location.create({ data: parsed });
    revalidatePath('/mapas');
    return { ok: true, data: { id: location.id } };
  } catch (err) {
    return fail(err);
  }
}

export async function updateLocation(id: string, formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = locationSchema.parse({
      name: formData.get('name'),
      country: formData.get('country'),
      surface: formData.get('surface'),
      isDlc: readBoolean(formData.get('isDlc')),
      dlcPack: (formData.get('dlcPack') as string | null) || null,
    });

    await prisma.location.update({ where: { id }, data: parsed });
    revalidatePath('/mapas');
    revalidatePath(`/mapas/${id}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteLocation(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.location.delete({ where: { id } });
    revalidatePath('/mapas');
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function uploadLocationPhoto(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: 'Selecciona un archivo' };
    }
    const photoUrl = await saveUpload(file, 'locations');
    await prisma.location.update({ where: { id }, data: { photoUrl } });
    revalidatePath('/mapas');
    revalidatePath(`/mapas/${id}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function createStage(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = stageSchema.parse({
      name: formData.get('name'),
      distanceKm: formData.get('distanceKm'),
      direction: formData.get('direction'),
      locationId: formData.get('locationId'),
    });

    await prisma.stage.create({ data: parsed });
    revalidatePath(`/mapas/${parsed.locationId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function updateStage(id: string, formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
    const parsed = stageSchema.parse({
      name: formData.get('name'),
      distanceKm: formData.get('distanceKm'),
      direction: formData.get('direction'),
      locationId: formData.get('locationId'),
    });

    const updated = await prisma.stage.update({ where: { id }, data: parsed });
    revalidatePath(`/mapas/${updated.locationId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteStage(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const stage = await prisma.stage.delete({ where: { id } });
    revalidatePath(`/mapas/${stage.locationId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
