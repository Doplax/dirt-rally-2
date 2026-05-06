import { PrismaClient, Direction, Role } from '@prisma/client';
import bcrypt from 'bcrypt';
import fs from 'node:fs';
import path from 'node:path';

const prisma = new PrismaClient();

const DATA_DIR = path.join(process.cwd(), 'data');
const DEFAULT_PASSWORD = 'P@ssw0rd';

type SeedUser = { username: string; role: Role };

const SEED_USERS: SeedUser[] = [
  { username: 'Doplax', role: Role.ADMIN },
  { username: 'Willy', role: Role.USER },
  { username: 'Sugus', role: Role.USER },
  { username: 'Rega', role: Role.USER },
  { username: 'Arantxa', role: Role.USER },
];

type RawStage = {
  name: string;
  distance_km: number;
  direction: 'forward' | 'reverse';
};

type RawLocation = {
  id: string;
  name: string;
  country: string;
  surface: string;
  dlc: boolean;
  dlc_pack?: string;
  stages: RawStage[];
};

type RawMapsFile = {
  rally_locations: RawLocation[];
};

type RawCar = {
  name: string;
  dlc: boolean;
  dlc_pack?: string;
};

type RawCarClass = {
  class_name: string;
  cars: RawCar[];
};

type RawCarsFile = {
  rally_cars: Record<string, RawCarClass>;
  rallycross_cars: Record<string, RawCarClass>;
};

function readJson<T>(file: string): T {
  const fullPath = path.join(DATA_DIR, file);
  return JSON.parse(fs.readFileSync(fullPath, 'utf8')) as T;
}

function inferDrivetrain(classCode: string): string | null {
  if (classCode.endsWith('_FWD')) return 'FWD';
  if (classCode.endsWith('_RWD')) return 'RWD';
  if (classCode.endsWith('_4WD')) return '4WD';
  if (classCode === 'R5' || classCode === 'NR4_R4' || classCode === 'GROUP_A') return '4WD';
  if (classCode === 'R2' || classCode === 'F2_KIT_CAR' || classCode === 'SUPER_1600') return 'FWD';
  if (classCode === 'MODERN_GT') return 'RWD';
  if (classCode === 'SUPERCARS' || classCode === 'SUPERCARS_2019' || classCode === 'LITES') return '4WD';
  if (classCode === 'GROUP_B_RX') return '4WD';
  if (classCode === 'CROSSKARTS') return 'RWD';
  return null;
}

function mapDirection(raw: string): Direction {
  return raw.toLowerCase() === 'reverse' ? Direction.REVERSE : Direction.FORWARD;
}

async function seedUsers() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
  for (const user of SEED_USERS) {
    await prisma.user.upsert({
      where: { username: user.username },
      update: {},
      create: {
        username: user.username,
        passwordHash,
        role: user.role,
        mustChangePassword: true,
      },
    });
  }
  console.log(`✓ Seeded ${SEED_USERS.length} users`);
}

async function seedLocations() {
  const data = readJson<RawMapsFile>('dirt_rally_2_mapas.json');

  for (const loc of data.rally_locations) {
    const location = await prisma.location.upsert({
      where: { name_country: { name: loc.name, country: loc.country } },
      update: {
        surface: loc.surface,
        isDlc: loc.dlc,
        dlcPack: loc.dlc_pack ?? null,
      },
      create: {
        name: loc.name,
        country: loc.country,
        surface: loc.surface,
        isDlc: loc.dlc,
        dlcPack: loc.dlc_pack ?? null,
      },
    });

    for (const stage of loc.stages) {
      await prisma.stage.upsert({
        where: { name_locationId: { name: stage.name, locationId: location.id } },
        update: {
          distanceKm: stage.distance_km,
          direction: mapDirection(stage.direction),
        },
        create: {
          name: stage.name,
          distanceKm: stage.distance_km,
          direction: mapDirection(stage.direction),
          locationId: location.id,
        },
      });
    }
  }

  const counts = {
    locations: await prisma.location.count(),
    stages: await prisma.stage.count(),
  };
  console.log(`✓ Seeded ${counts.locations} locations and ${counts.stages} stages`);
}

async function seedCars() {
  const data = readJson<RawCarsFile>('dirt_rally_2_coches.json');

  const groups: Array<{ classes: Record<string, RawCarClass>; rallycross: boolean }> = [
    { classes: data.rally_cars, rallycross: false },
    { classes: data.rallycross_cars, rallycross: true },
  ];

  for (const group of groups) {
    for (const [classCode, klass] of Object.entries(group.classes)) {
      const drivetrain = inferDrivetrain(classCode);
      for (const car of klass.cars) {
        await prisma.car.upsert({
          where: { name: car.name },
          update: {
            className: klass.class_name,
            classCode,
            drivetrain,
            isDlc: car.dlc,
            dlcPack: car.dlc_pack ?? null,
            isRallycross: group.rallycross,
          },
          create: {
            name: car.name,
            className: klass.class_name,
            classCode,
            drivetrain,
            isDlc: car.dlc,
            dlcPack: car.dlc_pack ?? null,
            isRallycross: group.rallycross,
          },
        });
      }
    }
  }

  console.log(`✓ Seeded ${await prisma.car.count()} cars`);
}

async function main() {
  await seedUsers();
  await seedLocations();
  await seedCars();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
