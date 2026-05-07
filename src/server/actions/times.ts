'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { InputDevice, TimeOfDay, Weather } from '@prisma/client';
import { prisma } from '@/lib/db';
import { AuthError, requireSession } from '@/lib/permissions';
import { stringToMs } from '@/lib/time-format';
import type { ActionResult } from '@/server/actions/locations';

const TIME_LIKE = z
  .string()
  .min(1, 'Introduce un tiempo')
  .transform((value, ctx) => {
    const ms = stringToMs(value);
    if (ms === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Formato MM:SS.mmm inválido' });
      return z.NEVER;
    }
    return ms;
  });

const baseSchema = z.object({
  runnerId: z.string().min(1, 'Selecciona un piloto'),
  stageId: z.string().min(1),
  carId: z.string().min(1, 'Selecciona un coche'),
  weather: z.nativeEnum(Weather),
  timeOfDay: z.nativeEnum(TimeOfDay),
  inputDevice: z.nativeEnum(InputDevice),
  usesVr: z.boolean(),
  notes: z.string().max(500).optional().nullable(),
  isDnf: z.boolean(),
  penaltyMs: z.coerce.number().int().min(0).default(0),
});

function readBoolean(v: FormDataEntryValue | null): boolean {
  return v === 'true' || v === 'on' || v === '1';
}

function fail(err: unknown): ActionResult {
  if (err instanceof AuthError) return { ok: false, error: err.message };
  if (err instanceof z.ZodError) return { ok: false, error: err.issues[0]?.message ?? 'Datos inválidos' };
  console.error('[times action]', err);
  return { ok: false, error: 'Error inesperado' };
}

function payloadFromForm(formData: FormData) {
  const isDnf = readBoolean(formData.get('isDnf'));
  const timeRaw = (formData.get('time') as string | null) ?? '';
  const penaltyRaw = (formData.get('penalty') as string | null) ?? '';

  let timeMs = 0;
  if (!isDnf) {
    const parsed = TIME_LIKE.safeParse(timeRaw);
    if (!parsed.success) {
      throw parsed.error;
    }
    timeMs = parsed.data;
  }

  let penaltyMs = 0;
  if (penaltyRaw.trim()) {
    const parsed = TIME_LIKE.safeParse(penaltyRaw);
    if (!parsed.success) {
      throw parsed.error;
    }
    penaltyMs = parsed.data;
  }

  const base = baseSchema.parse({
    runnerId: formData.get('runnerId'),
    stageId: formData.get('stageId'),
    carId: formData.get('carId'),
    weather: formData.get('weather'),
    timeOfDay: formData.get('timeOfDay'),
    inputDevice: formData.get('inputDevice'),
    usesVr: readBoolean(formData.get('usesVr')),
    notes: (formData.get('notes') as string | null) || null,
    isDnf,
    penaltyMs,
  });

  return { ...base, timeMs };
}

export async function createTimeRecord(formData: FormData): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const data = payloadFromForm(formData);

    await prisma.timeRecord.create({
      data: {
        ...data,
        registrarId: session.id,
      },
    });

    revalidatePath('/tiempos');
    revalidatePath(`/tiempos/${data.stageId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function updateTimeRecord(id: string, formData: FormData): Promise<ActionResult> {
  try {
    await requireSession();
    const data = payloadFromForm(formData);
    await prisma.timeRecord.update({
      where: { id },
      data,
    });
    revalidatePath('/tiempos');
    revalidatePath(`/tiempos/${data.stageId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteTimeRecord(id: string): Promise<ActionResult> {
  try {
    await requireSession();
    const deleted = await prisma.timeRecord.delete({ where: { id } });
    revalidatePath('/tiempos');
    revalidatePath(`/tiempos/${deleted.stageId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
