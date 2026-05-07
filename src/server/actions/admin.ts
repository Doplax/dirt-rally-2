'use server';

import { z } from 'zod';
import { prisma } from '@/lib/db';
import { AuthError, requireAdmin } from '@/lib/permissions';
import { Direction, InputDevice, Role, TimeOfDay, Weather } from '@prisma/client';
import type { ActionResult } from '@/server/actions/locations';

/** Neon free-tier quota in bytes (0.5 GiB). Override with NEON_QUOTA_BYTES. */
const DEFAULT_QUOTA_BYTES = 512 * 1024 * 1024;

export type DatabaseUsage = {
  usedBytes: number;
  quotaBytes: number;
};

function fail(err: unknown): ActionResult {
  if (err instanceof AuthError) return { ok: false, error: err.message };
  if (err instanceof z.ZodError) return { ok: false, error: err.issues[0]?.message ?? 'Datos inválidos' };
  console.error('[admin action]', err);
  return { ok: false, error: err instanceof Error ? err.message : 'Error inesperado' };
}

function quotaBytes(): number {
  const env = process.env.NEON_QUOTA_BYTES;
  if (!env) return DEFAULT_QUOTA_BYTES;
  const parsed = Number(env);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_QUOTA_BYTES;
}

export async function getDatabaseUsage(): Promise<ActionResult<DatabaseUsage>> {
  try {
    await requireAdmin();
    const rows = await prisma.$queryRaw<Array<{ size: bigint }>>`
      SELECT pg_database_size(current_database()) AS size
    `;
    const used = Number(rows[0]?.size ?? BigInt(0));
    return { ok: true, data: { usedBytes: used, quotaBytes: quotaBytes() } };
  } catch (err) {
    return fail(err) as ActionResult<DatabaseUsage>;
  }
}

export type TableUsage = {
  name: string;
  /** pg_total_relation_size — table heap + indexes + toast. */
  totalBytes: number;
  /** pg_relation_size — heap only. */
  dataBytes: number;
  /** pg_indexes_size — sum of indexes on the table. */
  indexBytes: number;
  /** Estimated row count from pg_class.reltuples (refreshed by ANALYZE). */
  rowEstimate: number;
};

export async function getTableSizes(): Promise<ActionResult<TableUsage[]>> {
  try {
    await requireAdmin();
    // pg_class is the system catalog of tables/indexes/etc. We restrict to
    // user tables in the public schema (relkind 'r') so internal Postgres
    // bookkeeping isn't surfaced to the admin UI.
    const rows = await prisma.$queryRaw<
      Array<{
        name: string;
        total_bytes: bigint;
        data_bytes: bigint;
        index_bytes: bigint;
        row_estimate: number;
      }>
    >`
      SELECT
        c.relname                          AS name,
        pg_total_relation_size(c.oid)      AS total_bytes,
        pg_relation_size(c.oid)            AS data_bytes,
        pg_indexes_size(c.oid)             AS index_bytes,
        c.reltuples::float8                AS row_estimate
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
      ORDER BY pg_total_relation_size(c.oid) DESC
    `;
    return {
      ok: true,
      data: rows.map((r) => ({
        name: r.name,
        totalBytes: Number(r.total_bytes),
        dataBytes: Number(r.data_bytes),
        indexBytes: Number(r.index_bytes),
        rowEstimate: Math.max(0, Math.round(r.row_estimate)),
      })),
    };
  } catch (err) {
    return fail(err) as ActionResult<TableUsage[]>;
  }
}

const BACKUP_VERSION = 1;

export type BackupPayload = {
  version: number;
  exportedAt: string;
  users: Array<{
    id: string;
    username: string;
    email: string | null;
    passwordHash: string;
    photoUrl: string | null;
    role: Role;
    mustChangePassword: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  locations: Array<{
    id: string;
    name: string;
    country: string;
    surface: string;
    isDlc: boolean;
    dlcPack: string | null;
    photoUrl: string | null;
  }>;
  stages: Array<{
    id: string;
    name: string;
    distanceKm: number;
    direction: Direction;
    locationId: string;
    photoUrl: string | null;
  }>;
  cars: Array<{
    id: string;
    name: string;
    className: string;
    classCode: string;
    drivetrain: string | null;
    year: number | null;
    isDlc: boolean;
    dlcPack: string | null;
    isRallycross: boolean;
    photoUrl: string | null;
  }>;
  favoriteCars: Array<{
    userId: string;
    carId: string;
    createdAt: string;
  }>;
  timeRecords: Array<{
    id: string;
    runnerId: string;
    registrarId: string;
    stageId: string;
    carId: string;
    timeMs: number;
    penaltyMs: number;
    isDnf: boolean;
    weather: Weather;
    timeOfDay: TimeOfDay;
    inputDevice: InputDevice;
    usesVr: boolean;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
};

export async function exportDatabase(): Promise<ActionResult<BackupPayload>> {
  try {
    await requireAdmin();
    const [users, locations, stages, cars, favoriteCars, timeRecords] = await Promise.all([
      prisma.user.findMany(),
      prisma.location.findMany(),
      prisma.stage.findMany(),
      prisma.car.findMany(),
      prisma.favoriteCar.findMany(),
      prisma.timeRecord.findMany(),
    ]);

    const payload: BackupPayload = {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      users: users.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
      })),
      locations,
      stages,
      cars,
      favoriteCars: favoriteCars.map((f) => ({ ...f, createdAt: f.createdAt.toISOString() })),
      timeRecords: timeRecords.map((t) => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
    };

    return { ok: true, data: payload };
  } catch (err) {
    return fail(err) as ActionResult<BackupPayload>;
  }
}

