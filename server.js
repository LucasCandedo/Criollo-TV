const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'criollo2024';

const ADMIN_HWIDS = (process.env.ADMIN_HWIDS || '')
  .split(',').map(h => h.trim().toLowerCase()).filter(Boolean);

const DEFAULT_M3U = process.env.M3U_URL ||
  'http://tv.zapping.life:8080/get.php?username=ancharriere1&password=DaJmm5GvuY&type=m3u';

const CONFIG_PATH = path.join(__dirname, 'config.json');

function readConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH))
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (e) {}
  return { m3uUrl: DEFAULT_M3U };
}

function writeConfig(cfg) {
  try { fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2)); }
  catch (e) { console.error('writeConfig error:', e.message); }
}

// ─── AUTH HELPER ──────────────────────────────────────────────────────────────
function isAuthorized(hwid, password) {
  const h = (hwid || '').trim().toLowerCase();
  if (ADMIN_HWIDS.length > 0 && h && ADMIN_HWIDS.includes(h)) return true;
  if (password && password === ADMIN_PASSWORD) return true;
  return false;
}

app.use(cors());
app.use(express.json({ limit: '50mb' })); // M3U parseado puede ser grande
app.use(express.static(path.join(__dirname, 'public')));

// ─── API ──────────────────────────────────────────────────────────────────────

// El cliente necesita saber la URL del M3U para descargarlo él mismo
app.get('/api/config', (req, res) => {
  const cfg = readConfig();
  res.json({ m3uUrl: cfg.m3uUrl });
});

// Verificar HWID admin
app.post('/api/auth/hwid', (req, res) => {
  const { hwid } = req.body;
  res.json({ isAdmin: isAuthorized(hwid, null) });
});

// Admin: cambiar URL del M3U (se guarda, el cliente la usará)
app.post('/api/admin/m3u', (req, res) => {
  const { hwid, password, m3uUrl } = req.body;

  if (!isAuthorized(hwid, password))
    return res.status(401).json({ success: false, error: 'No autorizado' });

  if (!m3uUrl || !m3uUrl.startsWith('http'))
    return res.status(400).json({ success: false, error: 'URL inválida (debe empezar con http)' });

  const cfg = readConfig();
  cfg.m3uUrl = m3uUrl.trim();
  writeConfig(cfg);

  console.log(`[admin] M3U URL actualizada: ${m3uUrl}`);
  res.json({ success: true, message: 'URL guardada. Recargando canales desde el cliente...' });
});

// Debug — solo muestra info básica (sin datos sensibles)
app.get('/api/debug', (req, res) => {
  const cfg = readConfig();
  res.json({
    status:      'ok',
    m3uUrl:      cfg.m3uUrl,
    adminHwids:  ADMIN_HWIDS.length,
    nodeVersion: process.version,
    uptime:      Math.round(process.uptime()) + 's',
    note:        'El M3U se descarga desde el browser del cliente, no desde este servidor.',
  });
});

// Catch-all → SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 CriolloTV en puerto ${PORT}`);
  console.log(`📋 Admin HWIDs: ${ADMIN_HWIDS.length > 0 ? ADMIN_HWIDS.length + ' configurados' : '(ninguno)'}`);
  console.log(`📡 M3U URL: ${readConfig().m3uUrl}`);
  console.log(`ℹ️  El M3U se descarga desde el browser del usuario (no desde Railway)\n`);
});
