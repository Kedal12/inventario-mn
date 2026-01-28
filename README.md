# Inventario TI - ICG

Sistema de Gestión de Activos Tecnológicos para ICG.

## 🚀 Características

- ✅ Gestión completa de activos TI (CRUD)
- ✅ 120 tipos de activos predefinidos
- ✅ 22 sedes/almacenes configurados
- ✅ Sistema de traslados con historial
- ✅ Impresión de etiquetas Zebra ZT230 (ZPL)
- ✅ Códigos QR para consulta pública
- ✅ Dashboard con estadísticas
- ✅ Reportes exportables (CSV/HTML)
- ✅ Control de usuarios y roles
- ✅ Historial completo de cambios

## 📋 Requisitos

- Windows 10/11 o Windows Server
- SQL Server 2019+ (o SQL Server Express)
- .NET 8 SDK
- Node.js 18+ (para desarrollo frontend)
- Impresora Zebra ZT230 (opcional, para etiquetas)

## 🔧 Instalación

### 1. Base de Datos

1. Instalar SQL Server o SQL Server Express
2. La base de datos se crea automáticamente al iniciar la API

### 2. Backend (.NET API)

```bash
cd backend/InventarioTI.API

# Restaurar paquetes
dotnet restore

# Configurar conexión en appsettings.json si es necesario
# Por defecto: Server=localhost;Database=InventarioTI_ICG;Trusted_Connection=True;

# Ejecutar
dotnet run
```

La API estará disponible en: `http://localhost:5000`
Swagger: `http://localhost:5000/swagger`

### 3. Frontend (React)

```bash
cd frontend

# Instalar dependencias
npm install

# Desarrollo
npm run dev

# O compilar para producción
npm run build
```

El frontend en desarrollo estará en: `http://localhost:3000`

### 4. Despliegue en Producción

Para usar el frontend compilado con la API:

```bash
cd frontend
npm run build
# Los archivos se copian automáticamente a backend/InventarioTI.API/wwwroot
```

Luego solo necesitas ejecutar la API y acceder a `http://localhost:5000`

## 👤 Credenciales por defecto

- **Usuario:** admin
- **Contraseña:** admin123

⚠️ **Importante:** Cambiar la contraseña después del primer inicio de sesión.

## 🖨️ Configuración Impresora Zebra ZT230

La impresora debe estar configurada con:
- **Tamaño de etiqueta:** 98.5mm x 25mm
- **Resolución:** 203 DPI
- **Orientación:** Vertical
- **Método:** Transferencia térmica
- **Tipo de medio:** No continuo, Sensor de red

### Enviar etiquetas ZPL

1. Desde el sistema, genera la etiqueta (botón de impresora)
2. Copia el código ZPL generado
3. Envía a la impresora vía:
   - Software Zebra Setup Utilities
   - Comando de red: `echo "^XA...^XZ" | nc IP_IMPRESORA 9100`
   - Desde tu aplicación de impresión

## 📁 Estructura del Proyecto

```
inventario-ti-icg/
├── backend/
│   └── InventarioTI.API/
│       ├── Controllers/     # Controladores API
│       ├── Data/           # DbContext y configuración BD
│       ├── DTOs/           # Objetos de transferencia
│       ├── Models/         # Modelos de entidades
│       ├── Services/       # Lógica de negocio
│       ├── Program.cs      # Punto de entrada
│       └── appsettings.json
├── frontend/
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   ├── pages/          # Páginas
│   │   ├── services/       # Llamadas API
│   │   ├── hooks/          # Hooks personalizados
│   │   └── App.jsx
│   └── package.json
└── README.md
```

## 🔌 Endpoints API Principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | /api/auth/login | Iniciar sesión |
| GET | /api/activos | Listar activos |
| POST | /api/activos | Crear activo |
| GET | /api/activos/publico/{codigo} | Consulta pública (QR) |
| POST | /api/traslados | Crear traslado |
| GET | /api/reportes/dashboard | Estadísticas |
| POST | /api/activos/etiqueta | Generar ZPL |

## 🛡️ Roles de Usuario

- **Administrador:** Acceso total al sistema
- **Consultor:** Solo lectura, limitado a almacenes asignados

## 📊 Reportes Disponibles

- Inventario por sede
- Inventario por tipo de activo
- Inventario por marca
- Historial de traslados
- Activos dados de baja

## 🔒 Seguridad

- Autenticación JWT con expiración de 12 horas
- Contraseñas hasheadas con BCrypt
- CORS configurado para red local
- Consultas públicas solo de lectura

## 📝 Notas de Desarrollo

- El código genera automáticamente el código de activo: `ICG-{REF}-{CONSECUTIVO}`
- Los traslados generan número: `TRS-{FECHA}-{CONSECUTIVO}`
- El historial se registra automáticamente en cada cambio

## 🆘 Soporte

Para problemas o mejoras, contactar al área de Sistemas ICG.

---

Desarrollado para ICG © 2025
