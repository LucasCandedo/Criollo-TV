# 📺 CriolloTV

App minimalista para ver canales de TV Argentina en vivo, optimizada para TV Box y control remoto.

## ✨ Características

- 🎯 **Diseño minimalista** - Interfaz simple y directa
- 🎮 **Control remoto completo** - Navegación con D-pad
- 📺 **8 canales de noticias** - Los principales en Argentina
- ⚡ **Optimizado para TV Box** - Rendimiento fluido
- 🔓 **Sin bloqueos** - Streams directos desde 5900.tv

## 📺 Canales

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

### Touch/Mouse
- **Click** en cualquier canal para reproducir

## 🚀 Instalación

```bash
npm install
npm start
```

Abre `http://localhost:3000` en tu navegador o TV Box.

## 📦 Deploy

### Railway (Recomendado)
1. Fork este repo
2. Crea cuenta en [Railway](https://railway.app)
3. New Project → Deploy from GitHub
4. Selecciona el repo
5. Deploy automático

### Otras plataformas
Compatible con: Heroku, Vercel, Netlify, Render

## 📱 Instalar en TV Box

### Método 1: Navegador
1. Abre Chrome en tu TV Box
2. Visita la URL de tu app
3. Agrega a pantalla de inicio
4. Listo! Se ejecuta en fullscreen

### Método 2: APK con PWABuilder
1. Visita [pwabuilder.com](https://pwabuilder.com)
2. Ingresa la URL de tu app
3. Genera y descarga APK
4. Instala en TV Box

```bash
# Con ADB
adb connect IP_DE_TU_TV:5555
adb install criollotv.apk
```

## 🛠️ Tecnologías

- Node.js + Express (backend)
- Vanilla JavaScript (frontend)
- CSS moderno (diseño minimalista)
- PWA (Progressive Web App)

## ➕ Agregar más canales

Edita `server.js`:

```javascript
{
  id: 9,
  category: "Noticias",
  name: "Nuevo Canal",
  description: "Descripción",
  logo: "https://url-logo.png",
  streamUrl: "https://url-stream/",
  color: "#ff0000"
}
```

## 📝 Notas

- Los streams vienen de 5900.tv (sin bloqueos)
- Diseño responsive: funciona en TV, desktop y móvil
- PWA cachea el shell para uso offline
- Optimizado para controles de TV Box

## 📄 Licencia

MIT

---

**Hecho para disfrutar TV argentina 🇦🇷**
