# 🏁 DiRT Tracker

Aplicación web para que un grupo de amigos registre y compare sus tiempos en
[DiRT Rally 2.0](https://www.codemasters.com/game/dirt-rally-2-0/). El admin
deja la sesión iniciada en su casa y los demás registran sus propios tiempos
(o los del admin) sin tener que hacer logout cada vez.

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack)
- **HeroUI v3** + Tailwind CSS v4
- **Auth.js v5** (Credentials provider, sesión JWT)
- **Prisma 6** + PostgreSQL 16 (en Docker para dev, Neon en prod)
- **bcrypt** para hashing
- **Zod** para validación
- **lucide-react** para iconos

## Arrancar en local

Necesitas Node 20+, npm y Docker.

```bash
# 1. Dependencias
npm install

# 2. Variables de entorno
cp .env.example .env
# Edita .env si quieres un AUTH_SECRET nuevo (openssl rand -base64 32)

# 3. Postgres en Docker (puerto 5435 en el host, 5432 dentro)
docker compose up -d

# 4. Migración + seed inicial (5 usuarios, 13 localidades, 156 tramos, 79 coches)
npx prisma migrate dev --name init
npx prisma db seed

# 5. Dev server
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Los usuarios sembrados
son **Doplax** (admin), **Willy**, **Sugus**, **Rega** y **Arantxa**, todos
con la contraseña `P@ssw0rd` y el flag `mustChangePassword: true`. La primera
vez que entres te pedirá cambiarla.

### Comandos útiles

| Comando | Para qué |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Sirve el build |
| `npm run lint` | ESLint |
| `npm run format` | Prettier (escribe) |
| `npm run format:check` | Prettier (sólo comprueba) |
| `npx prisma studio` | UI para inspeccionar la BD |
| `npx prisma db seed` | Re-ejecutar el seed (idempotente) |
| `npx prisma migrate reset` | Borra la BD y aplica migraciones + seed |

## Estructura

```
src/
├── app/
│   ├── (auth)/login          → Pantalla de login
│   ├── (app)/                → Rutas autenticadas con sidebar
│   │   ├── tiempos           → Listado y leaderboards
│   │   ├── mapas             → Localidades + tramos
│   │   ├── coches            → Catálogo de coches
│   │   ├── usuarios          → Gestión (sólo admin)
│   │   └── perfil            → Edición de tu propio perfil
│   ├── change-password       → Cambio de contraseña forzado
│   └── api/auth/[...nextauth] → Handlers de Auth.js v5
├── components/
│   ├── ui/                   → Field, FormModal, NativeSelect
│   ├── sidebar.tsx
│   └── providers.tsx         → SessionProvider + next-themes
├── lib/
│   ├── auth.ts               → Configuración de Auth.js
│   ├── auth.config.ts        → Config edge-safe para middleware
│   ├── db.ts                 → Cliente Prisma singleton
│   ├── permissions.ts        → requireSession / requireAdmin
│   ├── time-format.ts        → MM:SS.mmm ↔ ms
│   └── uploads.ts            → saveUpload (público local)
├── server/actions/           → Server Actions (locations, cars, times, users, password)
└── middleware.ts             → Redirige si no hay sesión / fuerza cambio de contraseña
```

## Despliegue (Vercel + Neon)

Resumen rápido — la guía completa está en la Fase 11 de
[`docs/instrucciones.md`](docs/instrucciones.md):

1. Crea proyecto en Vercel y conéctalo al repo.
2. Añade un Postgres de [Neon](https://neon.com) desde la sección de Storage
   del proyecto Vercel — generará automáticamente `DATABASE_URL`.
3. Define `AUTH_SECRET` (`openssl rand -base64 32`) y `NEXTAUTH_URL` (la URL
   pública del despliegue).
4. Ejecuta `npx prisma migrate deploy && npx prisma db seed` apuntando a
   Neon.
5. **Imágenes**: en local se guardan en `public/uploads/` pero ese FS no
   persiste en Vercel. Antes de producción hay que migrar `src/lib/uploads.ts`
   a [Vercel Blob](https://vercel.com/docs/storage/vercel-blob).

## Notas técnicas

- **Puerto Postgres**: 5435 en lugar del clásico 5432, porque ese suele estar
  ocupado por otros contenedores en local. El contenedor sigue exponiendo
  5432 internamente.
- **Prisma 6 (no 7)**: la v7 introdujo breaking changes (`prisma.config.ts`
  obligatorio, `url` no se puede leer del schema). Para mantener el flujo
  estándar, este proyecto se queda en la 6.x.
- **Next.js 16** marca el archivo `middleware.ts` como deprecado a favor de
  `proxy.ts`. Se mantiene el nombre `middleware.ts` por compatibilidad con
  el spec — renombrar al desplegar si la build de Vercel lo exige.
- **HeroUI v3**: `<Button variant="primary">` (no `color`), `<Card.Content>`
  (no `Body`), `<TextField>` se compone con `<Label>` + `<Input>`. El
  wrapper [src/components/ui/field.tsx](src/components/ui/field.tsx) hace
  esto cómodo. Para selects y tablas se usa HTML nativo estilizado en lugar
  de los primitivos `react-aria-components`, por simplicidad.
