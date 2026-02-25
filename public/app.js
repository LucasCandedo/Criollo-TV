// ============================================================
// CRIOLLOTV - M3U PWA para Android TV
// ============================================================

const API = '/api/channels';
let hlsInstance = null;

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
// INIT
// ============================================================
async function init() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
  }
  await loadChannels();
  renderAll();
  setupNav();
  setupRemote();
  setupSearch();
  setupBottomNav();
  setupAdmin();
  setTimeout(() => focusFirst(), 300);
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
    if (data.success && data.channels) {
      state.channels = data.channels;
    } else {
      state.channels = [];
    }
  } catch (e) {
    console.error('Error loading channels', e);
    state.channels = [];
  }

  state.filtered = state.channels;
  if (loadingEl) loadingEl.style.display = 'none';
}

function getCategories() {
  const cats = ['all', ...new Set(state.channels.map(c => c.category))];
  return cats;
}

function filterByCategory(cat) {
  state.currentCat = cat;
  if (cat === 'all') {
    // En "all" mostramos todas las categorías como filas separadas
    state.filtered = state.channels;
  } else {
    state.filtered = state.channels.filter(c => c.category === cat);
  }
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
        <div style="font-size:20px;margin-bottom:8px;">No se encontraron canales</div>
        <div style="font-size:14px;color:#555;">Verificá el link M3U en el panel de administración</div>
      </div>`;
    return;
  }

  if (state.currentCat === 'all') {
    // Agrupar por categoría
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

  channels.forEach(ch => {
    const card = createCard(ch);
    scroll.appendChild(card);
  });

  row.appendChild(titleEl);
  row.appendChild(scroll);
  container.appendChild(row);
}

function createCard(ch) {
  const card = document.createElement('div');
  card.className = 'channel-card focusable';
  card.tabIndex = 0;
  card.dataset.id = ch.id;
  card.dataset.url = ch.url || '';

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
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      playChannel(ch);
    }
  });

  return card;
}

// ============================================================
// PLAYER - HLS
// ============================================================
function playChannel(ch) {
  state.currentChannel = ch;
  state.inPlayer = true;

  const overlay = document.getElementById('player-overlay');
  const video = document.getElementById('hls-player');
  const loading = document.getElementById('player-loading');
  const titleEl = document.getElementById('player-title');
  const nameEl = document.getElementById('player-channel-name');
  const descEl = document.getElementById('player-channel-desc');

  overlay.classList.remove('hidden');
  loading.style.display = 'flex';
  video.style.display = 'none';

  titleEl.textContent = ch.name;
  nameEl.textContent = ch.name;
  descEl.textContent = ch.category;

  // Limpiar instancia HLS anterior
  if (hlsInstance) {
    hlsInstance.destroy();
    hlsInstance = null;
  }
  video.src = '';

  const streamUrl = ch.url;

  if (!streamUrl) {
    loading.innerHTML = '<p style="color:#ef5350">No hay URL de stream disponible</p>';
    return;
  }

  // Intentar reproducir con HLS.js o nativo
  function startPlayback(url) {
    if (Hls.isSupported()) {
      hlsInstance = new Hls({
        enableWorker: true,
        maxBufferLength: 30,
        xhrSetup: (xhr) => {
          xhr.setRequestHeader('User-Agent', 'Mozilla/5.0');
        }
      });
      hlsInstance.loadSource(url);
      hlsInstance.attachMedia(video);
      hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
        loading.style.display = 'none';
        video.style.display = 'block';
        video.play().catch(console.error);
      });
      hlsInstance.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.error('HLS fatal error:', data);
          loading.innerHTML = `<p style="color:#ef5350">Error reproduciendo stream</p><p style="font-size:12px;color:#777;margin-top:8px;">${data.type}</p>`;
          loading.style.display = 'flex';
          video.style.display = 'none';
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari nativo HLS
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
      // Fallback directo
      video.src = url;
      video.load();
      loading.style.display = 'none';
      video.style.display = 'block';
      video.play().catch(console.error);
    }
  }

  startPlayback(streamUrl);

  document.getElementById('player-back').focus();
}

function closePlayer() {
  state.inPlayer = false;
  const overlay = document.getElementById('player-overlay');
  const video = document.getElementById('hls-player');

  overlay.classList.add('hidden');
  video.pause();
  video.src = '';

  if (hlsInstance) {
    hlsInstance.destroy();
    hlsInstance = null;
  }

  focusFirst();
}

// ============================================================
// ADMIN
// ============================================================
function setupAdmin() {
  const adminBtn = document.getElementById('btn-admin');
  const adminOverlay = document.getElementById('admin-overlay');
  const closeBtn = document.getElementById('admin-close');
  const saveBtn = document.getElementById('admin-save');
  const refreshBtn = document.getElementById('admin-refresh');
  const msgEl = document.getElementById('admin-msg');
  const urlInput = document.getElementById('admin-m3u-url');

  // Cargar URL actual al abrir
  adminBtn.addEventListener('click', async () => {
    adminOverlay.classList.remove('hidden');
    try {
      const r = await fetch('/api/config');
      const cfg = await r.json();
      urlInput.value = cfg.m3uUrl || '';
    } catch (e) {}
    msgEl.className = '';
    msgEl.style.display = 'none';
    document.getElementById('admin-password').value = '';
  });

  closeBtn.addEventListener('click', () => {
    adminOverlay.classList.add('hidden');
  });

  adminOverlay.addEventListener('click', (e) => {
    if (e.target === adminOverlay) adminOverlay.classList.add('hidden');
  });

  saveBtn.addEventListener('click', async () => {
    const password = document.getElementById('admin-password').value;
    const m3uUrl = urlInput.value.trim();
    msgEl.className = '';
    msgEl.textContent = 'Guardando...';
    msgEl.style.display = 'block';

    try {
      const r = await fetch('/api/admin/m3u', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, m3uUrl })
      });
      const data = await r.json();
      if (data.success) {
        msgEl.className = 'success';
        msgEl.textContent = '✅ ' + data.message;
        // Recargar canales
        await loadChannels();
        renderAll();
      } else {
        msgEl.className = 'error';
        msgEl.textContent = '❌ ' + data.error;
      }
    } catch (e) {
      msgEl.className = 'error';
      msgEl.textContent = '❌ Error de conexión';
    }
  });

  refreshBtn.addEventListener('click', async () => {
    const password = document.getElementById('admin-password').value;
    msgEl.className = '';
    msgEl.textContent = 'Refrescando...';
    msgEl.style.display = 'block';

    try {
      const r = await fetch('/api/admin/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await r.json();
      if (data.success) {
        msgEl.className = 'success';
        msgEl.textContent = '✅ Cache refrescado';
        await loadChannels();
        renderAll();
      } else {
        msgEl.className = 'error';
        msgEl.textContent = '❌ ' + data.error;
      }
    } catch (e) {
      msgEl.className = 'error';
      msgEl.textContent = '❌ Error de conexión';
    }
  });
}

// ============================================================
// NAV / FOCUS
// ============================================================
function setupNav() {
  document.getElementById('player-back').addEventListener('click', closePlayer);
}

function rebuildFocusGrid() {
  state.focusGrid = [];
  const rows = document.querySelectorAll('.cards-scroll');
  rows.forEach(row => {
    const cards = Array.from(row.querySelectorAll('.channel-card'));
    if (cards.length > 0) state.focusGrid.push(cards);
  });
  const navBtns = Array.from(document.querySelectorAll('.nav-btn'));
  if (navBtns.length > 0) state.focusGrid.unshift(navBtns);
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

  let r = state.focusRow + dr;
  let c = state.focusCol + dc;

  r = Math.max(0, Math.min(r, grid.length - 1));
  c = Math.max(0, Math.min(c, grid[r].length - 1));

  state.focusRow = r;
  state.focusCol = c;

  const el = grid[r][c];
  if (el) {
    el.focus();
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }
}

function setupRemote() {
  document.addEventListener('keydown', (e) => {
    if (state.inPlayer) {
      if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'GoBack') closePlayer();
      return;
    }
    switch (e.key) {
      case 'ArrowUp':    e.preventDefault(); moveFocus(-1, 0); break;
      case 'ArrowDown':  e.preventDefault(); moveFocus(1, 0);  break;
      case 'ArrowLeft':  e.preventDefault(); moveFocus(0, -1); break;
      case 'ArrowRight': e.preventDefault(); moveFocus(0, 1);  break;
      case 'Enter':      break; // handled by element
      case 'Escape':
        document.getElementById('search-overlay').classList.add('hidden');
        document.getElementById('admin-overlay').classList.add('hidden');
        break;
    }
  });
}

// ============================================================
// SEARCH
// ============================================================
function setupSearch() {
  const overlay = document.getElementById('search-overlay');
  const input = document.getElementById('search-input');
  const close = document.getElementById('search-close');
  const results = document.getElementById('search-results');

  document.getElementById('btn-search').addEventListener('click', () => {
    overlay.classList.remove('hidden');
    input.focus();
  });
  close.addEventListener('click', () => overlay.classList.add('hidden'));

  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    if (!q) { results.innerHTML = ''; return; }
    const found = state.channels.filter(c =>
      c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
    ).slice(0, 20);
    results.innerHTML = found.map(ch => `
      <div class="search-result-item" data-id="${ch.id}" style="padding:12px 16px;cursor:pointer;border-bottom:1px solid #222;display:flex;align-items:center;gap:12px;">
        ${ch.logo ? `<img src="${ch.logo}" style="width:40px;height:40px;object-fit:contain;" onerror="this.style.display='none'">` : '<div style="width:40px;height:40px;background:#1a237e;border-radius:4px;"></div>'}
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
