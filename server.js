const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'criollo2024';

// Lista de HWIDs autorizados como admin (separados por coma en la variable de entorno)
// Ejemplo: ADMIN_HWIDS=abc123,def456
const ADMIN_HWIDS = (process.env.ADMIN_HWIDS || '')
  .split(',')
  .map(h => h.trim().toLowerCase())
  .filter(Boolean);

const DEFAULT_M3U = process.env.M3U_URL ||
  'http://tvmate.icu:8080/get.php?username=7ES2xf&password=934197&type=m3u';

const CONFIG_PATH = path.join(__dirname, 'config.json');

function readConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
  } catch (e) {}
  return { m3uUrl: DEFAULT_M3U };
}

function writeConfig(config) {
  try { fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2)); }
  catch (e) { console.error('Error saving config:', e); }
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── FETCH HELPER ─────────────────────────────────────────────────────────────
function fetchUrl(url, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    try {
      const proto = url.startsWith('https') ? https : http;
      const req = proto.get(url, {
        timeout: timeoutMs,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; IPTV)',
          'Accept': '*/*',
        }
      }, (res) => {
        // Seguir redirecciones
        if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location) {
          return fetchUrl(res.headers.location, timeoutMs).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        res.on('error', reject);
      });
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Timeout después de ${timeoutMs}ms`));
      });
    } catch (e) {
      reject(e);
    }
  });
}

// ─── M3U PARSER ───────────────────────────────────────────────────────────────
function parseM3U(text) {
  const channels = [];
  const lines = text.split(/\r?\n/);
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('#EXTINF:')) {
      const tvgName  = line.match(/tvg-name="([^"]*)"/)?.[1]?.trim() || '';
      const tvgLogo  = line.match(/tvg-logo="([^"]*)"/)?.[1]?.trim() || '';
      const group    = line.match(/group-title="([^"]*)"/)?.[1]?.trim() || 'General';
      // El nombre del canal está después de la última coma
      const commaIdx = line.lastIndexOf(',');
      const displayName = commaIdx >= 0 ? line.slice(commaIdx + 1).trim() : tvgName;

      current = {
        name: displayName || tvgName || 'Canal',
        logo: tvgLogo,
        category: group,
      };

    } else if (line && !line.startsWith('#') && current) {
      current.url = line;
      current.id = channels.length + 1;
      channels.push(current);
      current = null;
    }
  }

  console.log(`M3U parseado: ${channels.length} canales`);
  return channels;
}

// ─── CACHE ────────────────────────────────────────────────────────────────────
let channelCache = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 min

async function getChannels(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && channelCache && (now - cacheTime) < CACHE_TTL) {
    return channelCache;
  }

  const config = readConfig();
  console.log(`Cargando M3U desde: ${config.m3uUrl}`);

  try {
    const raw = await fetchUrl(config.m3uUrl);
    if (!raw || raw.length < 10) throw new Error('Respuesta vacía o inválida');
    if (!raw.includes('#EXTM3U') && !raw.includes('#EXTINF')) {
      console.error('Respuesta no es M3U válido:', raw.slice(0, 200));
      throw new Error('El contenido no es un M3U válido');
    }
    channelCache = parseM3U(raw);
    cacheTime = now;
    return channelCache;
  } catch (e) {
    console.error('Error cargando M3U:', e.message);
    if (channelCache) {
      console.log('Usando caché anterior');
      return channelCache;
    }
    throw e;
  }
}

// ─── API ──────────────────────────────────────────────────────────────────────

// Canales
app.get('/api/channels', async (req, res) => {
  try {
    const channels = await getChannels();
    res.json({ success: true, channels, count: channels.length });
  } catch (e) {
    console.error('/api/channels error:', e.message);
    res.status(500).json({ success: false, error: e.message, channels: [] });
  }
});

// Config pública (sin password)
app.get('/api/config', (req, res) => {
  const config = readConfig();
  res.json({ m3uUrl: config.m3uUrl });
});

// Verificar si un HWID es admin
app.post('/api/auth/hwid', (req, res) => {
  const { hwid } = req.body;
  if (!hwid) return res.json({ isAdmin: false });
  const normalized = hwid.trim().toLowerCase();
  const isAdmin = ADMIN_HWIDS.includes(normalized);
  res.json({ isAdmin });
});

// Admin: cambiar M3U URL
app.post('/api/admin/m3u', async (req, res) => {
  const { hwid, password, m3uUrl } = req.body;

  // Verificar por HWID o por password (fallback)
  const normalizedHwid = (hwid || '').trim().toLowerCase();
  const hwidOk = ADMIN_HWIDS.length > 0 && ADMIN_HWIDS.includes(normalizedHwid);
  const passOk = password && password === ADMIN_PASSWORD;

  if (!hwidOk && !passOk) {
    return res.status(401).json({ success: false, error: 'No autorizado' });
  }
  if (!m3uUrl || !m3uUrl.startsWith('http')) {
    return res.status(400).json({ success: false, error: 'URL inválida' });
  }

  const config = readConfig();
  config.m3uUrl = m3uUrl;
  writeConfig(config);
  channelCache = null;
  cacheTime = 0;

  try {
    const channels = await getChannels(true);
    res.json({ success: true, message: `M3U actualizado. ${channels.length} canales cargados.` });
  } catch (e) {
    res.status(500).json({ success: false, error: 'URL guardada pero error al cargar: ' + e.message });
  }
});

// Admin: refrescar caché
app.post('/api/admin/refresh', async (req, res) => {
  const { hwid, password } = req.body;
  const normalizedHwid = (hwid || '').trim().toLowerCase();
  const hwidOk = ADMIN_HWIDS.length > 0 && ADMIN_HWIDS.includes(normalizedHwid);
  const passOk = password && password === ADMIN_PASSWORD;

  if (!hwidOk && !passOk) {
    return res.status(401).json({ success: false, error: 'No autorizado' });
  }

  channelCache = null;
  cacheTime = 0;
  try {
    const channels = await getChannels(true);
    res.json({ success: true, message: `Cache refrescado. ${channels.length} canales.` });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Debug: estado del servidor (solo en dev)
app.get('/api/debug', (req, res) => {
  const config = readConfig();
  res.json({
    m3uUrl: config.m3uUrl,
    cacheSize: channelCache?.length || 0,
    cacheAge: cacheTime ? Math.round((Date.now() - cacheTime) / 1000) + 's' : 'sin cache',
    adminHwids: ADMIN_HWIDS.length,
    env: process.env.NODE_ENV || 'production'
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`CriolloTV corriendo en puerto ${PORT}`);
  console.log(`Admin HWIDs configurados: ${ADMIN_HWIDS.length}`);
  getChannels()
    .then(ch => console.log(`✅ ${ch.length} canales cargados al inicio`))
    .catch(e => console.error('❌ Error cargando canales al inicio:', e.message));
});
