// ============================================================
// CRIOLLOTV - M3U IPTV PWA  (client-side M3U fetch)
// ============================================================

let hlsInstance = null;
let currentHWID = null;
let isAdmin     = false;

const state = {
  channels:   [],
  filtered:   [],
  currentCat: 'all',
  lastError:  null,
  focusGrid:  [],
  focusRow:   0,
  focusCol:   0,
  inPlayer:   false,
  favorites:  JSON.parse(localStorage.getItem('criollo-favs') || '[]'),
};

// ============================================================
// HWID
// ============================================================
function getHWID() {
  let hwid = localStorage.getItem('criollo-hwid');
  if (!hwid) {
    const canvas = document.createElement('canvas');
    const gl     = canvas.getContext('webgl');
    const dbg    = gl ? gl.getExtension('WEBGL_debug_renderer_info') : null;
    const raw = [
      navigator.userAgent, navigator.language,
      screen.width + 'x' + screen.height, screen.colorDepth,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '',
      dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL)   : '',
      navigator.hardwareConcurrency || '',
    ].join('|');
    let hash = 0;
    for (let i = 0; i < raw.length; i++) { hash = ((hash << 5) - hash) + raw.charCodeAt(i); hash |= 0; }
    hwid = `criollo-${Math.abs(hash).toString(16).padStart(8,'0')}-${Math.random().toString(36).slice(2,6)}`;
    localStorage.setItem('criollo-hwid', hwid);
  }
  return hwid;
}

async function checkAdminStatus() {
  currentHWID = getHWID();
  try {
    const r = await fetch('/api/auth/hwid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hwid: currentHWID })
    });
    isAdmin = (await r.json()).isAdmin;
  } catch (e) { isAdmin = false; }

  // Botón admin solo visible para admins
  const btn = document.getElementById('btn-admin');
  if (btn) btn.style.display = isAdmin ? 'flex' : 'none';
}

// ============================================================
// HWID SHORTCUT  Ctrl + I + O  — solo muestra diagnóstico a admins
// ============================================================
function setupHWIDShortcut() {
  const pressed = new Set();
  document.addEventListener('keydown', e => {
    pressed.add(e.key.toLowerCase());
    if (pressed.has('control') && pressed.has('i') && pressed.has('o')) showHWIDPopup();
  });
  document.addEventListener('keyup', e => pressed.delete(e.key.toLowerCase()));
}

function showHWIDPopup() {
  const existing = document.getElementById('hwid-popup');
  if (existing) { existing.remove(); return; }

  const popup = document.createElement('div');
  popup.id = 'hwid-popup';
  popup.style.cssText = `
    position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
    background:#0d0d1e;border:2px solid #1565c0;border-radius:12px;
    padding:20px 28px;z-index:500;text-align:center;
    box-shadow:0 0 30px rgba(21,101,192,0.5);min-width:380px;max-width:90vw;`;

  // Contenido base: siempre muestra el HWID
  let extraInfo = '';
  if (isAdmin) {
    // Admin ve diagnóstico completo
    const cfg = state._lastConfig || {};
    extraInfo = `
      <div style="margin-top:14px;text-align:left;background:#0a0a1a;border-radius:8px;padding:12px;font-size:12px;color:#888;">
        <div style="color:#90caf9;font-weight:700;margin-bottom:8px;">📊 Diagnóstico (solo admin)</div>
        <div>🔗 M3U URL: <span style="color:#fff;word-break:break-all;">${cfg.m3uUrl || '—'}</span></div>
        <div style="margin-top:4px;">📺 Canales cargados: <span style="color:#fff;">${state.channels.length}</span></div>
        <div style="margin-top:4px;">❌ Último error: <span style="color:#ef9a9a;">${state.lastError || 'ninguno'}</span></div>
        <div style="margin-top:4px;">⚙️ Admin HWIDs: <span style="color:#fff;">configurados en Railway</span></div>
        <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">
          <a href="/api/debug" target="_blank" 
            style="color:#90caf9;font-size:11px;border:1px solid #1565c0;border-radius:4px;padding:3px 8px;text-decoration:none;">
            /api/debug
          </a>
        </div>
      </div>`;
  } else {
    extraInfo = `<div style="color:#555;font-size:11px;margin-top:8px;">Enviá este código al administrador para obtener acceso admin</div>`;
  }

  popup.innerHTML = `
    <div style="color:#90caf9;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Tu HWID</div>
    <div style="color:white;font-size:15px;font-family:monospace;letter-spacing:1px;margin-bottom:4px;word-break:break-all;">${currentHWID}</div>
    ${extraInfo}
    <div style="margin-top:14px;display:flex;gap:8px;justify-content:center;">
      <button onclick="navigator.clipboard.writeText('${currentHWID}').then(()=>{this.textContent='✅ Copiado!';setTimeout(()=>this.textContent='📋 Copiar',1500)})"
        style="background:#1565c0;color:white;border:none;border-radius:6px;padding:8px 20px;cursor:pointer;font-size:13px;">📋 Copiar</button>
      <button onclick="document.getElementById('hwid-popup').remove()"
        style="background:transparent;color:#666;border:1px solid #333;border-radius:6px;padding:8px 16px;cursor:pointer;font-size:13px;">Cerrar</button>
    </div>`;

  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 20000);
}

