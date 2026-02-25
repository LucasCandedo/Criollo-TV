// ============================================================
// CRIOLLOTV - M3U IPTV PWA para Android TV
// ============================================================

const API = '/api/channels';
let hlsInstance = null;
let currentHWID = null;
let isAdmin = false;

const state = {
  channels: [],
  filtered: [],
  currentCat: 'all',
  currentChannel: null,
  focusGrid: [],
  focusRow: 0,
  focusCol: 0,
  inPlayer: false,
  favorites: JSON.parse(localStorage.getItem('criollo-favs') || '[]'),
};

// ============================================================
// HWID - Identificador de dispositivo persistente
// ============================================================
function getHWID() {
  let hwid = localStorage.getItem('criollo-hwid');
  if (!hwid) {
    // Generar HWID basado en fingerprint del navegador
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    const debugInfo = gl ? gl.getExtension('WEBGL_debug_renderer_info') : null;
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
    const vendor   = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : '';

    const raw = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      renderer,
      vendor,
      navigator.hardwareConcurrency || '',
    ].join('|');

    // Hash simple
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash) + raw.charCodeAt(i);
      hash |= 0;
    }
    // Convertir a hex positivo + sufijo aleatorio para unicidad
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    const rand = Math.random().toString(36).slice(2, 6);
    hwid = `criollo-${hex}-${rand}`;
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
    const data = await r.json();
    isAdmin = data.isAdmin;
  } catch (e) {
    isAdmin = false;
  }

  // Mostrar/ocultar botón admin según resultado
  const adminBtn = document.getElementById('btn-admin');
  if (adminBtn) {
    adminBtn.style.display = isAdmin ? 'flex' : 'none';
  }
}

// ============================================================
// INIT
// ============================================================
async function init() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
  }

  // Verificar admin en paralelo con carga de canales
  await Promise.all([
    checkAdminStatus(),
    loadChannels()
  ]);

  renderAll();
  setupNav();
  setupRemote();
  setupSearch();
  setupBottomNav();
  setupAdmin();
  setupHWIDShortcut();

  setTimeout(() => focusFirst(), 300);
}

// ============================================================
// HWID SHORTCUT - Ctrl + I + O
// ============================================================
function setupHWIDShortcut() {
  const pressed = new Set();

  document.addEventListener('keydown', (e) => {
    pressed.add(e.key.toLowerCase());

    if (pressed.has('control') && pressed.has('i') && pressed.has('o')) {
      showHWIDPopup();
    }
  });

  document.addEventListener('keyup', (e) => {
    pressed.delete(e.key.toLowerCase());
  });
}

function showHWIDPopup() {
  // Remover popup anterior si existe
  const existing = document.getElementById('hwid-popup');
  if (existing) { existing.remove(); return; }

  const popup = document.createElement('div');
  popup.id = 'hwid-popup';
  popup.style.cssText = `
    position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
    background: #0d0d1e; border: 2px solid #1565c0;
    border-radius: 12px; padding: 20px 28px;
    z-index: 500; text-align: center;
    box-shadow: 0 0 30px rgba(21,101,192,0.5);
    min-width: 360px;
  `;
  popup.innerHTML = `
    <div style="color:#90caf9;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Tu HWID</div>
    <div style="color:white;font-size:18px;font-family:monospace;letter-spacing:2px;margin-bottom:12px;">${currentHWID}</div>
    <div style="color:#555;font-size:11px;margin-bottom:14px;">Enviá este código al administrador para obtener acceso admin</div>
    <button onclick="navigator.clipboard.writeText('${currentHWID}').then(()=>{ this.textContent='✅ Copiado!'; setTimeout(()=>this.textContent='📋 Copiar',1500) })" 
      style="background:#1565c0;color:white;border:none;border-radius:6px;padding:8px 20px;cursor:pointer;font-size:13px;">
      📋 Copiar
    </button>
    <button onclick="document.getElementById('hwid-popup').remove()"
      style="background:transparent;color:#666;border:1px solid #333;border-radius:6px;padding:8px 16px;cursor:pointer;font-size:13px;margin-left:8px;">
      Cerrar
    </button>
  `;
  document.body.appendChild(popup);

  // Auto-cerrar después de 15 segundos
  setTimeout(() => popup.remove(), 15000);
}

