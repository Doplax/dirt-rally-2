/**
 * Vincula las imágenes de public/uploads/{cars,locations,stages} a las filas
 * correspondientes en la BD escribiendo el campo `photoUrl`.
 *
 * Hace match por slug del nombre. La convención es la misma que usa el
 * scraper IGCD (scripts/download-images.mjs):
 *   - cars/<slug-del-coche>.<ext>
 *   - locations/<slug-de-la-location>.<ext>
 *   - stages/<slug-de-la-location>__<slug-del-tramo>.<ext>
 *
 * Uso:  npx tsx scripts/link-photos.ts
 */

import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

const prisma = new PrismaClient();

const TRANSLIT: Record<string, string> = {
  Ł: 'L', ł: 'l', Đ: 'D', đ: 'd',
  Ø: 'O', ø: 'o', Æ: 'Ae', æ: 'ae',
  Œ: 'Oe', œ: 'oe', ß: 'ss',
};

function slugify(name: string): string {
  return name
    .replace(/[ŁłĐđØøÆæŒœß]/g, (c) => TRANSLIT[c] ?? c)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const UPLOADS_ROOT = path.join(process.cwd(), 'public', 'uploads');

function findFileBySlug(dir: string, slug: string): string | null {
  const full = path.join(UPLOADS_ROOT, dir);
  if (!fs.existsSync(full)) return null;
  const file = fs.readdirSync(full).find((f) => f.startsWith(slug + '.'));
  return file ? `/uploads/${dir}/${file}` : null;
}

async function linkCars() {
  const cars = await prisma.car.findMany({ select: { id: true, name: true, photoUrl: true } });
  let linked = 0;
  let missing = 0;
  for (const car of cars) {
    const slug = slugify(car.name);
    const url = findFileBySlug('cars', slug);
    if (!url) {
      console.log(`  ❌ ${car.name.padEnd(50)} (slug: ${slug})`);
      missing++;
      continue;
    }
    if (car.photoUrl !== url) {
      await prisma.car.update({ where: { id: car.id }, data: { photoUrl: url } });
      linked++;
    }
  }
  console.log(`✓ Cars: linked ${linked}, missing ${missing}, total ${cars.length}`);
}

async function linkLocationsAndStages() {
  const locations = await prisma.location.findMany({
    select: {
      id: true,
      name: true,
      photoUrl: true,
      stages: { select: { id: true, name: true, photoUrl: true } },
    },
  });

  let locLinked = 0, locMissing = 0;
  let stLinked = 0, stMissing = 0, stTotal = 0;

  for (const loc of locations) {
    const locSlug = slugify(loc.name);
    const locUrl = findFileBySlug('locations', locSlug);
    if (!locUrl) {
      console.log(`  ❌ [LOC] ${loc.name.padEnd(46)} (slug: ${locSlug})`);
      locMissing++;
    } else {
      if (loc.photoUrl !== locUrl) {
        await prisma.location.update({ where: { id: loc.id }, data: { photoUrl: locUrl } });
        locLinked++;
      }
    }

    for (const stage of loc.stages) {
      stTotal++;
      const stageSlug = `${locSlug}__${slugify(stage.name)}`;
      let url = findFileBySlug('stages', stageSlug);
      // Reverse no se descarga: comparte imagen con el forward del mismo nombre.
      if (!url) {
        const baseName = stage.name.replace(/\s+(Reverse|Forward)\s*$/i, '').trim();
        if (baseName !== stage.name) {
          url = findFileBySlug('stages', `${locSlug}__${slugify(baseName)}`);
        }
      }
      if (!url) {
        console.log(`    ❌ [STG] ${stage.name.padEnd(44)} (slug: ${stageSlug})`);
        stMissing++;
        continue;
      }
      if (stage.photoUrl !== url) {
        await prisma.stage.update({ where: { id: stage.id }, data: { photoUrl: url } });
        stLinked++;
      }
    }
  }

  console.log(`✓ Locations: linked ${locLinked}, missing ${locMissing}, total ${locations.length}`);
  console.log(`✓ Stages: linked ${stLinked}, missing ${stMissing}, total ${stTotal}`);
}

async function main() {
  console.log('🔗 Vinculando imágenes a la BD...\n');
  await linkCars();
  await linkLocationsAndStages();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