// ============================================================
// M3U — descarga y parseo en el browser
// ============================================================
function parseM3U(text) {
  const channels = [];
  const lines    = text.split(/\r?\n/);
  let current    = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      const tvgName    = (line.match(/tvg-name="([^"]*)"/)?.[1] || '').trim();
      const tvgLogo    = (line.match(/tvg-logo="([^"]*)"/)?.[1] || '').trim();
      const group      = (line.match(/group-title="([^"]*)"/)?.[1] || 'General').trim();
      const commaIdx   = line.lastIndexOf(',');
      const displayName = commaIdx >= 0 ? line.slice(commaIdx + 1).trim() : tvgName;
      current = {
        name:     displayName || tvgName || 'Canal',
        logo:     tvgLogo || null,
        category: group || 'General',
      };
    } else if (!line.startsWith('#') && current) {
      current.url = line;
      current.id  = channels.length + 1;
      channels.push(current);
      current = null;
    }
  }
  return channels;
}

async function fetchM3U(url) {
  // Intentar fetch directo (funciona si el servidor IPTV tiene CORS abierto)
  try {
    const r = await fetch(url, { mode: 'cors' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const text = await r.text();
    if (text.includes('#EXTINF') || text.includes('#EXTM3U')) return text;
    throw new Error('Respuesta no es M3U: ' + text.slice(0, 80));
  } catch (corsErr) {
    // Si falla por CORS, intentar vía proxy CORS público
    console.warn('[m3u] fetch directo falló, intentando proxy CORS:', corsErr.message);
    const proxies = [
      `https://corsproxy.io/?${encodeURIComponent(url)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    ];
    for (const proxy of proxies) {
      try {
        const r = await fetch(proxy);
        if (!r.ok) continue;
        const text = await r.text();
        if (text.includes('#EXTINF') || text.includes('#EXTM3U')) {
          console.log('[m3u] Proxy funcionó:', proxy.split('?')[0]);
          return text;
        }
      } catch (e) {
        console.warn('[m3u] Proxy falló:', e.message);
      }
    }
    throw new Error('No se pudo descargar el M3U (CORS bloqueado y proxies fallaron)');
  }
}

async function loadChannels() {
  const loadingEl = document.getElementById('channels-loading');
  if (loadingEl) loadingEl.style.display = 'flex';
  state.lastError = null;

  try {
    // 1. Obtener URL del M3U desde el servidor
    const cfgRes = await fetch('/api/config');
    const cfg    = await cfgRes.json();
    state._lastConfig = cfg;
    const m3uUrl = cfg.m3uUrl;

    if (!m3uUrl) throw new Error('No hay URL de M3U configurada');

    console.log('[m3u] Descargando desde:', m3uUrl);

    // 2. Descargar M3U desde el browser (evita restricciones de Railway)
    const raw = await fetchM3U(m3uUrl);

    // 3. Parsear
    state.channels = parseM3U(raw);
    console.log(`✅ ${state.channels.length} canales cargados`);

    if (state.channels.length === 0) {
      state.lastError = 'El M3U se descargó pero no contiene canales válidos';
    }

  } catch (e) {
    state.channels  = [];
    state.lastError = e.message;
    console.error('[loadChannels]', e.message);
  }

  state.filtered = state.channels;
  if (loadingEl) loadingEl.style.display = 'none';
}

// ============================================================
// DATA HELPERS
// ============================================================
function getCategories() {
  return ['all', ...new Set(state.channels.map(c => c.category))];
}

function filterByCategory(cat) {
  state.currentCat = cat;
  state.filtered   = cat === 'all'
    ? state.channels
    : state.channels.filter(c => c.category === cat);
  renderRows();
  rebuildFocusGrid();
}

// ============================================================
// RENDER
// ============================================================
function renderAll() { renderNav(); renderRows(); }

function renderNav() {
  const navEl = document.querySelector('.header-nav');
  navEl.innerHTML = '';
  getCategories().forEach(cat => {
    const btn = document.createElement('button');
    btn.className   = 'nav-btn focusable' + (cat === state.currentCat ? ' active' : '');
    btn.dataset.cat = cat;
    btn.textContent = cat === 'all' ? 'Todos' : cat;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterByCategory(cat);
    });
    navEl.appendChild(btn);
  });
}

function renderRows() {
  const container = document.getElementById('channel-rows');
  container.innerHTML = '';

  if (state.channels.length === 0) {
    const err = state.lastError || 'No se encontraron canales';
    container.innerHTML = `
      <div style="text-align:center;padding:60px 40px;color:#666;max-width:600px;margin:0 auto;">
        <div style="font-size:48px;margin-bottom:16px;">📡</div>
        <div style="font-size:18px;margin-bottom:12px;color:#aaa;">Sin canales disponibles</div>
        <div style="font-size:13px;color:#e57373;background:rgba(229,115,115,0.08);
          border:1px solid rgba(229,115,115,0.25);border-radius:8px;
          padding:12px 16px;margin-bottom:16px;text-align:left;word-break:break-all;">
          ⚠️ ${err}
        </div>
        <div style="font-size:12px;color:#555;margin-bottom:20px;">
          ${isAdmin
            ? `Revisá el link M3U en el panel ⚙️ o presioná <kbd style="background:#222;padding:2px 6px;border-radius:4px;">Ctrl+I+O</kbd> para diagnóstico.`
            : `Presioná <kbd style="background:#222;padding:2px 6px;border-radius:4px;">Ctrl+I+O</kbd> para ver tu HWID.`
          }
        </div>
        <button onclick="location.reload()"
          style="background:#1565c0;color:white;border:none;border-radius:8px;padding:10px 24px;cursor:pointer;font-size:14px;">
          🔄 Reintentar
        </button>
      </div>`;
    return;
  }

  if (state.currentCat === 'all') {
    const byCategory = {};
    state.channels.forEach(ch => {
      if (!byCategory[ch.category]) byCategory[ch.category] = [];
      byCategory[ch.category].push(ch);
    });
    Object.entries(byCategory).forEach(([cat, chs]) => renderRow(container, cat, chs));
  } else {
    renderRow(container, state.currentCat, state.filtered);
  }
  rebuildFocusGrid();
}

function renderRow(container, title, channels) {
  const row    = document.createElement('div');
  row.className = 'channel-row';
  const titleEl = document.createElement('div');
  titleEl.className = 'row-title';
  titleEl.innerHTML = `<span>${title}</span>`;
  const scroll = document.createElement('div');
  scroll.className = 'cards-scroll';
  channels.forEach(ch => scroll.appendChild(createCard(ch)));
  row.appendChild(titleEl);
  row.appendChild(scroll);
  container.appendChild(row);
}

function createCard(ch) {
  const card     = document.createElement('div');
  card.className = 'channel-card focusable';
  card.tabIndex  = 0;
  card.dataset.id = ch.id;
  const isFav    = state.favorites.includes(ch.id);
  card.innerHTML = `
    <div class="card-inner">
      <div class="card-bg" style="background:linear-gradient(135deg,#1a237e,#0d47a1);"></div>
      <div class="card-gradient"></div>
      ${ch.logo ? `<div class="card-logo"><img src="${ch.logo}" alt="${ch.name}" loading="lazy" onerror="this.style.display='none'"></div>` : ''}
      <div class="card-info">
        <div class="card-name">${ch.name}</div>
        <div class="card-desc">${ch.category}</div>
      </div>
      <div class="card-live-dot"></div>
      ${isFav ? '<div style="position:absolute;top:8px;right:8px;font-size:16px;">⭐</div>' : ''}
    </div>`;
  card.addEventListener('click', () => playChannel(ch));
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); playChannel(ch); }
  });
  return card;
}

// ============================================================
// PLAYER
// ============================================================
function playChannel(ch) {
  state.inPlayer = true;
  const overlay = document.getElementById('player-overlay');
  const video   = document.getElementById('hls-player');
  const loading = document.getElementById('player-loading');

  overlay.classList.remove('hidden');
  loading.style.display = 'flex';
  loading.innerHTML     = '<div class="spinner"></div><p>Cargando transmisión...</p>';
  video.style.display   = 'none';

  document.getElementById('player-title').textContent        = ch.name;
  document.getElementById('player-channel-name').textContent = ch.name;
  document.getElementById('player-channel-desc').textContent = ch.category;

  if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
  video.src = '';

  if (!ch.url) {
    loading.innerHTML = '<p style="color:#ef5350">Sin URL de stream</p>';
    return;
  }

  if (typeof Hls !== 'undefined' && Hls.isSupported()) {
    hlsInstance = new Hls({ enableWorker: true, maxBufferLength: 30 });
    hlsInstance.loadSource(ch.url);
    hlsInstance.attachMedia(video);
    hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
      loading.style.display = 'none'; video.style.display = 'block';
      video.play().catch(console.error);
    });
    hlsInstance.on(Hls.Events.ERROR, (_, data) => {
      if (data.fatal) {
        loading.innerHTML = `<p style="color:#ef5350">Error al reproducir</p><small style="color:#777">${data.type}: ${data.details}</small>`;
        loading.style.display = 'flex'; video.style.display = 'none';
      }
    });
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = ch.url;
    video.addEventListener('loadedmetadata', () => {
      loading.style.display = 'none'; video.style.display = 'block'; video.play().catch(console.error);
    }, { once: true });
    video.addEventListener('error', () => {
      loading.innerHTML = '<p style="color:#ef5350">Error cargando stream</p>';
      loading.style.display = 'flex'; video.style.display = 'none';
    }, { once: true });
  } else {
    video.src = ch.url; video.load();
    loading.style.display = 'none'; video.style.display = 'block';
    video.play().catch(console.error);
  }

  document.getElementById('player-back').focus();
}

function closePlayer() {
  state.inPlayer = false;
  const video = document.getElementById('hls-player');
  document.getElementById('player-overlay').classList.add('hidden');
  video.pause(); video.src = '';
  if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
  focusFirst();
}

// ============================================================
// ADMIN PANEL
// ============================================================
function setupAdmin() {
  const adminBtn     = document.getElementById('btn-admin');
  const adminOverlay = document.getElementById('admin-overlay');
  const closeBtn     = document.getElementById('admin-close');
  const saveBtn      = document.getElementById('admin-save');
  const refreshBtn   = document.getElementById('admin-refresh');
  const msgEl        = document.getElementById('admin-msg');
  const urlInput     = document.getElementById('admin-m3u-url');

  adminBtn.addEventListener('click', async () => {
    if (!isAdmin) return;
    adminOverlay.classList.remove('hidden');
    msgEl.style.display = 'none';
    try {
      const cfg = await fetch('/api/config').then(r => r.json());
      urlInput.value = cfg.m3uUrl || '';
    } catch (e) {}
  });

  closeBtn.addEventListener('click', () => adminOverlay.classList.add('hidden'));
  adminOverlay.addEventListener('click', e => { if (e.target === adminOverlay) adminOverlay.classList.add('hidden'); });

  saveBtn.addEventListener('click', async () => {
    const m3uUrl = urlInput.value.trim();
    if (!m3uUrl) { showMsg('Ingresá una URL', 'error'); return; }
    showMsg('Guardando...', '');
    try {
      const r    = await fetch('/api/admin/m3u', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hwid: currentHWID, m3uUrl })
      });
      const data = await r.json();
      if (data.success) {
        showMsg('✅ Guardado. Recargando canales...', 'success');
        await loadChannels();
        renderAll();
        showMsg(`✅ ${state.channels.length} canales cargados`, 'success');
      } else {
        showMsg('❌ ' + data.error, 'error');
      }
    } catch (e) { showMsg('❌ Error de conexión', 'error'); }
  });

  refreshBtn.addEventListener('click', async () => {
    showMsg('Recargando canales...', '');
    await loadChannels();
    renderAll();
    if (state.lastError) {
      showMsg('❌ ' + state.lastError, 'error');
    } else {
      showMsg(`✅ ${state.channels.length} canales cargados`, 'success');
    }
  });

  function showMsg(text, type) {
    msgEl.textContent   = text;
    msgEl.className     = type;
    msgEl.style.display = 'block';
  }
}

// ============================================================
// FOCUS / NAVEGACIÓN
// ============================================================
function setupNav() {
  document.getElementById('player-back').addEventListener('click', closePlayer);
}

function rebuildFocusGrid() {
  state.focusGrid = [];
  const navBtns = Array.from(document.querySelectorAll('.nav-btn'));
  if (navBtns.length) state.focusGrid.push(navBtns);
  document.querySelectorAll('.cards-scroll').forEach(row => {
    const cards = Array.from(row.querySelectorAll('.channel-card'));
    if (cards.length) state.focusGrid.push(cards);
  });
}

function focusFirst() {
  rebuildFocusGrid();
  if (state.focusGrid.length && state.focusGrid[0].length) {
    state.focusRow = 0; state.focusCol = 0;
    state.focusGrid[0][0].focus();
  }
}

function moveFocus(dr, dc) {
  if (state.inPlayer) return;
  const grid = state.focusGrid;
  if (!grid.length) return;
  const r = Math.max(0, Math.min(state.focusRow + dr, grid.length - 1));
  const c = Math.max(0, Math.min(state.focusCol + dc, grid[r].length - 1));
  state.focusRow = r; state.focusCol = c;
  const el = grid[r][c];
  if (el) { el.focus(); el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' }); }
}

function setupRemote() {
  document.addEventListener('keydown', e => {
    if (state.inPlayer) {
      if (['Escape','Backspace','GoBack'].includes(e.key)) closePlayer();
      return;
    }
    switch (e.key) {
      case 'ArrowUp':    e.preventDefault(); moveFocus(-1, 0); break;
      case 'ArrowDown':  e.preventDefault(); moveFocus(1,  0); break;
      case 'ArrowLeft':  e.preventDefault(); moveFocus(0, -1); break;
      case 'ArrowRight': e.preventDefault(); moveFocus(0,  1); break;
      case 'Escape':
        document.getElementById('search-overlay').classList.add('hidden');
        document.getElementById('admin-overlay').classList.add('hidden');
        document.getElementById('hwid-popup')?.remove();
        break;
    }
  });
}

// ============================================================
// SEARCH
// ============================================================
function setupSearch() {
  const overlay = document.getElementById('search-overlay');
  const input   = document.getElementById('search-input');
  const close   = document.getElementById('search-close');
  const results = document.getElementById('search-results');

  document.getElementById('btn-search').addEventListener('click', () => {
    overlay.classList.remove('hidden'); input.focus();
  });
  close.addEventListener('click', () => overlay.classList.add('hidden'));

  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    if (!q) { results.innerHTML = ''; return; }
    const found = state.channels
      .filter(c => c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q))
      .slice(0, 20);
    results.innerHTML = found.map(ch => `
      <div class="search-result-item" data-id="${ch.id}"
        style="padding:12px 16px;cursor:pointer;border-bottom:1px solid #222;display:flex;align-items:center;gap:12px;">
        ${ch.logo
          ? `<img src="${ch.logo}" style="width:40px;height:40px;object-fit:contain;" onerror="this.style.display='none'">`
          : `<div style="width:40px;height:40px;background:#1a237e;border-radius:4px;"></div>`}
        <div>
          <div style="font-weight:600">${ch.name}</div>
          <div style="font-size:12px;color:#888">${ch.category}</div>
        </div>
      </div>`).join('');
    results.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const ch = state.channels.find(c => c.id == item.dataset.id);
        if (ch) { overlay.classList.add('hidden'); playChannel(ch); }
      });
    });
  });
}

// ============================================================
// BOTTOM NAV
// ============================================================
function setupBottomNav() {
  document.getElementById('btn-home').addEventListener('click', () => {
    state.currentCat = 'all';
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === 'all'));
    filterByCategory('all'); focusFirst();
  });
  document.getElementById('btn-favorites').addEventListener('click', () => {
    state.filtered   = state.channels.filter(c => state.favorites.includes(c.id));
    state.currentCat = 'favorites';
    renderRows(); rebuildFocusGrid();
  });
}

// ============================================================
// HEADER SCROLL
// ============================================================
document.getElementById('app-main')?.addEventListener('scroll', () => {
  document.getElementById('app-header')?.classList.toggle('solid',
    document.getElementById('app-main').scrollTop > 10);
});

// ============================================================
// INIT
// ============================================================
async function init() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(console.error);

  // Verificar admin primero (antes de renderizar para saber si mostrar botón)
  await checkAdminStatus();
  await loadChannels();

  renderAll();
  setupNav();
  setupRemote();
  setupSearch();
  setupBottomNav();
  setupAdmin();
  setupHWIDShortcut();

  setTimeout(() => focusFirst(), 300);
}

document.addEventListener('DOMContentLoaded', init);
