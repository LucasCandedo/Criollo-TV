const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3000;

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'criollo2024';
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

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const req = proto.get(url, { timeout: 20000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function parseM3U(text) {
  const channels = [];
  const lines = text.split('\n');
  let current = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#EXTINF:')) {
      const tvgName = line.match(/tvg-name="([^"]*)"/)?.[1] || '';
      const tvgLogo = line.match(/tvg-logo="([^"]*)"/)?.[1] || '';
      const groupTitle = line.match(/group-title="([^"]*)"/)?.[1] || 'General';
      const displayName = line.split(',').slice(-1)[0]?.trim() || tvgName;
      current = {
        name: displayName || tvgName || 'Canal',
        logo: tvgLogo || '',
        category: groupTitle || 'General',
      };
    } else if (line && !line.startsWith('#') && current) {
      current.url = line;
      current.id = channels.length + 1;
      channels.push(current);
      current = null;
    }
  }
  return channels;
}

let channelCache = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function getChannels(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && channelCache && (now - cacheTime) < CACHE_TTL) return channelCache;
  const config = readConfig();
  try {
    const raw = await fetchUrl(config.m3uUrl);
    channelCache = parseM3U(raw);
    cacheTime = now;
    return channelCache;
  } catch (e) {
    console.error('Error fetching M3U:', e.message);
    if (channelCache) return channelCache;
    throw e;
  }
}

app.get('/api/channels', async (req, res) => {
  try {
    const channels = await getChannels();
    res.json({ success: true, channels });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/config', (req, res) => {
  const config = readConfig();
  res.json({ m3uUrl: config.m3uUrl });
});

app.post('/api/admin/m3u', async (req, res) => {
  const { password, m3uUrl } = req.body;
  if (!password || password !== ADMIN_PASSWORD)
    return res.status(401).json({ success: false, error: 'Contraseña incorrecta' });
  if (!m3uUrl || !m3uUrl.startsWith('http'))
    return res.status(400).json({ success: false, error: 'URL inválida' });
  const config = readConfig();
  config.m3uUrl = m3uUrl;
  writeConfig(config);
  channelCache = null;
  cacheTime = 0;
  try {
    await getChannels(true);
    res.json({ success: true, message: 'M3U actualizado correctamente' });
  } catch (e) {
    res.status(500).json({ success: false, error: 'URL guardada pero no se pudo cargar: ' + e.message });
  }
});

app.post('/api/admin/refresh', async (req, res) => {
  const { password } = req.body;
  if (!password || password !== ADMIN_PASSWORD)
    return res.status(401).json({ success: false, error: 'Contraseña incorrecta' });
  channelCache = null;
  try {
    await getChannels(true);
    res.json({ success: true, message: 'Cache refrescado' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`CriolloTV running on port ${PORT}`);
  getChannels().then(ch => console.log(`Loaded ${ch.length} channels`)).catch(console.error);
});
