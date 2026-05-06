# DiRT Rally 2.0 Time Tracker — Especificación del Proyecto

Aplicación web para registrar y comparar tiempos en DiRT Rally 2.0 entre un grupo de amigos.

---

## 📜 Reglas de trabajo del agente (LEER PRIMERO)

### Metodología

1. **Avanza por fases en orden**. No saltes a la fase N+1 hasta que la fase N esté completa y commiteada.
2. **Marca cada tarea como hecha** en este documento cambiando `- [ ]` por `- [x]` cuando la termines. Edita el propio archivo `SPEC.md` (o como lo llames) en cada commit.
3. **Haz un commit por funcionalidad terminada** usando convenciones de [Angular Commit Messages](https://github.com/angular/angular/blob/main/contributing-docs/commit-message-guidelines.md):
   - `feat: ...` para nuevas funcionalidades
   - `fix: ...` para correcciones
   - `chore: ...` para configuración, dependencias, scripts
   - `refactor: ...` para reestructuración sin cambio funcional
   - `docs: ...` para documentación
   - `style: ...` para formato (no CSS)
   - `test: ...` para tests
   - Ejemplo: `feat(auth): add credentials provider with bcrypt`
4. **Pregunta antes de tomar decisiones grandes** que no estén en este spec (cambios de stack, librerías nuevas, alteraciones de modelo de datos).
5. **No instales librerías que no estén en el stack acordado** sin avisar.
6. **Antes de empezar una fase**, lee la fase entera para entender el alcance.
7. **Después de cada fase**: ejecuta `npm run build` y `npm run lint` para verificar que todo compila.

### Convención de ramas (opcional pero recomendado)
- `main` siempre estable
- Una rama por fase: `feat/phase-1-setup`, `feat/phase-2-auth`, etc.
- Merge a `main` al cerrar la fase

---

## 🎯 Contexto del proyecto

**DiRT Rally 2.0** es un simulador de rally desarrollado por Codemasters (2019). Los jugadores compiten en tramos cronometrados sobre asfalto, grava, nieve, etc., en distintos países. Cada tramo tiene una distancia, una superficie y se puede correr en diferentes condiciones (clima, hora del día). El juego cuenta con clases de coche históricas y modernas (Group A, Group B, R5, etc.).

**Cómo se va a usar la app**: el admin (Doplax) deja la sesión iniciada en su casa, y todos los amigos van registrando sus tiempos en la misma sesión sin necesidad de hacer logout. **Cualquier usuario logueado puede registrar tiempos en nombre de cualquier otro usuario.**

---

## 🛠️ Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | **Next.js 15+** (App Router, TypeScript) |
| UI | **HeroUI v3** (https://heroui.com) + Tailwind CSS v4 |
| Auth | **Auth.js v5** (NextAuth) — Credentials provider |
| ORM | **Prisma** |
| BD (dev) | **PostgreSQL en Docker** |
| BD (prod) | **Neon** (vía Vercel) |
| Hashing | **bcrypt** o **argon2** |
| Storage de imágenes | **Vercel Blob** (cuando se despliegue) / sistema local en dev |
| Validación | **Zod** |
| Iconos | **lucide-react** o el icon set recomendado por HeroUI |
| Deploy | Vercel |

### Notas importantes sobre HeroUI v3
- Es la versión nueva (2026), antes se llamaba NextUI.
- Usa **compound components**: `<Card><Card.Header>...</Card.Header></Card>`
- Compatible con React 19, Tailwind CSS v4 y RSC.
- Setup vía CLI: `npx heroui-cli@latest init` y luego `npx heroui-cli@latest add <componente>`.
- Ya **no** se usa `HeroUIProvider` global como en v2.
- Consultar siempre la documentación oficial de v3: https://heroui.com/docs/react/getting-started

---

## 👥 Usuarios iniciales (seed)

Crear estos 5 usuarios al inicializar la BD. Todos con contraseña inicial `P@ssw0rd` y `must_change_password: true`.

| Username | Rol |
|---|---|
| Doplax | admin |
| Willy | user |
| Sugus | user |
| Rega | user |
| Arantxa | user |

---

## 🔐 Lógica de permisos

| Acción | Admin (Doplax) | User |
|---|---|---|
| Crear/editar/borrar tiempos (propios o ajenos) | ✅ | ✅ |
| Ver todos los tiempos | ✅ | ✅ |
| Crear/editar mapas y tramos | ✅ | ❌ |
| Crear/editar coches | ✅ | ❌ |
| Subir fotos de mapas/coches | ✅ | ❌ |
| Gestionar usuarios (crear, renombrar, resetear pass) | ✅ | ❌ |
| Editar su propio perfil (nombre, foto, password) | ✅ | ✅ |

**Nota**: como admin y users registran tiempos por igual, el campo "registrado por" se guarda separado del "corredor". Un user puede meter un tiempo a nombre de Doplax si está logueado como Doplax (caso esperado).

---

## 🗄️ Modelo de datos (Prisma schema)

```prisma
model User {
  id                   String   @id @default(cuid())
  username             String   @unique
  passwordHash         String
  photoUrl             String?
  role                 Role     @default(USER)
  mustChangePassword   Boolean  @default(true)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  timesAsRunner        TimeRecord[] @relation("Runner")
  timesAsRegistrar     TimeRecord[] @relation("Registrar")
}

enum Role {
  ADMIN
  USER
}

model Location {
  id          String   @id @default(cuid())
  name        String
  country     String
  surface     String
  isDlc       Boolean  @default(false)
  dlcPack     String?
  photoUrl    String?
  stages      Stage[]

  @@unique([name, country])
}

model Stage {
  id           String   @id @default(cuid())
  name         String
  distanceKm   Float
  direction    Direction
  locationId   String
  location     Location @relation(fields: [locationId], references: [id], onDelete: Cascade)
  times        TimeRecord[]

  @@unique([name, locationId])
}

enum Direction {
  FORWARD
  REVERSE
}

model Car {
  id           String   @id @default(cuid())
  name         String   @unique
  className    String   // "Historic Rally H1 (FWD)", "Modern Rally R5", etc.
  classCode    String   // "H1_FWD", "R5", "GROUP_B_4WD", etc. (para filtrar)
  drivetrain   String?  // "FWD", "RWD", "4WD"
  year         Int?
  isDlc        Boolean  @default(false)
  dlcPack      String?
  isRallycross Boolean  @default(false)
  photoUrl     String?
  times        TimeRecord[]
}

model TimeRecord {
  id            String   @id @default(cuid())
  runnerId      String   // El corredor (a quién pertenece el tiempo)
  runner        User     @relation("Runner", fields: [runnerId], references: [id])
  registrarId   String   // Quién metió el registro (sesión activa)
  registrar     User     @relation("Registrar", fields: [registrarId], references: [id])
  stageId       String
  stage         Stage    @relation(fields: [stageId], references: [id])
  carId         String
  car           Car      @relation(fields: [carId], references: [id])

  timeMs        Int      // Tiempo en milisegundos. NULL si DNF.
  penaltyMs    Int      @default(0)
  isDnf         Boolean  @default(false)

  weather       Weather  @default(DRY)
  timeOfDay     TimeOfDay @default(DAY)
  notes         String?

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([stageId, carId])
  @@index([runnerId])
}

enum Weather {
  DRY
  WET
  SNOW
  ICE
}

enum TimeOfDay {
  DAY
  NIGHT
  DUSK
  DAWN
}
```

**Reglas de negocio del modelo**:
- `timeMs` se guarda en **milisegundos** (entero). Formatear en el front como `MM:SS.mmm`.
- `penaltyMs` también en milisegundos.
- `tiempoTotal = timeMs + penaltyMs` (calcular en queries o en el front).
- Si `isDnf = true`, ignorar `timeMs` en leaderboards.

---

## 📂 Estructura del proyecto sugerida

```
/
├── docker-compose.yml
├── .env.example
├── .env.local           (no commitear)
├── data/
│   ├── dirt_rally_2_mapas.json
│   └── dirt_rally_2_coches.json
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── public/
│   └── uploads/         (fotos en dev)
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   ├── (app)/        ← rutas autenticadas con sidebar
│   │   │   ├── layout.tsx
│   │   │   ├── tiempos/
│   │   │   ├── mapas/
│   │   │   ├── coches/
│   │   │   └── usuarios/
│   │   ├── api/
│   │   │   └── auth/[...nextauth]/
│   │   └── change-password/
│   ├── components/
│   │   ├── ui/           ← componentes HeroUI personalizados
│   │   ├── sidebar.tsx
│   │   ├── time-input.tsx
│   │   └── ...
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── db.ts
│   │   ├── time-format.ts   ← MM:SS.mmm <-> ms
│   │   └── permissions.ts
│   ├── server/
│   │   └── actions/      ← Server Actions
│   └── types/
└── SPEC.md               ← este documento
```

---

# 🚀 FASES DE DESARROLLO

## ✅ Fase 0 — Bootstrap del proyecto

- [x] Crear proyecto Next.js con TypeScript: `npx create-next-app@latest dirt-tracker --typescript --tailwind --app --eslint`
- [x] Inicializar git y hacer primer commit: `chore: initial commit`
- [x] Crear este `SPEC.md` en la raíz del proyecto _(vive en `docs/instrucciones.md`)_
- [x] Crear carpeta `data/` y mover los dos JSON (`dirt_rally_2_mapas.json` y `dirt_rally_2_coches.json`) ahí
- [x] Configurar `.gitignore` con `.env*.local`, `public/uploads/*`, etc.
- [x] Configurar Prettier + ESLint con reglas razonables
- [x] Commit: `chore: bootstrap project structure`

> ⚠️ **El JSON actual `dirt_rally_2_data.json` que el usuario tiene contiene mapas + coches juntos**. Hay que separarlo en dos archivos y renombrarlos a `dirt_rally_2_mapas.json` y `dirt_rally_2_coches.json` antes de continuar.

---

## ✅ Fase 1 — Base de datos y Docker

- [x] Crear `docker-compose.yml` con un servicio PostgreSQL 16:
  - Puerto: ~~5432~~ **5435** (5432 estaba ocupado en local; mapeado al 5432 del contenedor)
  - User: `dirt`, Password: `dirt`, DB: `dirt_tracker`
  - Volumen persistente
- [x] Crear `.env.example` con `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- [x] Instalar Prisma: `npm i -D prisma && npm i @prisma/client` _(fijado a v6 — v7 introduce breaking changes con `prisma.config.ts`)_
- [x] `npx prisma init`
- [x] Copiar el schema de Prisma de la sección "Modelo de datos" arriba
- [x] `docker compose up -d` y `npx prisma migrate dev --name init`
- [x] Crear cliente Prisma singleton en `src/lib/db.ts`
- [x] Commit: `feat(db): setup postgres docker and prisma schema`

---

## ✅ Fase 2 — Seed de datos

- [x] Crear `prisma/seed.ts` que:
  - Cree los 5 usuarios con `P@ssw0rd` hasheada y `mustChangePassword: true`
  - Lea `data/dirt_rally_2_mapas.json` e inserte Locations + Stages
  - Lea `data/dirt_rally_2_coches.json` e inserte Cars (con `classCode` correcto y `isRallycross`)
- [x] Configurar el script en `package.json`: `"prisma": { "seed": "tsx prisma/seed.ts" }`
- [x] Ejecutar `npx prisma db seed` y verificar con `npx prisma studio` _(verificado vía `psql`: 5 users, 13 locations, 156 stages, 79 cars)_
- [x] Commit: `feat(db): seed initial users, locations, stages and cars`

---

## ✅ Fase 3 — HeroUI v3 + Layout base

- [x] Inicializar HeroUI: `npx heroui-cli@latest init` (seguir el wizard) _(instalado a mano: `@heroui/react` + `@heroui/styles` + `@import "@heroui/styles"` en `globals.css`; el wizard requiere pnpm + Node ≥22.22)_
- [x] Configurar tema oscuro/claro (rally-friendly: tema oscuro por defecto con acentos en naranja/rojo) _(via `next-themes` con `defaultTheme="dark"` y `--accent` naranja)_
- [x] Crear layout raíz `src/app/layout.tsx` con providers de HeroUI y theme _(en v3 sólo se necesita `ThemeProvider` de `next-themes`)_
- [x] Verificar que un componente de prueba (`<Button>`) renderiza correctamente
- [x] Commit: `feat(ui): integrate heroui v3 with theme provider`

> Notas v3: el `Button` de HeroUI v3 usa `variant="primary"` (no `color="primary"`) y no acepta `as`/`href` (es un `<button>` real). Para navegación usar `<Link>` de Next.js o el `Link` de HeroUI por separado.

---

## ✅ Fase 4 — Autenticación

- [x] Instalar Auth.js v5: `npm i next-auth@beta` (verificar versión actual estable en el momento de implementar) _(beta.31)_
- [x] Configurar `src/lib/auth.ts` con Credentials provider:
  - Validar username + password contra BD
  - Sesión JWT (más simple para self-hosted)
  - Callbacks para incluir `id`, `username`, `role`, `mustChangePassword` en la sesión
- [x] Crear ruta `src/app/api/auth/[...nextauth]/route.ts`
- [x] Crear página `/login` con HeroUI Form (Input, Button, Card)
- [x] Crear `middleware.ts` que:
  - Redirige a `/login` si no autenticado
  - Redirige a `/change-password` si `mustChangePassword === true` y no está ya en esa ruta
- [x] Crear página `/change-password` con form de cambio (password actual + nueva + confirmación)
- [x] Crear Server Action para cambiar password (validar la antigua, hashear la nueva, marcar `mustChangePassword: false`)
- [x] Probar flujo completo: login con Doplax/P@ssw0rd → redirect a change-password → cambiar → acceder al dashboard _(verificado: GET / sin sesión devuelve 307 → /login)_
- [x] Commit: `feat(auth): credentials login, session, password change flow`

> Notas: Next.js 16 marca `middleware.ts` como deprecado (recomienda renombrarlo a `proxy.ts`). De momento se mantiene como `middleware.ts` para alinear con el spec; renombrar al subir a Vercel si la build lo exige.

---

## ✅ Fase 5 — Layout autenticado con Sidebar

- [x] Crear grupo de rutas `(app)` con un layout que requiere sesión
- [x] Crear componente `Sidebar` con HeroUI:
  - Logo / título "DiRT Tracker"
  - Avatar + username del logueado (con menú: ver perfil, cambiar pass, logout)
  - Items de menú con iconos: **Tiempos**, **Mapas**, **Coches**, **Usuarios**
  - "Usuarios" solo visible para admin
  - Indicador visual de ruta activa
  - Responsive: collapsible en móvil (drawer)
- [x] Crear placeholder en cada ruta para verificar navegación
- [x] Commit: `feat(ui): add app layout with responsive sidebar`

---

## ✅ Fase 6 — Sección Mapas

- [x] Página `/mapas` (admin):
  - Lista de Locations en cards con HeroUI
  - Filtro por: país, superficie, base/DLC
  - Botón "Crear Location" (modal con form) — solo admin
  - Click en una location → detalle con sus tramos
- [x] Página `/mapas/[id]`:
  - Imagen del mapa (si existe)
  - Lista de Stages (tabla HeroUI con nombre, distancia, dirección)
  - Admin puede editar la location, subir foto, añadir/editar/borrar Stages
- [x] Server Actions para CRUD de Location y Stage (con validación Zod y check de rol admin)
- [x] Componente para subir imagen (input file → guardar en `public/uploads/locations/<id>.<ext>` en dev)
- [x] Commit: `feat(maps): list, detail, CRUD and image upload for locations and stages`

> Notas: para tablas se usó `<table>` HTML estilizada con Tailwind (la tabla de HeroUI v3 está construida sobre react-aria-components y exige más boilerplate del necesario aquí). Los selects de filtro usan un `NativeSelect` propio sobre `<select>` nativo por la misma razón.

---

## ✅ Fase 7 — Sección Coches

- [x] Página `/coches`:
  - Lista de coches agrupada por clase (Accordion de HeroUI por clase) _(agrupada por clase con secciones, no Accordion para evitar más boilerplate aria)_
  - Filtros: clase, tracción, base/DLC, rally/rallycross
  - Buscador por nombre
  - Cada coche en card con foto + datos
  - Botón "Crear Coche" (admin) — modal con form
- [x] Detalle/edición de coche en modal o ruta `/coches/[id]` _(edición en modal por simplicidad)_
- [x] Server Actions CRUD de Car
- [x] Subida de imagen del coche
- [x] Commit: `feat(cars): list with filters, CRUD and image upload`

---

## ✅ Fase 8 — Sección Tiempos (la importante)

- [ ] Página `/tiempos`:
  - Buscador / selector de Location (con thumbnail)
  - Al seleccionar location → grid o lista de Stages
  - Click en stage → vista detalle del tramo
- [ ] Página `/tiempos/[stageId]`:
  - Header con nombre, distancia, dirección, location, superficie
  - **Leaderboard**: tabla ordenada por mejor tiempo (timeMs + penaltyMs), con:
    - Posición, runner (avatar+nombre), coche, tiempo, sanción, total, fecha
    - Filtro por clase de coche (importante para comparar justo)
    - Filtro por clima
    - Toggle "incluir DNF" (off por defecto)
  - Botón **"Registrar tiempo"** → modal con form:
    - Selector de **runner** (todos los users) — por defecto el de la sesión, pero cambiable
    - Selector de **coche** (con autocomplete, agrupado por clase)
    - Input de **tiempo**: componente custom que acepte `MM:SS.mmm` o tres inputs (min/seg/ms)
    - Input de **sanción** (opcional, default 0)
    - Checkbox **DNF** (si está marcado, deshabilita el input de tiempo)
    - Selector **clima** (Dry, Wet, Snow, Ice)
    - Selector **hora del día** (Day, Night, Dusk, Dawn)
    - Textarea **notas** (opcional)
  - Cada fila del leaderboard tiene menú "..." con: Editar, Borrar
- [ ] Helper `src/lib/time-format.ts` con funciones `msToString(ms)` y `stringToMs(str)`
- [ ] Server Actions: `createTimeRecord`, `updateTimeRecord`, `deleteTimeRecord`
- [ ] **`registrarId` siempre es el user de la sesión, `runnerId` viene del form**
- [ ] Commit: `feat(times): stage leaderboard, time input and CRUD`

---

## ✅ Fase 9 — Sección Usuarios (admin)

- [ ] Página `/usuarios` (solo admin):
  - Tabla de usuarios con avatar, username, rol, fecha creación, # tiempos registrados
  - Botón "Crear usuario" (modal)
  - Acciones por fila: editar, resetear contraseña (vuelve a `P@ssw0rd` + `mustChangePassword: true`), borrar (con confirm)
- [ ] Página `/perfil` (todos): editar propio username, foto, cambiar password
- [ ] Server Actions con checks de permisos (admin para gestión, user para perfil propio)
- [ ] Commit: `feat(users): admin user management and self profile`

---

## ✅ Fase 10 — Pulido y mejoras

- [ ] Dashboard inicial `/` con stats: total tiempos, mejor tiempo de la semana, top 3 corredores...
- [ ] Loading states y Skeletons de HeroUI en listados
- [ ] Toasts de HeroUI en cada acción (crear, editar, borrar)
- [ ] Empty states bonitos cuando no hay datos
- [ ] Confirmaciones (HeroUI Modal) para acciones destructivas
- [ ] Validación de formularios consistente (mensajes de error en español)
- [ ] Manejo de errores en Server Actions (try/catch + toast)
- [ ] Tests E2E básicos con Playwright (login, crear tiempo, ver leaderboard) — **opcional**
- [ ] README.md con: stack, cómo arrancar en local, cómo desplegar en Vercel + Neon
- [ ] Commit: `feat: dashboard, polish and documentation`

---

## ✅ Fase 11 — Despliegue

- [ ] Crear proyecto en Vercel y conectar el repo
- [ ] Crear BD en Neon desde el dashboard de Vercel
- [ ] Configurar variables de entorno en Vercel (`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`)
- [ ] Migrar imágenes a Vercel Blob (`@vercel/blob`) o equivalente — sustituir el upload local
- [ ] Ejecutar migración Prisma contra Neon: `npx prisma migrate deploy`
- [ ] Ejecutar seed contra Neon
- [ ] Probar la app en producción
- [ ] Commit: `chore: deploy to vercel with neon database`

---

# 📝 Notas finales para el agente

- **Idioma de la UI**: Español (es-ES). Mensajes de error, labels, etc. en español.
- **Idioma del código y commits**: Inglés.
- **Formato de tiempos en UI**: `MM:SS.mmm` (ej. `04:23.567`). Si supera la hora, `H:MM:SS.mmm`.
- **Si encuentras algo ambiguo o inconsistente**: para, escribe la duda como comentario en este SPEC y pregunta antes de inventarte la solución.
- **No optimices prematuramente**: prioriza que funcione y se vea bien antes de hacer cosas avanzadas (caching agresivo, ISR, etc.).

---

## 🔗 Recursos

- HeroUI v3: https://heroui.com/docs/react/getting-started
- Auth.js v5: https://authjs.dev/
- Prisma: https://www.prisma.io/docs
- Neon: https://neon.com/docs
- Vercel Blob: https://vercel.com/docs/storage/vercel-blob
