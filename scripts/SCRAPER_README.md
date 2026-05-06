# Image scraper — DiRT Rally 2.0 (IGCD edition)

Descarga imágenes desde **IGCD.net** (Internet Game Cars Database).

## Por qué IGCD

Tras probar **Fandom Wiki** y **Wikipedia** como fuentes (ver versiones anteriores del script), IGCD ha resultado ser la mejor con diferencia para este caso:

| Fuente | Coches | Localizaciones | Tramos | Problemas |
|---|---|---|---|---|
| Fandom Wiki | 78/79 ✅ | ~50% ❌ | 0 | Devuelve placeholders y portadas en vez de la imagen real |
| Wikipedia | parcial | parcial | 0 | Rate limiting agresivo (429), muchas DR2.0 stages no tienen artículo |
| **IGCD** | **79/79** ✅ | **26/26** ✅ | **~70 tramos** ✅ | Ninguno relevante |

IGCD tiene una entrada por cada coche del juego con su screenshot in-game, y además **una imagen por cada tramo individual** del juego. URLs públicas y predecibles, sin API ni rate limit agresivo.

## ⚖️ Aviso legal

Las imágenes son screenshots de juego, propiedad de **Codemasters/EA**. IGCD las hospeda con fines de catalogación. Para tu app personal entre amigos en casa entra dentro del uso aceptable. Si publicas el repo o monetizas, sustituye por capturas propias.

## 🚀 Uso

```bash
# Todo (coches + localizaciones + tramos):
node scripts/download-images.mjs

# Solo una categoría:
node scripts/download-images.mjs --cars
node scripts/download-images.mjs --locations
node scripts/download-images.mjs --stages

# Forzar re-descarga:
node scripts/download-images.mjs --force
```

**Requisitos**: Node.js 18+ (fetch nativo, sin dependencias).

## 📂 Salida

```
public/uploads/
├── cars/
│   ├── ford-escort-mk-ii.jpg
│   ├── lancia-stratos.jpg
│   └── ... (~79)
├── locations/
│   ├── catamarca-province.jpg     ← cover (primer tramo del lugar)
│   └── ... (26)
└── stages/
    ├── catamarca-province__las-juntas.jpg
    ├── catamarca-province__san-isidro.jpg
    └── ... (~70 tramos forward)
```

**Convenciones**:
- Coches: `<slug-del-coche>.<ext>`
- Locations: `<slug-de-la-location>.<ext>`
- Tramos: `<slug-de-la-location>__<slug-del-tramo>.<ext>` (doble guión bajo como separador). Solo se descarga la versión "forward", la "reverse" usa la misma imagen.

## 📝 Reporte

Tras cada ejecución se genera `scripts/scrape-report.json` con éxitos, fallos y saltados, incluyendo el nombre IGCD que se matcheó para cada coche (útil para verificar que ha cogido la entrada correcta).

## 🔧 Si algún coche falla el match

Edita los mapas manuales al inicio del script:

- `CAR_MANUAL_MAP`: `"<nombre exacto del JSON>": "<nombre exacto en IGCD>"`
- `CAR_YEAR_HINT`: cuando hay varias entradas con el mismo nombre en IGCD, fuerza un año concreto (ej. Subaru Impreza WRC tiene 1998, 2001 y 2008)
- `LOCATION_MANUAL_MAP`: nombres de localizaciones

El IGCD actual ya está completamente cubierto — el script debería bajar todo a la primera.

## 🔌 Integración con el seed de Prisma

```typescript
import fs from 'node:fs';
import path from 'node:path';

function slugify(name: string): string {
  return name
    .replace(/[ŁłĐđØøÆæŒœß]/g, c => ({Ł:'L',ł:'l',Đ:'D',đ:'d',Ø:'O',ø:'o',Æ:'Ae',æ:'ae',Œ:'Oe',œ:'oe',ß:'ss'}[c]!))
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function findImage(dir: 'cars' | 'locations', name: string): string | null {
  const slug = slugify(name);
  const fullDir = path.join(process.cwd(), 'public/uploads', dir);
  if (!fs.existsSync(fullDir)) return null;
  const file = fs.readdirSync(fullDir).find(f => f.startsWith(slug + '.'));
  return file ? `/uploads/${dir}/${file}` : null;
}

function findStageImage(locationName: string, stageName: string): string | null {
  const slug = `${slugify(locationName)}__${slugify(stageName)}`;
  const dir = path.join(process.cwd(), 'public/uploads/stages');
  if (!fs.existsSync(dir)) return null;
  const file = fs.readdirSync(dir).find(f => f.startsWith(slug + '.'));
  return file ? `/uploads/stages/${file}` : null;
}

// Al crear cada Car:
await prisma.car.create({
  data: {
    name: car.name,
    photoUrl: findImage('cars', car.name),
    // ...
  },
});

// Al crear cada Location:
await prisma.location.create({
  data: {
    name: loc.name,
    photoUrl: findImage('locations', loc.name),
    // ...
  },
});

// Si quieres, también para Stage (recomendado, queda mejor en la UI):
await prisma.stage.create({
  data: {
    name: stage.name,
    photoUrl: findStageImage(loc.name, stage.name),
    // ...
  },
});
```

> **Sugerencia**: añade un campo `photoUrl: String?` también al modelo `Stage` en `schema.prisma`. Tener una imagen por tramo hace que la página de tiempos quede mucho más visual que solo la cover de la location.

## 🐢 Rate limiting

El script hace una pausa de **600ms** entre requests. Para ~175 imágenes (79 coches + 26 locations + ~70 tramos) tarda alrededor de **2 minutos**. IGCD no tiene rate limiting agresivo como Wikipedia.

## 🗑️ Migrar desde la versión anterior

Si tienes imágenes de la versión Fandom (placeholders, duplicados, WebP servidos como `.jpg`):

```bash
rm -rf public/uploads/cars public/uploads/locations
node scripts/download-images.mjs
```
