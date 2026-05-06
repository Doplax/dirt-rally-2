/**
 * DiRT Rally 2.0 — Image scraper (IGCD edition)
 *
 * Descarga imágenes desde IGCD.net (Internet Game Cars Database):
 *   - Coches:          1 foto in-game por coche.
 *   - Localizaciones:  1 foto por TRAMO (en IGCD las stages tienen su propia
 *                      imagen). Se elige una por location como portada.
 *   - Tramos:          1 foto in-game para cada tramo individual.
 *
 * IGCD es la mejor fuente porque:
 *   - Tiene TODOS los coches y todos los tramos del juego.
 *   - URLs públicas, sin API ni rate limit agresivo.
 *   - Fotos in-game reales (no placeholders, no portadas, no logos).
 *
 * Uso:
 *   node scripts/download-images.mjs
 *   node scripts/download-images.mjs --cars
 *   node scripts/download-images.mjs --locations
 *   node scripts/download-images.mjs --stages
 *   node scripts/download-images.mjs --force
 *
 * Requisitos: Node.js 18+ (fetch nativo, sin dependencias).
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// --- CONFIG ---------------------------------------------------------------

const IGCD_BASE = 'http://www.igcd.net';
const IGCD_GAME_ID = '1000013490'; // DiRT Rally 2.0
const USER_AGENT =
  'DiRT-Tracker/1.0 (Personal project; node-script; contact: doplax@local)';
const RATE_LIMIT_MS = 600;

const CARS_JSON = path.join(ROOT, 'data', 'dirt_rally_2_coches.json');
const MAPS_JSON = path.join(ROOT, 'data', 'dirt_rally_2_mapas.json');
const CARS_DIR = path.join(ROOT, 'public', 'uploads', 'cars');
const LOCATIONS_DIR = path.join(ROOT, 'public', 'uploads', 'locations');
const STAGES_DIR = path.join(ROOT, 'public', 'uploads', 'stages');
const REPORT_FILE = path.join(__dirname, 'scrape-report.json');

const args = new Set(process.argv.slice(2));
const DO_CARS = args.size === 0 || args.has('--cars');
const DO_LOCATIONS = args.size === 0 || args.has('--locations');
const DO_STAGES = args.size === 0 || args.has('--stages');
const FORCE = args.has('--force');

// --- HELPERS --------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const TRANSLIT = {
  Ł: 'L', ł: 'l', Đ: 'D', đ: 'd',
  Ø: 'O', ø: 'o', Æ: 'Ae', æ: 'ae',
  Œ: 'Oe', œ: 'oe', ß: 'ss',
};

function slugify(name) {
  return name
    .replace(/[ŁłĐđØøÆæŒœß]/g, (c) => TRANSLIT[c] ?? c)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function detectExt(buf) {
  if (buf.length < 12) return 'bin';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'gif';
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return 'webp';
  return 'bin';
}

async function existingFileWithSlug(dir, slug) {
  try {
    const files = await fs.readdir(dir);
    return files.find((f) => f.startsWith(slug + '.')) || null;
  } catch {
    return null;
  }
}

async function downloadImage(url, dir, slug) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const ext = detectExt(buf);
  if (ext === 'bin') throw new Error(`Unrecognized image format (${buf.length} bytes)`);
  const filename = `${slug}.${ext}`;
  await fs.writeFile(path.join(dir, filename), buf);
  return { filename, bytes: buf.byteLength };
}

// --- IGCD SCRAPING --------------------------------------------------------

async function fetchIgcdHtml(type) {
  const url = `${IGCD_BASE}/game.php?id=${IGCD_GAME_ID}&type=${type}&resultsStyle=asImages`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`IGCD HTTP ${res.status}`);
  return res.text();
}

/**
 * Decodifica entidades HTML resolviendo el doble-encoding `&amp;#321;` → `Ł`.
 */
function decodeEntities(str) {
  let prev;
  let cur = str;
  do {
    prev = cur;
    cur = cur
      .replace(/&amp;/g, '&')
      .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)))
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  } while (cur !== prev);
  return cur;
}

/**
 * Extrae la lista de coches del HTML de IGCD.
 * Estructura real (verificada 2026-05):
 *   <img src="thumbnail.php?pic=XXX-YYY.jpg" ... alt="Brand Model" />
 *   ...
 *   <h5 class="card-title" ...><b>\n  YEAR Brand Model</b>
 */