// ============================================================
// DATA
// ============================================================
async function loadChannels() {
  const loadingEl = document.getElementById('channels-loading');
  if (loadingEl) loadingEl.style.display = 'flex';

  try {
    const r = await fetch(API);
    const data = await r.json();
    if (data.success && Array.isArray(data.channels) && data.channels.length > 0) {
      state.channels = data.channels;
      console.log(`✅ ${data.channels.length} canales cargados`);
    } else {
      console.warn('Sin canales:', data);
      state.channels = [];
    }
  } catch (e) {
    console.error('Error loading channels:', e);
    state.channels = [];
  }

  state.filtered = state.channels;
  if (loadingEl) loadingEl.style.display = 'none';
}

function getCategories() {
  return ['all', ...new Set(state.channels.map(c => c.category))];
}

function filterByCategory(cat) {
  state.currentCat = cat;
  state.filtered = cat === 'all'
    ? state.channels
    : state.channels.filter(c => c.category === cat);
  renderRows();
  rebuildFocusGrid();
}

// ============================================================
// RENDER
// ============================================================
function renderAll() {
  renderNav();
  renderRows();
}

function renderNav() {
  const cats = getCategories();
  const navEl = document.querySelector('.header-nav');
  navEl.innerHTML = '';
  cats.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'nav-btn focusable' + (cat === state.currentCat ? ' active' : '');
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
    container.innerHTML = `
      <div style="text-align:center;padding:80px 0;color:#666;">
        <div style="font-size:48px;margin-bottom:16px;">📡</div>
        <div style="font-size:20px;margin-bottom:8px;color:#aaa;">No se encontraron canales</div>
        <div style="font-size:14px;color:#555;">Verificá el link M3U desde el panel de administración</div>
        <div style="font-size:12px;color:#444;margin-top:8px;">Presioná Ctrl+I+O para ver tu HWID</div>
      </div>`;
    return;
  }

  if (state.currentCat === 'all') {
    const byCategory = {};
    state.channels.forEach(ch => {
      if (!byCategory[ch.category]) byCategory[ch.category] = [];
      byCategory[ch.category].push(ch);
    });
    Object.entries(byCategory).forEach(([cat, channels]) => {
      renderRow(container, cat, channels);
    });
  } else {
    renderRow(container, state.currentCat, state.filtered);
  }

  rebuildFocusGrid();
}

