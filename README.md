# 📺 CriolloTV

Aplicación web para ver canales de TV Argentina en vivo, optimizada para Android TV.

## 📺 Canales Disponibles

### Noticias en Vivo
- **TN** - Todo Noticias
- **LN+** - La Nación Más
- **C5N** - Canal 5 Noticias
- **A24** - América 24
- **Crónica TV**
- **Canal 26**
- **Telefe**
- **Canal 9**

## ✨ Características

- 🎬 Ver canales en vivo sin bloqueos
- 📱 PWA optimizada para Android TV y móviles
- 🎮 Control remoto nativo
- ⭐ Sistema de favoritos
- 🔍 Búsqueda de canales
- 🎨 Interfaz moderna tipo Netflix

## 🚀 Instalación

```bash
npm install
npm start
```

La aplicación estará disponible en `http://localhost:3000`

## 📦 Deploy

Esta app está lista para ser desplegada en:
- **Railway** (recomendado)
- Heroku
- Vercel
- Netlify

### Deploy en Railway

1. Fork o clona este repositorio
2. Crea una cuenta en [Railway](https://railway.app)
3. Nuevo proyecto → Deploy from GitHub
4. Selecciona el repo
5. Railway detecta automáticamente Node.js

## 📱 Instalar en Android TV

### Opción 1: Navegador
1. Abre Chrome en Android TV
2. Navega a tu app deployada
3. Acepta "Agregar a pantalla de inicio"
4. La app se instala como PWA

### Opción 2: PWABuilder (APK)
1. Visita [pwabuilder.com](https://pwabuilder.com)
2. Ingresa la URL de tu app
3. Descarga el APK Android
4. Instala vía ADB o USB

```bash
adb connect TU_TV_IP:5555
adb install criollotv.apk
```

## 🎮 Controles

### Control Remoto / Teclado
- **↑↓←→** Navegar entre canales
- **Enter/OK** Reproducir canal
- **Back/Escape** Volver
- **F** Agregar/quitar favorito
- **R** Búsqueda

### Touch/Mouse
- **Click** Reproducir canal
- **Long Press** Agregar/quitar favorito

## 🛠️ Tecnologías

- Node.js + Express
- Vanilla JavaScript
- PWA (Progressive Web App)
- CSS moderno con animaciones

## 📝 Agregar más canales

Edita el array `channels` en `server.js`:

```js
{
  id: 9,
  category: "Noticias",
  name: "Mi Canal",
  description: "Descripción del canal",
  logo: "https://url-del-logo.png",
  streamUrl: "https://url-del-stream/",
  color: "#ff0000"
}
```

## 📄 Licencia

MIT