function parseIgcdCars(html) {
  const cars = [];
  const re =
    /thumbnail\.php\?pic=([0-9]{3}-[0-9]{3})\.jpg[^>]*alt="([^"]*)"[\s\S]*?<b>\s*(?:(\d{4})\s+)?([^<]+?)\s*<\/b>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const picId = m[1];
    const alt = decodeEntities(m[2].trim());
    const year = m[3] ? parseInt(m[3], 10) : null;
    const bodyName = decodeEntities(m[4].trim());
    const name = alt || bodyName;
    const fullName = year ? `${year} ${name}` : name;
    cars.push({ picId, fullName, name, year });
  }
  return cars;
}

/**
 * Extrae la lista de tramos de IGCD.
 * Estructura real (verificada 2026-05):
 *   <a ... data-caption="Łęczna County: Czarny Las (+ Reverse)">
 *     <img src="thumbnail1.php?pic=XXX-YYY.jpg" ... />
 *   ...
 *   <img ... title="Country Name">
 *
 * `data-caption` viene con doble HTML-encoding (`&amp;#321;` → `Ł`).
 */
function parseIgcdStages(html) {
  const stages = [];
  const re =
    /data-caption="([^"]+)"[\s\S]*?thumbnail1\.php\?pic=([0-9]{3}-[0-9]{3})\.jpg[\s\S]*?title="([^"]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const rawCaption = m[1];
    const picId = m[2];
    const country = decodeEntities(m[3].trim());

    let label = decodeEntities(rawCaption).trim();
    label = label.replace(/\s*\(\+\s*Reverse\)\s*$/i, '');

    let location, stage;
    const colonIdx = label.indexOf(':');
    if (colonIdx >= 0) {
      location = label.slice(0, colonIdx).trim();
      stage = label.slice(colonIdx + 1).trim();
    } else {
      location = label.trim();
      stage = null;
    }
    stages.push({ picId, country, location, stage, label });
  }
  return stages;
}

/**
 * picId "XXX-YYY" → URL de la imagen full-size.
 * Cars:    /images/XXX/YYY.jpg
 * Stages:  /images1/XXX/YYY.jpg
 */
function igcdImageUrl(picId, kind = 'car') {
  const [a, b] = picId.split('-');
  const dir = kind === 'stage' ? 'images1' : 'images';
  return `${IGCD_BASE}/${dir}/${a}/${b}.jpg`;
}

// --- MATCHING -------------------------------------------------------------

/**
 * Normaliza un nombre para hacer matching laxo entre el JSON y IGCD.
 */