function renderRow(container, title, channels) {
  const row = document.createElement('div');
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
  const card = document.createElement('div');
  card.className = 'channel-card focusable';
  card.tabIndex = 0;
  card.dataset.id = ch.id;

  const isFav = state.favorites.includes(ch.id);

  card.innerHTML = `
    <div class="card-inner">
      <div class="card-bg" style="background: linear-gradient(135deg, #1a237e, #0d47a1);"></div>
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
// PLAYER - HLS
// ============================================================
function playChannel(ch) {
  state.currentChannel = ch;
  state.inPlayer = true;

  const overlay  = document.getElementById('player-overlay');
  const video    = document.getElementById('hls-player');
  const loading  = document.getElementById('player-loading');
  const titleEl  = document.getElementById('player-title');
  const nameEl   = document.getElementById('player-channel-name');
  const descEl   = document.getElementById('player-channel-desc');

  overlay.classList.remove('hidden');
  loading.style.display = 'flex';
  loading.innerHTML = '<div class="spinner"></div><p>Cargando transmisión...</p>';
  video.style.display = 'none';

  titleEl.textContent = ch.name;
  nameEl.textContent  = ch.name;
  descEl.textContent  = ch.category;

  if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
  video.src = '';

  const url = ch.url;
  if (!url) {
    loading.innerHTML = '<p style="color:#ef5350">Sin URL de stream</p>';
    return;
  }

  if (Hls.isSupported()) {
    hlsInstance = new Hls({ enableWorker: true, maxBufferLength: 30 });
    hlsInstance.loadSource(url);
    hlsInstance.attachMedia(video);
    hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
      loading.style.display = 'none';
      video.style.display = 'block';
      video.play().catch(console.error);
    });
    hlsInstance.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        loading.innerHTML = `<p style="color:#ef5350">Error al reproducir</p><small style="color:#777">${data.type}: ${data.details}</small>`;
        loading.style.display = 'flex';
        video.style.display = 'none';
      }
    });
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = url;
    video.addEventListener('loadedmetadata', () => {
      loading.style.display = 'none';
      video.style.display = 'block';
      video.play().catch(console.error);
    }, { once: true });
    video.addEventListener('error', () => {
      loading.innerHTML = '<p style="color:#ef5350">Error cargando stream</p>';
      loading.style.display = 'flex';
      video.style.display = 'none';
    }, { once: true });
  } else {
    video.src = url;
    video.load();
    loading.style.display = 'none';
    video.style.display = 'block';
    video.play().catch(console.error);
  }

  document.getElementById('player-back').focus();
}

function closePlayer() {
  state.inPlayer = false;
  const overlay = document.getElementById('player-overlay');
  const video   = document.getElementById('hls-player');
  overlay.classList.add('hidden');
  video.pause();
  video.src = '';
  if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
  focusFirst();
}

// ============================================================
// ADMIN PANEL
// ============================================================
function setupAdmin() {
  const adminBtn    = document.getElementById('btn-admin');
  const adminOverlay = document.getElementById('admin-overlay');
  const closeBtn    = document.getElementById('admin-close');
  const saveBtn     = document.getElementById('admin-save');
  const refreshBtn  = document.getElementById('admin-refresh');
  const msgEl       = document.getElementById('admin-msg');
  const urlInput    = document.getElementById('admin-m3u-url');

  // El botón ya se muestra/oculta en checkAdminStatus()
  adminBtn.addEventListener('click', async () => {
    if (!isAdmin) return;
    adminOverlay.classList.remove('hidden');
    try {
      const r = await fetch('/api/config');
      const cfg = await r.json();
      urlInput.value = cfg.m3uUrl || '';
    } catch (e) {}
    msgEl.className = '';
    msgEl.style.display = 'none';
  });

  closeBtn.addEventListener('click', () => adminOverlay.classList.add('hidden'));
  adminOverlay.addEventListener('click', e => {
    if (e.target === adminOverlay) adminOverlay.classList.add('hidden');
  });

  saveBtn.addEventListener('click', async () => {
    const m3uUrl = urlInput.value.trim();
    if (!m3uUrl) return;
    showAdminMsg('Guardando...', '');

    try {
      const r = await fetch('/api/admin/m3u', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hwid: currentHWID, m3uUrl })
      });
      const data = await r.json();
      if (data.success) {
        showAdminMsg('✅ ' + data.message, 'success');
        await loadChannels();
        renderAll();
      } else {
        showAdminMsg('❌ ' + data.error, 'error');
      }
    } catch (e) {
      showAdminMsg('❌ Error de conexión', 'error');
    }
  });

  refreshBtn.addEventListener('click', async () => {
    showAdminMsg('Refrescando...', '');
    try {
      const r = await fetch('/api/admin/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hwid: currentHWID })
      });
      const data = await r.json();
      if (data.success) {
        showAdminMsg('✅ ' + data.message, 'success');
        await loadChannels();
        renderAll();
      } else {
        showAdminMsg('❌ ' + data.error, 'error');
      }
    } catch (e) {
      showAdminMsg('❌ Error de conexión', 'error');
    }
  });

  function showAdminMsg(text, type) {
    msgEl.textContent = text;
    msgEl.className = type;
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
  if (navBtns.length > 0) state.focusGrid.push(navBtns);
  document.querySelectorAll('.cards-scroll').forEach(row => {
    const cards = Array.from(row.querySelectorAll('.channel-card'));
    if (cards.length > 0) state.focusGrid.push(cards);
  });
}

function focusFirst() {
  rebuildFocusGrid();
  if (state.focusGrid.length > 0 && state.focusGrid[0].length > 0) {
    state.focusRow = 0;
    state.focusCol = 0;
    state.focusGrid[0][0].focus();
  }
}

function moveFocus(dr, dc) {
  if (state.inPlayer) return;
  const grid = state.focusGrid;
  if (grid.length === 0) return;
  let r = Math.max(0, Math.min(state.focusRow + dr, grid.length - 1));
  let c = Math.max(0, Math.min(state.focusCol + dc, grid[r].length - 1));
  state.focusRow = r;
  state.focusCol = c;
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
      case 'ArrowDown':  e.preventDefault(); moveFocus(1, 0);  break;
      case 'ArrowLeft':  e.preventDefault(); moveFocus(0, -1); break;
      case 'ArrowRight': e.preventDefault(); moveFocus(0, 1);  break;
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
    overlay.classList.remove('hidden');
    input.focus();
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
    document.querySelectorAll('.nav-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.cat === 'all');
    });
    filterByCategory('all');
    focusFirst();
  });

  document.getElementById('btn-favorites').addEventListener('click', () => {
    state.filtered = state.channels.filter(c => state.favorites.includes(c.id));
    state.currentCat = 'favorites';
    renderRows();
    rebuildFocusGrid();
  });
}

// ============================================================
// HEADER SCROLL
// ============================================================
const mainEl = document.getElementById('app-main');
if (mainEl) {
  mainEl.addEventListener('scroll', () => {
    const header = document.getElementById('app-header');
    if (header) header.classList.toggle('solid', mainEl.scrollTop > 10);
  });
}

// ============================================================
// START
// ============================================================
document.addEventListener('DOMContentLoaded', init);
