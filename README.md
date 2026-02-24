# 🇦🇷 Argentina TV - Android TV PWA

App de televisión argentina en vivo, optimizada para Android TV con soporte completo de control remoto.

## 📺 Canales incluidos

### Noticias
- **TN** - Todo Noticias (Grupo Clarín)
- **C5N** - Canal 5 Noticias
- **LN+** - La Nación Más
- **A24** - América 24
- **Crónica TV**
- **Canal 26**

### Entretenimiento
- **TV Pública** - Canal 7
- **América TV** - Canal 2
- **Telefe** - Canal 11

### Deportes
- **TyC Sports**
- **ESPN Argentina**

### Streaming Online
- **Luzu TV**
- **Olga**
- **Vorterix**

### Cultura
- **Encuentro**

---

## 🚀 Deploy en Railway

1. Fork o clona este repositorio
2. Creá una cuenta en [Railway](https://railway.app)
3. Nuevo proyecto → Deploy from GitHub repo
4. Seleccioná el repo
5. Railway detecta automáticamente Node.js y despliega

Variables de entorno opcionales:
```
PORT=3000  # Railway la setea automáticamente
```

---

## 💻 Instalación local

```bash
npm install
npm start
# Abre http://localhost:3000
```

---

## 📱 Instalar en Android TV como APK (TWA/PWA)

### Opción 1: Navegador
1. Abrí Chrome en Android TV
2. Navegá a la URL de tu app deployada en Railway
3. Chrome mostrará la opción "Agregar a pantalla de inicio"
4. La app se instala como PWA con fullscreen

### Opción 2: PWABuilder (genera APK real)
1. Andá a [pwabuilder.com](https://pwabuilder.com)
2. Pegá la URL de tu app en Railway
3. Descargá el APK Android
4. Instalá en Android TV vía ADB o archivo

```bash
# Via ADB:
adb connect TU_TV_IP:5555
adb install argentina-tv.apk
```

---

## 🎮 Control remoto

| Botón | Acción |
|-------|--------|
| ↑↓←→ D-Pad | Navegar entre canales |
| OK / Enter | Abrir canal |
| Back / Atrás | Cerrar reproductor |
| F (keyboard) | Agregar a favoritos |

---

## ⚙️ Agregar canales

Editá el array `channels` en `server.js`:

```js
{
  id: 16,
  category: "Noticias",
  name: "Mi Canal",
  description: "Descripción",
  logo: "https://url-del-logo.png",
  youtubeHandle: "@handle",
  youtubeChannelId: "UCxxxxxxxxxxxxxxx",  // ID del canal de YouTube
  color: "#ff0000"  // Color temático
}
```

Para obtener el `youtubeChannelId` de un canal:
1. Andá al canal en YouTube
2. Click derecho → Ver código fuente
3. Buscá `"channelId"` o usá https://ytpeek.com/tools/channel-id-finder

---

## 📝 Notas técnicas

- Los streams son embeds de YouTube (gratuitos y legales)
- La PWA funciona offline (caché del shell)
- Compatible con control remoto via eventos de teclado estándar
- Diseño responsive: funciona en TV 4K, Full HD y móvil