function normalizeForMatch(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

// Mapeo manual: nombres del JSON → nombres en IGCD que difieren mucho.
// Solo lo que el matcher fuzzy no resuelve.
const CAR_MANUAL_MAP = {
  'Mini Cooper S':                              'Morris Mini Cooper S',
  'Alpine Renault A110 1600 S':                 'Alpine A110',
  'Volkswagen Golf GTI 16V':                    'Volkswagen Golf GTI',
  'Fiat 131 Abarth Rally':                      'Fiat 131 Abarth',
  'Ford Escort Mk II':                          'Ford Escort',
  'Opel Kadett C GT/E':                         'Opel Kadett',
  'Volkswagen Golf IV Kit Car':                 'Volkswagen Golf Kit Car',
  'BMW E30 M3 Evo Rally':                       'BMW M3',
  'Ford Sierra Cosworth RS500':                 'Ford Sierra RS Cosworth',
  'Audi Sport quattro S1 E2':                   'Audi Sport quattro S1',
  'Peugeot 205 T16 Evo 2':                      'Peugeot 205 Turbo 16', // 1986
  'Peugeot 205 T16 Rallycross':                 'Peugeot 205 Turbo 16', // 1990
  'BMW M1 Procar Rally':                        'BMW M1 Procar',
  'Lancia 037 Evo 2':                           'Lancia 037 Rally',
  'Lancia Delta HF Integrale':                  'Lancia Delta',
  'SUBARU Impreza 1995':                        'Subaru Impreza 555 Group A',
  'SUBARU Impreza S4 Rally (1998 WRC98)':       'Subaru Impreza WRC', // 1998
  'SUBARU Impreza 2001':                        'Subaru Impreza WRC', // 2001
  'SUBARU Impreza S4 Rally 2008':               'Subaru Impreza WRC', // 2008
  'SUBARU Impreza':                             'Subaru Impreza WRC', // (any) - season DLC
  'SUBARU Impreza RS':                          'Subaru Impreza WRC', // genérico
  'SUBARU Legacy RS':                           'Subaru Legacy Group A',
  'SUBARU WRX STI NR4':                         'Subaru WRX STi NR4',
  'SUBARU WRX STI Rallycross':                  'Subaru WRX STi VT18x',
  'BMW M2 Competition':                         'BMW M2',
  'Citroën C4 Rally':                           'Citroën C4 WRC',
  'Ford Focus RS Rally 2001':                   'Ford Focus WRC',
  'Ford Focus RS Rally 2007':                   'Ford Focus RS WRC',
  'Peugeot 206 Rally':                          'Peugeot 206 WRC',
  'Skoda Fabia Rally 2005':                     'Skoda Fabia WRC',
  'Skoda Fabia R5':                             'Skoda Fabia R5 evo',
  'Ford Fiesta R5':                             'Ford Fiesta Rally2',
  'Ford Fiesta OMSE SuperCar Lites':            'Olsbergs MSE RX Super Car Lite',
  'Lancia Delta S4 Rallycross':                 'Lancia Delta S4', // 1987 (rallycross spec)
  'Ford RS200':                                 'Ford RS200', // ambas (rally + rallycross)
  'Ford RS200 Evolution':                       'Ford RS200',
  'MG Metro 6R4':                               'MG Metro 6R4',
  'MG Metro 6R4 Rallycross':                   'MG Metro 6R4',
  'Audi S1 EKS RX quattro':                     'Audi S1 EKS RX', // 2018
  'Ford Fiesta Rallycross (Mk7)':               'Ford Fiesta ST WRX', // 2017
  'Ford Fiesta Rallycross (Mk8)':               'Ford Fiesta ST WRX', // 2018
  'Ford Fiesta Rallycross (STARD)':             'Ford Fiesta ST WRX', // 2019 (uno)
  'Ford Fiesta RXS Evo 5':                      'Ford Fiesta RXS',
  'Peugeot 208 WRX':                            'Peugeot 208 WRX', // 2018
  'Renault Mégane RS RX':                       'Renault Mégane RS RX', // 2018
  'Volkswagen Polo R Supercar':                 'Volkswagen Polo R WRX',
  'Renault Clio RS S1600':                      'Renault Clio RS S1600',
  'Opel Corsa Super 1600':                      'Opel Corsa S1600',
  'Renault Clio RS RX':                         'Renault Clio RS RX',
  'Mini Cooper SX1':                            'MINI Cooper SX1',
  'SEAT Ibiza RX':                              'Seat Ibiza RX',
  'Peugeot 208 R2':                             'Peugeot 208 R2',
  'Peugeot 208 T16 R5':                         'Peugeot 208 T16',
  'Volkswagen Polo S1600':                      'Volkswagen Polo S1600',
  'Renault 5 Turbo':                            'Renault 5 Turbo',
  'Lancia Fulvia HF':                           'Lancia Fulvia Coupé',
  'Porsche 911 RGT Rally Spec':                 'Porsche 911 GT3 RS',
};

// Cuando hay varias coincidencias por nombre + necesitamos elegir por año:
const CAR_YEAR_HINT = {
  'Peugeot 205 T16 Evo 2':                      1986,
  'Peugeot 205 T16 Rallycross':                 1990,
  'SUBARU Impreza S4 Rally (1998 WRC98)':       1998,
  'SUBARU Impreza 2001':                        2001,
  'SUBARU Impreza S4 Rally 2008':               2008,
  'SUBARU Impreza RS':                          2001, // genérico al 2001
  'Ford Fiesta Rallycross (Mk7)':               2017,
  'Ford Fiesta Rallycross (Mk8)':               2018,
  'Ford Fiesta Rallycross (STARD)':             2019,
  'Audi S1 EKS RX quattro':                     2018,
  'Peugeot 208 WRX':                            2018,
  'Renault Mégane RS RX':                       2018,
  'Lancia Delta S4':                            1986,
  'Lancia Delta S4 Rallycross':                 1987,
  'Ford RS200':                                 1986,
  'Ford RS200 Evolution':                       1986,
};

function findIgcdCar(jsonName, igcdCars) {
  // 1. Mapeo manual: busca por nombre exacto + opcional year hint
  const mapped = CAR_MANUAL_MAP[jsonName];
  const yearHint = CAR_YEAR_HINT[jsonName];

  if (mapped) {
    let matches = igcdCars.filter((c) => c.name === mapped);
    if (yearHint && matches.length > 1) {
      const exact = matches.find((c) => c.year === yearHint);
      if (exact) return exact;
    }
    if (matches.length > 0) return matches[0];
  }

  // 2. Match exacto por nombre normalizado
  const target = normalizeForMatch(jsonName);
  let matches = igcdCars.filter((c) => normalizeForMatch(c.name) === target);
  if (matches.length > 0) return matches[0];

  // 3. Match parcial: el nombre IGCD está contenido en el del JSON o viceversa
  matches = igcdCars.filter((c) => {
    const a = normalizeForMatch(c.name);
    return a.includes(target) || target.includes(a);
  });
  if (matches.length === 1) return matches[0];

  return null;
}

// IGCD usa nombres de localización ligeramente distintos. Mapeo a la columna
// "location" del listado de tramos (que es el primer trozo antes de los ":").
const LOCATION_MANUAL_MAP = {
  'Catamarca Province':              'Catamarca Province',
  'Monaro':                          'Monaro',
  'Hawkes Bay':                      'Hawkes Bay',
  'Łęczna County':                   'Łęczna County',
  'Ribadelles':                      'Ribadelles',
  'New England':                     'New England',
  'Monte Carlo':                     'Monte-Carlo',
  'Värmland':                        'Värmland',
  'Baumholder':                      'Baumholder',
  'Powys':                           'Powys',
  'Jämsä':                           'Jämsä',
  'Argolis':                         'Argolis',
  'Perth and Kinross':               'Perth & Kinross',

  'Circuit Jules Tacheny Mettet':    'Circuit Jules Tacheny',
  'Trois-Rivières':                  'Circuit Trois-Rivières',
  'Silverstone Circuit':             'Silverstone Circuit',
  'Lohéac Bretagne':                 'Circuit de Lohéac',
  'Lankebanen (Hell)':               'Lånkebanen',
  'Montalegre':                      'Montalegre',
  'Circuit de Barcelona-Catalunya':  'Circuit de Barcelona-Catalunya',
  'Höljes':                          'Höljesbanan',
  'Yas Marina Circuit':              'Yas Marina Circuit',
  'Lydden Hill':                     'Lydden Hill Race Circuit',
  'Estering':                        'Estering',
  'Bikernieki':                      'Bikernieki',
  'Killarney International Raceway': 'Killarney International Raceway',
};

// Override por tramo cuando difiere del nombre exacto en IGCD (typos, abreviaturas).
// Clave: "Location del JSON::Stage del JSON" → nombre del stage en IGCD.
const STAGE_MANUAL_MAP = {
  'Värmland::Stor-jangen Sprint':                  'Storn-jangen Sprint',
  'Powys::Dyffryn Afon':                           'Dyffry Afon',
  'Monte Carlo::Col de Turini Sprint en Montée':   'Col de Turini - Sprint en descente',
};

// --- LOAD DATA ------------------------------------------------------------

async function loadCars() {
  const data = JSON.parse(await fs.readFile(CARS_JSON, 'utf-8'));
  const list = [];
  for (const cls of Object.values(data.rally_cars ?? {})) {
    for (const car of cls.cars ?? []) list.push(car.name);
  }
  for (const cls of Object.values(data.rallycross_cars ?? {})) {
    for (const car of cls.cars ?? []) list.push(car.name);
  }
  return list;
}

async function loadLocationsAndStages() {
  const data = JSON.parse(await fs.readFile(MAPS_JSON, 'utf-8'));
  const locations = [];
  for (const loc of data.rally_locations ?? []) {
    const stages = (loc.stages ?? []).map((s) => ({
      name: s.name, distanceKm: s.distance_km, direction: s.direction,
    }));
    locations.push({ name: loc.name, country: loc.country, kind: 'rally', stages });
  }
  for (const rx of data.rallycross_locations ?? []) {
    locations.push({ name: rx.name, country: rx.country, kind: 'rallycross', stages: [] });
  }
  return locations;
}

// --- PIPELINE -------------------------------------------------------------

async function processCars(igcdCars, report) {
  await fs.mkdir(CARS_DIR, { recursive: true });
  const carNames = await loadCars();
  console.log(`📦 Coches: ${carNames.length}\n`);

  for (const carName of carNames) {
    const slug = slugify(carName);
    process.stdout.write(`  [CAR] ${carName.padEnd(50)} `);

    if (!FORCE) {
      const existing = await existingFileWithSlug(CARS_DIR, slug);
      if (existing) {
        console.log(`⏭️  ${existing}`);
        report.cars.skipped.push({ name: carName, file: existing });
        continue;
      }
    }

    const match = findIgcdCar(carName, igcdCars);
    if (!match) {
      console.log(`❌ no match in IGCD`);
      report.cars.failed.push({ name: carName, reason: 'no IGCD match' });
      continue;
    }

    try {
      const url = igcdImageUrl(match.picId, 'car');
      const { filename, bytes } = await downloadImage(url, CARS_DIR, slug);
      console.log(`✅ ${filename} (${(bytes / 1024).toFixed(0)} KB) ← ${match.fullName}`);
      report.cars.success.push({
        name: carName, file: filename, igcdName: match.fullName,
        igcdYear: match.year, sourceUrl: url, bytes,
      });
    } catch (err) {
      console.log(`💥 ${err.message}`);
      report.cars.failed.push({ name: carName, reason: err.message });
    }
    await sleep(RATE_LIMIT_MS);
  }
}

async function processLocationsAndStages(igcdStages, report) {
  await fs.mkdir(LOCATIONS_DIR, { recursive: true });
  if (DO_STAGES) await fs.mkdir(STAGES_DIR, { recursive: true });

  const locations = await loadLocationsAndStages();
  console.log(`\n🌍 Localizaciones: ${locations.length}\n`);

  for (const loc of locations) {
    const slug = slugify(loc.name);
    const igcdLocName = LOCATION_MANUAL_MAP[loc.name];
    const stagesInIgcd = igcdLocName
      ? igcdStages.filter((s) => s.location === igcdLocName)
      : [];

    // 1) Cover image de la location: la primera imagen de IGCD para ese sitio
    if (DO_LOCATIONS) {
      process.stdout.write(`  [LOC] ${(loc.name + ', ' + loc.country).padEnd(50)} `);

      const existing = !FORCE ? await existingFileWithSlug(LOCATIONS_DIR, slug) : null;
      if (existing) {
        console.log(`⏭️  ${existing}`);
        report.locations.skipped.push({ name: loc.name, file: existing });
      } else if (stagesInIgcd.length === 0) {
        console.log(`❌ no IGCD entries for "${igcdLocName ?? loc.name}"`);
        report.locations.failed.push({ name: loc.name, reason: 'no IGCD entries' });
      } else {
        try {
          const cover = stagesInIgcd[0];
          const url = igcdImageUrl(cover.picId, 'stage');
          const { filename, bytes } = await downloadImage(url, LOCATIONS_DIR, slug);
          console.log(`✅ ${filename} (${(bytes / 1024).toFixed(0)} KB)`);
          report.locations.success.push({
            name: loc.name, file: filename, sourceUrl: url, bytes,
            igcdStagesAvailable: stagesInIgcd.length,
          });
        } catch (err) {
          console.log(`💥 ${err.message}`);
          report.locations.failed.push({ name: loc.name, reason: err.message });
        }
        await sleep(RATE_LIMIT_MS);
      }
    }

    // 2) Imagen para CADA tramo
    if (DO_STAGES && loc.stages.length > 0) {
      for (const stage of loc.stages) {
        if (stage.direction === 'reverse') continue; // misma imagen que forward
        const stageSlug = `${slug}__${slugify(stage.name)}`;

        const existing = !FORCE ? await existingFileWithSlug(STAGES_DIR, stageSlug) : null;
        if (existing) {
          report.stages.skipped.push({ location: loc.name, name: stage.name, file: existing });
          continue;
        }

        const stageMatch = matchStage(stagesInIgcd, stage.name, loc.name);
        process.stdout.write(`    [STG] ${stage.name.padEnd(46)} `);
        if (!stageMatch) {
          console.log(`❌`);
          report.stages.failed.push({
            location: loc.name, name: stage.name, reason: 'no IGCD match',
          });
          continue;
        }
        try {
          const url = igcdImageUrl(stageMatch.picId, 'stage');
          const { filename, bytes } = await downloadImage(url, STAGES_DIR, stageSlug);
          console.log(`✅ ${filename} (${(bytes / 1024).toFixed(0)} KB)`);
          report.stages.success.push({
            location: loc.name, name: stage.name, file: filename,
            sourceUrl: url, bytes,
          });
        } catch (err) {
          console.log(`💥 ${err.message}`);
          report.stages.failed.push({
            location: loc.name, name: stage.name, reason: err.message,
          });
        }
        await sleep(RATE_LIMIT_MS);
      }
    }
  }
}

function matchStage(igcdStages, jsonStageName, jsonLocationName) {
  // 0. Override manual: location::stage → nombre exacto IGCD.
  const overrideKey = `${jsonLocationName}::${jsonStageName}`;
  const overrideName = STAGE_MANUAL_MAP[overrideKey];
  if (overrideName) {
    const t = normalizeForMatch(overrideName);
    const direct = igcdStages.find((s) => s.stage && normalizeForMatch(s.stage) === t);
    if (direct) return direct;
  }

  const target = normalizeForMatch(jsonStageName);
  // Match exacto
  let m = igcdStages.find((s) => s.stage && normalizeForMatch(s.stage) === target);
  if (m) return m;
  // Match parcial: el primer token del nombre del JSON coincide con el de IGCD
  const firstWord = jsonStageName.split(/\s+/)[0].toLowerCase();
  const norm = normalizeForMatch(firstWord);
  m = igcdStages.find(
    (s) => s.stage && normalizeForMatch(s.stage).startsWith(norm) && norm.length > 3,
  );
  if (m) return m;
  // Inverso: el nombre IGCD está contenido en el JSON
  m = igcdStages.find((s) => {
    if (!s.stage) return false;
    const a = normalizeForMatch(s.stage);
    return a.length > 4 && (target.includes(a) || a.includes(target));
  });
  return m ?? null;
}

// --- MAIN -----------------------------------------------------------------

async function main() {
  console.log('🏁 DiRT Rally 2.0 — Image scraper (IGCD edition)\n');
  console.log(`Source: ${IGCD_BASE}`);
  console.log(`Force:  ${FORCE}\n`);

  console.log('📥 Descargando catálogos de IGCD...');
  const [carsHtml, circuitsHtml] = await Promise.all([
    fetchIgcdHtml('vehicules'),
    fetchIgcdHtml('circuits'),
  ]);
  const igcdCars = parseIgcdCars(carsHtml);
  const igcdStages = parseIgcdStages(circuitsHtml);
  console.log(`  · ${igcdCars.length} entradas de coches en IGCD`);
  console.log(`  · ${igcdStages.length} entradas de tramos/circuitos en IGCD\n`);

  const report = {
    generatedAt: new Date().toISOString(),
    source: 'IGCD.net',
    cars:      { success: [], failed: [], skipped: [] },
    locations: { success: [], failed: [], skipped: [] },
    stages:    { success: [], failed: [], skipped: [] },
  };

  if (DO_CARS) await processCars(igcdCars, report);
  if (DO_LOCATIONS || DO_STAGES) await processLocationsAndStages(igcdStages, report);

  await fs.writeFile(REPORT_FILE, JSON.stringify(report, null, 2));

  const c = report.cars, l = report.locations, s = report.stages;
  console.log('\n────────────────────────────────────────');
  console.log('📊 Resumen:');
  console.log(`  Coches:        ✅ ${c.success.length}  ❌ ${c.failed.length}  ⏭️  ${c.skipped.length}`);
  console.log(`  Localizaciones: ✅ ${l.success.length}  ❌ ${l.failed.length}  ⏭️  ${l.skipped.length}`);
  console.log(`  Tramos:        ✅ ${s.success.length}  ❌ ${s.failed.length}  ⏭️  ${s.skipped.length}`);
  console.log(`\n📝 Reporte: ${path.relative(ROOT, REPORT_FILE)}`);
  if (c.failed.length || l.failed.length || s.failed.length) {
    console.log('\n💡 Para los fallos: edita CAR_MANUAL_MAP / LOCATION_MANUAL_MAP en el script.');
  }
}

main().catch((err) => { console.error('\n💥 Fatal:', err); process.exit(1); });