const dateLike = z.string().refine((s) => !Number.isNaN(Date.parse(s)), {
  message: 'Fecha inválida',
});

const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().nullable(),
  passwordHash: z.string(),
  photoUrl: z.string().nullable(),
  role: z.enum(['ADMIN', 'USER']),
  mustChangePassword: z.boolean(),
  createdAt: dateLike,
  updatedAt: dateLike,
});

const locationSchema = z.object({
  id: z.string(),
  name: z.string(),
  country: z.string(),
  surface: z.string(),
  isDlc: z.boolean(),
  dlcPack: z.string().nullable(),
  photoUrl: z.string().nullable(),
});

const stageSchema = z.object({
  id: z.string(),
  name: z.string(),
  distanceKm: z.number(),
  direction: z.enum(['FORWARD', 'REVERSE']),
  locationId: z.string(),
  photoUrl: z.string().nullable(),
});

const carSchema = z.object({
  id: z.string(),
  name: z.string(),
  className: z.string(),
  classCode: z.string(),
  drivetrain: z.string().nullable(),
  year: z.number().nullable(),
  isDlc: z.boolean(),
  dlcPack: z.string().nullable(),
  isRallycross: z.boolean(),
  photoUrl: z.string().nullable(),
});

const favoriteCarSchema = z.object({
  userId: z.string(),
  carId: z.string(),
  createdAt: dateLike,
});

const timeRecordSchema = z.object({
  id: z.string(),
  runnerId: z.string(),
  registrarId: z.string(),
  stageId: z.string(),
  carId: z.string(),
  timeMs: z.number().int(),
  penaltyMs: z.number().int(),
  isDnf: z.boolean(),
  weather: z.enum(['DRY', 'WET', 'SNOW', 'ICE']),
  timeOfDay: z.enum(['DAY', 'NIGHT', 'DUSK', 'DAWN']),
  inputDevice: z.enum(['GAMEPAD', 'WHEEL']),
  usesVr: z.boolean(),
  notes: z.string().nullable(),
  createdAt: dateLike,
  updatedAt: dateLike,
});

const backupSchema = z.object({
  version: z.number(),
  exportedAt: z.string().optional(),
  users: z.array(userSchema),
  locations: z.array(locationSchema),
  stages: z.array(stageSchema),
  cars: z.array(carSchema),
  favoriteCars: z.array(favoriteCarSchema),
  timeRecords: z.array(timeRecordSchema),
});

export type RestoreResult = {
  users: number;
  locations: number;
  stages: number;
  cars: number;
  favoriteCars: number;
  timeRecords: number;
};

export async function restoreDatabase(payload: unknown): Promise<ActionResult<RestoreResult>> {
  try {
    await requireAdmin();
    const data = backupSchema.parse(payload);
    if (data.version !== BACKUP_VERSION) {
      return { ok: false, error: `Versión de backup no compatible (esperada ${BACKUP_VERSION})` };
    }

    await prisma.$transaction(async (tx) => {
      // Wipe in reverse dependency order.
      await tx.timeRecord.deleteMany();
      await tx.favoriteCar.deleteMany();
      await tx.stage.deleteMany();
      await tx.location.deleteMany();
      await tx.car.deleteMany();
      await tx.user.deleteMany();

      // Reload in dependency order with parsed dates.
      if (data.users.length) {
        await tx.user.createMany({
          data: data.users.map((u) => ({
            ...u,
            createdAt: new Date(u.createdAt),
            updatedAt: new Date(u.updatedAt),
          })),
        });
      }
      if (data.locations.length) {
        await tx.location.createMany({ data: data.locations });
      }
      if (data.stages.length) {
        await tx.stage.createMany({ data: data.stages });
      }
      if (data.cars.length) {
        await tx.car.createMany({ data: data.cars });
      }
      if (data.favoriteCars.length) {
        await tx.favoriteCar.createMany({
          data: data.favoriteCars.map((f) => ({ ...f, createdAt: new Date(f.createdAt) })),
        });
      }
      if (data.timeRecords.length) {
        await tx.timeRecord.createMany({
          data: data.timeRecords.map((t) => ({
            ...t,
            createdAt: new Date(t.createdAt),
            updatedAt: new Date(t.updatedAt),
          })),
        });
      }
    });

    return {
      ok: true,
      data: {
        users: data.users.length,
        locations: data.locations.length,
        stages: data.stages.length,
        cars: data.cars.length,
        favoriteCars: data.favoriteCars.length,
        timeRecords: data.timeRecords.length,
      },
    };
  } catch (err) {
    return fail(err) as ActionResult<RestoreResult>;
  }
}
