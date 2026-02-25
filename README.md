# 📺 CriolloTV

Aplicación web para ver canales de TV Argentina en vivo, optimizada para TV Box con control remoto completo.

## ✨ Características

- 🎮 **Control remoto completo** - Navegación D-pad optimizada
- 📺 **8 canales de noticias** - Los principales de Argentina
- 🔓 **Sin bloqueos** - Streams directos de 5900.tv
- ⚡ **Diseño Netflix-style** - Interfaz fluida y profesional
- ⭐ **Sistema de favoritos** - Guarda tus canales preferidos
- 🔍 **Búsqueda** - Encuentra canales rápidamente
- 📱 **PWA** - Instala como app nativa

## 📺 Canales Disponibles

- **TN** - Todo Noticias
- **LN+** - La Nación Más
- **C5N** - Canal 5 Noticias
- **A24** - América 24
- **Crónica TV**
- **Canal 26**
- **Telefe**
- **Canal 9**

## 🎮 Controles

### Control Remoto / Teclado
- **↑ ↓ ← →** Navegar entre canales
- **Enter/OK** Reproducir canal
- **Back/Escape** Volver al menú
- **F** Agregar/quitar favorito
- **R** Abrir búsqueda

### Touch/Mouse
- **Click** Reproducir canal
- **Long Press** (700ms) Agregar a favoritos

## 🚀 Instalación Local

```bash
npm install
npm start
```

Abre `http://localhost:3000` en tu navegador.

## 📦 Deploy en Producción

### Railway (Recomendado)
1. Fork este repositorio
2. Crea cuenta en [Railway](https://railway.app)
3. New Project → Deploy from GitHub
4. Selecciona el repo
5. Railway detecta Node.js automáticamente

### Otras Plataformas
Compatible con: Heroku, Render, Vercel (con serverless functions), Netlify

### Variables de Entorno
```bash
PORT=3000  # Puerto del servidor (Railway lo asigna automáticamente)
```

## 📱 Instalar en TV Box / Android TV

### Método 1: Navegador
1. Abre Chrome en tu TV Box
2. Visita la URL deployada
3. Acepta "Agregar a pantalla de inicio"
4. La app se instala como PWA en fullscreen

### Método 2: APK con PWABuilder
1. Visita [pwabuilder.com](https://pwabuilder.com)
2. Ingresa la URL de tu app deployada
3. Descarga el APK generado
4. Instala en TV Box vía ADB o USB

```bash
# Instalación con ADB
adb connect IP_DE_TU_TV:5555
adb install criollotv.apk
```

## 🛠️ Tecnologías

- **Backend**: Node.js + Express
- **Frontend**: Vanilla JavaScript (sin frameworks)
- **Estilos**: CSS3 moderno con animaciones
- **PWA**: Service Worker para funcionalidad offline
- **Control remoto**: Navegación por teclado nativa

## 🔧 Cómo Funciona el Bypass de YouTube

La app usa dos métodos para reproducir streams:

1. **Método Principal (5900.tv)**: Usa las URLs directas de 5900.tv que embeden los streams de YouTube sin restricciones
2. **Método Alternativo (yt-dlp)**: El servidor tiene un endpoint `/api/stream/:channelId` que usa `yt-dlp` para extraer URLs m3u8 directas

Para usar yt-dlp, necesitas instalarlo:
```bash
# En el servidor
pip install yt-dlp

# O con npm
npm install -g yt-dlp
```

## ➕ Agregar Más Canales

Edita `server.js` y agrega al array `channels`:

```javascript
{
  id: 9,
  category: "Noticias",
  name: "Nuevo Canal",
  description: "Descripción del canal",
  logo: "https://url-del-logo.png",
  youtubeChannelId: "UCxxxxxxxxx", // ID del canal de YouTube
  streamUrl: "https://5900.tv/tu-canal/", // URL de 5900.tv
  color: "#ff0000"
}
```

**Cómo obtener el YouTube Channel ID:**
1. Ve al canal en YouTube
2. Click derecho → Ver código fuente
3. Busca `"channelId":`
4. O usa: https://commentpicker.com/youtube-channel-id.php

## 📝 Notas Técnicas

- Los streams vienen de 5900.tv (embeds sin restricciones de YouTube)
- Diseño responsive: funciona en TV 4K, Full HD, tablet y móvil
- PWA cachea el shell de la app para uso offline
- Navegación optimizada para controles remotos de TV Box
- Sistema de favoritos guardado en localStorage

## 🐛 Troubleshooting

**Los canales no cargan:**
- Verifica que las URLs de 5900.tv estén activas
- Prueba con otro navegador
- Revisa la consola del navegador para errores

**El control remoto no funciona:**
- Asegúrate de que el foco esté en la página
- Algunos navegadores pueden requerir un click inicial
- Verifica que tu control remoto esté en modo "D-pad"

**La app no se instala como PWA:**
- Requiere HTTPS (excepto en localhost)
- Verifica que manifest.json esté accesible
- El service worker debe registrarse correctamente

## 📄 Licencia

MIT License - Usa, modifica y distribuye libremente

---

**Hecho con ❤️ para disfrutar TV argentina 🇦🇷**
