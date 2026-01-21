# Frontend (React + Vite)

Interfaz web con dos experiencias:

- **Landing pública** (Home): presentación institucional.
- **Panel interno** (personal): login y módulos operativos.

## Requisitos
- Node.js 18+

## Ejecutar en local
Desde esta carpeta:

```powershell
npm install
npm run dev
```

Vite: `http://127.0.0.1:5173/`

## Build

```powershell
npm run build
```

## Conexión con el backend
La API se consume por `/api` (proxy en `vite.config.js`).

Backend esperado en local:
- `http://127.0.0.1:8000/`

## Rutas principales
- `/` landing pública.
- `/login` acceso de empleados.
- `/registro` solicitud de registro.
- `/cuenta` perfil del usuario autenticado.
- `/materiales` inventario/terceros/usos/ventas/historial (solo `estado=activo`).
- `/admin` administración (solo `nivel=0`).

## Notas
- La sesión se guarda en `sessionStorage`.
- Exportación CSV disponible en inventario/usos/ventas/historial.
