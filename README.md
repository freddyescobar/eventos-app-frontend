# Sistema de Control de Asistencias - Caja Huancayo

Sistema de gestión de eventos con control de asistencias y entrega de souvenirs para dispositivos TC15 (Zebra) y dashboard web.

## 🚀 Inicio Rápido

### Requisitos Previos
- Node.js 18+
- Windows 11 (para SQLite)
- npm o yarn

### Instalación

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

El servidor estará disponible en: **http://localhost:3001**

## 📁 Estructura del Proyecto

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API Routes (Backend)
│   │   │   └── events/        # Endpoints de eventos
│   │   ├── eventos/           # Páginas de eventos
│   │   ├── layout.tsx         # Layout raíz
│   │   └── page.tsx           # Página principal
│   └── lib/
│       ├── db/                # Configuración SQLite
│       │   └── sqlite.ts      # Cliente de base de datos
│       ├── stores/            # Zustand stores
│       │   └── useEventsStore.ts
│       └── types/             # TypeScript types
│           └── index.ts
├── database/                   # Base de datos SQLite
│   └── central.db             # Generado automáticamente
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

## 🎨 Colores Institucionales

```css
Rojo Primario: #E2001A
Gris Secundario: #444444
Gris Claro: #F7F7F8
Blanco: #FFFFFF
```

## 📊 Base de Datos

SQLite con el siguiente esquema:

- **users** - Usuarios del sistema
- **events** - Eventos
- **persons** - Personas registradas por evento
- **attendances** - Registros de asistencia
- **souvenirs** - Souvenirs disponibles
- **souvenir_deliveries** - Entregas de souvenirs
- **devices** - Dispositivos TC15 registrados
- **sync_queue** - Cola de sincronización offline

### Usuario por Defecto
- **Usuario:** admin
- **Contraseña:** admin123

## 🔄 Features Implementadas

### ✅ Completadas
- [x] Setup proyecto Next.js con TypeScript
- [x] Configuración SQLite con better-sqlite3
- [x] API Routes para eventos (GET, POST, PUT, DELETE)
- [x] Página de lista de eventos con polling automático
- [x] CRUD completo de eventos
- [x] Zustand store para manejo de estado

### 🚧 En Progreso
- [ ] API Routes para personas
- [ ] API Routes para asistencias
- [ ] API Routes para souvenirs
- [ ] Dashboard en tiempo real
- [ ] Sincronización con dispositivos TC15

## 🛠️ API Endpoints

### Eventos

```http
GET    /api/events          # Listar todos los eventos
POST   /api/events          # Crear nuevo evento
GET    /api/events/[id]     # Obtener evento por ID
PUT    /api/events/[id]     # Actualizar evento
DELETE /api/events/[id]     # Eliminar evento
```

## 📱 Integración con Flutter (TC15)

Los dispositivos TC15 se conectarán a este servidor usando:
- Base URL: `http://[IP-LAPTOP]:3001`
- Headers: `X-Device-Id` para identificación
- Sincronización: Endpoints `/api/sync/pull` y `/api/sync/push`

## 🔧 Scripts Disponibles

```bash
npm run dev      # Servidor de desarrollo (puerto 3001)
npm run build    # Build para producción
npm run start    # Servidor de producción
npm run lint     # Linter de código
```

## 📝 Próximos Pasos

1. Implementar API de personas (GET, POST, búsqueda)
2. Implementar API de asistencias con validación de duplicados
3. Implementar API de souvenirs y entregas con firma digital
4. Crear dashboard con polling cada 5 segundos
5. Implementar endpoints de sincronización para TC15
6. Actualizar app Flutter para conectar con este backend

## 🐛 Troubleshooting

### Error: "Module not found: better-sqlite3"
```bash
npm install better-sqlite3 --save
npm install @types/better-sqlite3 --save-dev
```

### Puerto 3001 ya en uso
Cambiar el puerto en `package.json`:
```json
"dev": "next dev -p 3002"
```

### Base de datos no se crea
Verificar permisos de escritura en la carpeta `database/`

## 📄 Licencia

Proyecto privado - Caja Huancayo © 2025
