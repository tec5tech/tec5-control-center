# Tec5.Tech · Control Center

Portal completo para gestionar campañas publicitarias de Tec5.Tech desde un solo lugar. Cubre Google Ads, Meta Ads, YouTube Ads, SEO, GEO, prospección outbound por email y LinkedIn, Podcast y Webinars; con KPIs configurables, dashboards interactivos, login con roles y tema claro/oscuro futurista.

## Stack

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind CSS**
- **PostgreSQL** + **Prisma ORM**
- **Auth.js v5** (Credentials + Prisma Adapter) · Roles: `ADMIN`, `MANAGER`, `VIEWER`
- **Recharts** + **Framer Motion** · UI con glassmorphism, aurora y neón
- **next-themes** para claro/oscuro

## Quick start

```bash
# 1) Dependencias
npm install

# 2) Copiar variables de entorno
cp .env.example .env
# Editá DATABASE_URL si tu Postgres no corre local con postgres:postgres
# Generá AUTH_SECRET con: openssl rand -base64 32

# 3) Base de datos
npm run db:push      # crea tablas en Postgres
npm run db:seed      # crea admin/manager/viewer + campañas + snapshots + KPIs demo

# 4) Arrancar
npm run dev
# http://localhost:3000
```

### Cuentas demo

| Rol     | Email                | Password         |
| ------- | -------------------- | ---------------- |
| Admin   | admin@tec5.tech      | `Tec5!Admin2026` |
| Manager | manager@tec5.tech    | `Manager!2026`   |
| Viewer  | viewer@tec5.tech     | `Viewer!2026`    |

## Módulos del portal

Cubre punto **32** del brief original.

- **Resumen** — KPIs globales, evolución de leads, share por canal, costo vs ingreso.
- **Canales (9 solapas con dashboard propio):**
  - Google Ads
  - Meta Ads
  - YouTube Ads
  - SEO
  - GEO (Generative Engine Optimization)
  - Email frío (outbound)
  - LinkedIn (prospección)
  - Podcast (YouTube/IG/Spotify)
  - Webinars
- **Campañas** — Vista unificada con filtro por canal + alta/edición.
- **Activar / pausar campañas** — Switch por fila en cualquier canal.
- **Definición de KPIs** — Alta, edición, seguimiento con semáforo y dirección ↑/↓.
- **Modificar campañas** — Edición inline (nombre, estado, presupuesto) + borrado (admin).
- **Ajustes** — Gestión de roles del equipo (solo admin).
- **Actividad** — Auditoría de eventos (manager+).

## Estructura

```
src/
├── app/
│   ├── login/                    # Login + form
│   ├── register/                 # Registro (rol Viewer por defecto)
│   ├── api/
│   │   ├── auth/[...nextauth]/   # Auth.js handlers
│   │   ├── register/             # POST crear usuario
│   │   ├── campaigns/            # GET/POST · /[id] GET/PATCH/DELETE
│   │   ├── kpis/                 # GET/POST · /[id] PATCH/DELETE
│   │   └── users/[id]/           # PATCH rol (admin)
│   └── dashboard/
│       ├── page.tsx              # Overview (KPIs + charts)
│       ├── campaigns/            # Listado unificado
│       ├── kpis/                 # Gestión KPIs
│       ├── {google-ads,meta-ads,yt-ads,seo,geo,email,linkedin,podcast,webinars}/
│       ├── activity/             # Log auditoría
│       └── settings/             # Usuarios y roles
├── components/
│   ├── ui/                       # Button, Input, Card, Dialog, Select, Tabs, etc.
│   ├── charts/                   # KpiCard, AreaTrend, BarBreakdown, DonutShare
│   ├── layout/                   # Sidebar, Header
│   ├── campaign/                 # ChannelModule, CampaignTable, dialogs
│   ├── kpi/                      # KpiManager, NewKpiButton
│   ├── theme-provider.tsx
│   └── theme-toggle.tsx
├── lib/
│   ├── auth.ts                   # Auth.js config
│   ├── db.ts                     # Prisma singleton
│   ├── utils.ts                  # cn, formatters, labels
│   └── constants.ts              # CHANNELS + metadata
└── middleware.ts                 # Protección de rutas
prisma/
├── schema.prisma                 # User, Campaign, MetricSnapshot, Kpi, AuditLog
└── seed.ts                       # Datos demo realistas (30d snapshots por campaña)
```

## Permisos por rol

| Acción                          | Admin | Manager | Viewer |
| ------------------------------- | :---: | :-----: | :----: |
| Ver dashboards y campañas       |  ✅   |   ✅    |   ✅   |
| Activar / pausar / editar       |  ✅   |   ✅    |   ❌   |
| Crear campañas y KPIs           |  ✅   |   ✅    |   ❌   |
| Eliminar campañas / KPIs        |  ✅   |   ❌    |   ❌   |
| Ver actividad                   |  ✅   |   ✅    |   ❌   |
| Gestionar usuarios y roles      |  ✅   |   ❌    |   ❌   |

## Diseño

- **Tema claro y oscuro** persistente + modo sistema (default: oscuro).
- **Glassmorphism** con `backdrop-blur`, bordes con luminiscencia sutil.
- **Auroras** y **grid animado** en fondos, parallax al hover.
- **Neón**: botón principal con gradiente primary→accent + glow dinámico.
- **Transiciones fluidas**: Framer Motion en tabs, sidebar active, login card.
- **Accesibilidad**: focus rings, tamaños táctiles, aria-labels en controles.

## Scripts

| Script            | Descripción                              |
| ----------------- | ---------------------------------------- |
| `npm run dev`     | Inicia Next.js en desarrollo             |
| `npm run build`   | `prisma generate` + build de producción  |
| `npm run start`   | Servidor de producción                   |
| `npm run db:push` | Aplica el schema a Postgres              |
| `npm run db:seed` | Carga datos demo                         |
| `npm run db:studio` | Abre Prisma Studio                     |

## Extender

- Agregar canales nuevos: edita `src/lib/constants.ts` + enum `Channel` en `prisma/schema.prisma` + añadí una carpeta nueva en `src/app/dashboard/`.
- Conectar APIs reales (Google Ads, Meta Ads…): creá un job que escriba en `MetricSnapshot` diariamente. Los dashboards ya leen de ahí.
- Notificaciones / alertas de KPI: el semáforo ya está listo — sólo hay que enviar a Slack/Email cuando el progreso cae por debajo del 60%.
