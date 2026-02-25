# CriolloTV v2

IPTV PWA para Android TV con soporte M3U dinámico.

## Variables de entorno en Railway

| Variable | Descripción | Default |
|---|---|---|
| `PORT` | Puerto del servidor | 3000 |
| `ADMIN_PASSWORD` | Contraseña del panel admin | `criollo2024` |
| `M3U_URL` | URL M3U inicial (se puede cambiar desde el panel) | URL incluida |

## Panel de Administración

- Hacé click en el botón ⚙️ (esquina inferior derecha)
- Ingresá la contraseña de admin
- Cambiá el link M3U → todos los usuarios ven los nuevos canales
- El botón 🔄 refresca el caché sin cambiar el link

## Deploy en Railway

1. Subir el proyecto a un repositorio Git
2. Crear nuevo proyecto en Railway desde el repo
3. Agregar las variables de entorno desde el dashboard
4. El servidor levanta automáticamente con `npm start`

## Tecnologías

- Backend: Node.js + Express (sin dependencias externas para M3U)
- Player: HLS.js para streams M3U8
- PWA: Service Worker para instalación en Android TV
