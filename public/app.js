// ============================================================
// ARGENTINA TV - PWA para Android TV
// ============================================================

const API = '/api/channels';

// Estado de la app
const state = {
  channels: [],
  filtered: [],
  currentCat: 'all',
  currentChannel: null,
  focusGrid: [], // [[el, el, ...], [el, el, ...]] por fila
  focusRow: 0,
  focusCol: 0,
  inPlayer: false,
  favorites: JSON.parse(localStorage.getItem('ar-tv-favs') || '[]'),
};

// ============================================================
// INIT
// ============================================================
async function init() {
  // PWA Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
  }

  await loadChannels();
  renderAll();
  setupNav();
  setupRemote();
  setupSearch();
  setupBottomNav();
  updateHero(state.channels[0]);

  // Focus inicial
  setTimeout(() => focusFirst(), 300);
}

// ============================================================
// DATA
// ============================================================
async function loadChannels() {
  try {
    const r = await fetch(API);
    state.channels = await r.json();
    state.filtered = state.channels;
  } catch (e) {
    console.error('Error loading channels', e);
    state.channels = FALLBACK_CHANNELS;
    state.filtered = FALLBACK_CHANNELS;
  }
}

function getCategories() {
  const cats = ['all', ...new Set(state.channels.map(c => c.category))];
  return cats;
}

function filterByCategory(cat) {
  state.currentCat = cat;
  state.filtered = cat === 'all' ? state.channels : state.channels.filter(c => c.category === cat);
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
    btn.textContent = cat === 'all' ? 'Inicio' : cat;
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

  // Grupo por categoría
  const groups = {};
  state.filtered.forEach(ch => {
    if (!groups[ch.category]) groups[ch.category] = [];
    groups[ch.category].push(ch);
  });

  // Favoritos
  if (state.currentCat === 'all' && state.favorites.length > 0) {
    const favChannels = state.channels.filter(c => state.favorites.includes(c.id));
    if (favChannels.length > 0) {
      container.appendChild(createRow('⭐ Mis Favoritos', favChannels));
    }
  }

  Object.entries(groups).forEach(([cat, channels]) => {
    container.appendChild(createRow(cat, channels));
  });

  rebuildFocusGrid();
}

function createRow(title, channels) {
  const row = document.createElement('section');
  row.className = 'channel-row';
  row.dataset.category = title;

  const h2 = document.createElement('h2');
  h2.className = 'row-title';
  h2.innerHTML = `<span>${title}</span>`;

  const scroll = document.createElement('div');
  scroll.className = 'cards-scroll';

  channels.forEach(ch => {
    scroll.appendChild(createCard(ch));
  });

  row.appendChild(h2);
  row.appendChild(scroll);
  return row;
}

function createCard(ch) {
  const card = document.createElement('div');
  card.className = 'channel-card focusable';
  card.tabIndex = 0;
  card.dataset.id = ch.id;

  const isFav = state.favorites.includes(ch.id);
  const bgColor = ch.color || '#1f1f1f';

  card.innerHTML = `
    <div class="card-inner">
      <div class="card-bg" style="background: linear-gradient(135deg, ${bgColor}33, ${bgColor}88);"></div>
      <div class="card-color-bar" style="background: ${bgColor};"></div>
      <div class="card-gradient"></div>
      <img class="card-logo" src="${getChannelLogo(ch)}" alt="${ch.name}" onerror="this.style.display='none'">
      <div class="card-info">
        <div class="card-name">${ch.name}</div>
        <div class="card-desc">${ch.description}</div>
      </div>
      <div class="card-live-dot">EN VIVO</div>
      ${isFav ? '<div style="position:absolute;top:12px;left:12px;font-size:18px;">⭐</div>' : ''}
    </div>
  `;

  card.addEventListener('click', () => openPlayer(ch));
  card.addEventListener('focus', () => updateHero(ch));
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPlayer(ch);
    }
    if (e.key === 'f' || e.key === 'F') {
      toggleFavorite(ch.id);
    }
  });

  // Long press for favorite
  let pressTimer;
  card.addEventListener('mousedown', () => {
    pressTimer = setTimeout(() => toggleFavorite(ch.id), 700);
  });
  card.addEventListener('mouseup', () => clearTimeout(pressTimer));

  return card;
}

function getChannelLogo(ch) {
  // Usar logo de Wikipedia o placeholder
  return ch.logo || `https://via.placeholder.com/120x60/222/fff?text=${encodeURIComponent(ch.name)}`;
}

// ============================================================
// HERO
// ============================================================
function updateHero(ch) {
  if (!ch) return;
  state.currentChannel = ch;

  document.getElementById('hero-title').textContent = ch.name;
  document.getElementById('hero-desc').textContent = ch.description;

  const bg = document.getElementById('hero-bg');
  bg.style.background = `linear-gradient(135deg, ${ch.color || '#1a1a2e'}88 0%, #141414 70%)`;

  const logoEl = document.getElementById('hero-channel-logo');
  logoEl.innerHTML = `<img src="${getChannelLogo(ch)}" alt="${ch.name}" style="height:48px;object-fit:contain;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.8))">`;

  document.getElementById('hero-play-btn').onclick = () => openPlayer(ch);
  document.getElementById('hero-info-btn').onclick = () => showToast(`📺 ${ch.name} - ${ch.category}`);
}

// ============================================================
// PLAYER
// ============================================================
function openPlayer(ch) {
  state.currentChannel = ch;
  state.inPlayer = true;

  const overlay = document.getElementById('player-overlay');
  overlay.classList.remove('hidden');

  document.getElementById('player-title').textContent = ch.name;
  document.getElementById('player-channel-name').textContent = ch.name;
  document.getElementById('player-channel-desc').textContent = ch.description;

  const loading = document.getElementById('player-loading');
  loading.style.display = 'flex';

  const iframe = document.getElementById('yt-player');
  iframe.src = '';

  // Usar la URL de 5900.tv directamente
  const streamUrl = ch.streamUrl || '';
  
  setTimeout(() => {
    iframe.src = streamUrl;
    loading.style.display = 'none';
  }, 800);

  // Focus al botón back
  setTimeout(() => document.getElementById('player-back').focus(), 100);

  // Scroll lock
  document.getElementById('app-main').style.overflow = 'hidden';
}

function closePlayer() {
  state.inPlayer = false;
  const overlay = document.getElementById('player-overlay');
  overlay.classList.add('hidden');
  
  const iframe = document.getElementById('yt-player');
  iframe.src = '';
  
  document.getElementById('app-main').style.overflow = '';
  focusFirst();
}

document.getElementById('player-back').addEventListener('click', closePlayer);

// ============================================================
// FAVORITES
// ============================================================
function toggleFavorite(id) {
  const idx = state.favorites.indexOf(id);
  if (idx > -1) {
    state.favorites.splice(idx, 1);
    showToast('Eliminado de favoritos');
  } else {
    state.favorites.push(id);
    showToast('⭐ Agregado a favoritos');
  }
  localStorage.setItem('ar-tv-favs', JSON.stringify(state.favorites));
  renderRows();
}

// ============================================================
// HEADER SCROLL
// ============================================================
document.getElementById('app-main').addEventListener('scroll', function() {
  const header = document.getElementById('app-header');
  header.classList.toggle('solid', this.scrollTop > 50);
});

// ============================================================
// NAV BUTTONS
// ============================================================
function setupNav() {
  // Already done in renderNav()
}

// ============================================================
// REMOTE CONTROL / KEYBOARD NAVIGATION
// ============================================================
function rebuildFocusGrid() {
  // Build a grid of focusable elements for D-pad navigation
  const rows = [];
  
  // Header nav row
  const navBtns = [...document.querySelectorAll('.header-nav .nav-btn')];
  if (navBtns.length) rows.push(navBtns);

  // Hero buttons
  const heroRow = [...document.querySelectorAll('.hero-buttons .focusable')];
  if (heroRow.length) rows.push(heroRow);

  // Channel card rows
  document.querySelectorAll('.cards-scroll').forEach(scroll => {
    const cards = [...scroll.querySelectorAll('.channel-card')];
    if (cards.length) rows.push(cards);
  });

  // Bottom nav
  const bottomBtns = [...document.querySelectorAll('.bottom-btn')];
  if (bottomBtns.length) rows.push(bottomBtns);

  state.focusGrid = rows;
  state.focusRow = 0;
  state.focusCol = 0;
}

function focusFirst() {
  rebuildFocusGrid();
  const heroBtn = document.querySelector('.hero-buttons .focusable');
  if (heroBtn) {
    state.focusRow = 1;
    state.focusCol = 0;
    heroBtn.focus();
  }
}

function focusElement(row, col) {
  const grid = state.focusGrid;
  if (!grid[row]) return;
  const rowEls = grid[row];
  const c = Math.max(0, Math.min(col, rowEls.length - 1));
  state.focusRow = row;
  state.focusCol = c;
  const el = rowEls[c];
  if (el) {
    el.focus({ preventScroll: false });
    el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }
}

function setupRemote() {
  document.addEventListener('keydown', handleKeyDown);
}

function handleKeyDown(e) {
  // Si el player está abierto, solo manejar Back/Escape
  if (state.inPlayer) {
    if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'GoBack') {
      e.preventDefault();
      closePlayer();
    }
    return;
  }

  // Si search está abierto
  if (!document.getElementById('search-overlay').classList.contains('hidden')) {
    if (e.key === 'Escape' || e.key === 'Backspace') {
      e.preventDefault();
      closeSearch();
    }
    return;
  }

  const { focusRow, focusCol, focusGrid } = state;

  switch (e.key) {
    case 'ArrowUp':
      e.preventDefault();
      if (focusRow > 0) {
        const prevRow = focusGrid[focusRow - 1];
        const col = Math.min(focusCol, prevRow.length - 1);
        focusElement(focusRow - 1, col);
      }
      break;

    case 'ArrowDown':
      e.preventDefault();
      if (focusRow < focusGrid.length - 1) {
        const nextRow = focusGrid[focusRow + 1];
        const col = Math.min(focusCol, nextRow.length - 1);
        focusElement(focusRow + 1, col);
      }
      break;

    case 'ArrowLeft':
      e.preventDefault();
      if (focusCol > 0) {
        focusElement(focusRow, focusCol - 1);
      }
      break;

    case 'ArrowRight':
      e.preventDefault();
      if (focusGrid[focusRow] && focusCol < focusGrid[focusRow].length - 1) {
        focusElement(focusRow, focusCol + 1);
      }
      break;

    case 'Enter':
    case ' ':
      // Let the element handle it naturally
      break;

    case 'Backspace':
    case 'Escape':
    case 'GoBack':
      e.preventDefault();
      // Nothing to go back to in main view
      break;

    // TV remote colored buttons
    case 'ColorF0Red':
    case 'r':
      openSearch();
      break;

    case 'F':
    case 'f':
      // Favorite current focused card
      break;
  }
}

// Track focus changes to update state
document.addEventListener('focusin', (e) => {
  if (state.inPlayer) return;
  const grid = state.focusGrid;
  for (let r = 0; r < grid.length; r++) {
    const c = grid[r].indexOf(e.target);
    if (c > -1) {
      state.focusRow = r;
      state.focusCol = c;
      break;
    }
  }
});

// ============================================================
// SEARCH
// ============================================================
function setupSearch() {
  const input = document.getElementById('search-input');
  
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    const results = document.getElementById('search-results');
    results.innerHTML = '';
    
    if (!q) return;
    
    const found = state.channels.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q)
    );
    
    found.forEach(ch => {
      const card = createCard(ch);
      results.appendChild(card);
    });
  });

  document.getElementById('search-close').addEventListener('click', closeSearch);
}

function openSearch() {
  document.getElementById('search-overlay').classList.remove('hidden');
  setTimeout(() => document.getElementById('search-input').focus(), 100);
}

function closeSearch() {
  document.getElementById('search-overlay').classList.add('hidden');
  document.getElementById('search-input').value = '';
  document.getElementById('search-results').innerHTML = '';
  focusFirst();
}

// ============================================================
// BOTTOM NAV
// ============================================================
function setupBottomNav() {
  document.getElementById('btn-home').addEventListener('click', () => {
    filterByCategory('all');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.nav-btn[data-cat="all"]')?.classList.add('active');
    document.getElementById('app-main').scrollTo({ top: 0, behavior: 'smooth' });
  });

  document.getElementById('btn-search').addEventListener('click', openSearch);

  document.getElementById('btn-favorites').addEventListener('click', () => {
    if (state.favorites.length === 0) {
      showToast('No tenés favoritos todavía. Mantené presionado un canal para agregar.');
      return;
    }
    // Scroll to fav row
    const favRow = document.querySelector('.channel-row[data-category="⭐ Mis Favoritos"]');
    if (favRow) {
      favRow.scrollIntoView({ behavior: 'smooth' });
    }
  });
}

// ============================================================
// TOAST
// ============================================================
function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.remove(), 3000);
}

// ============================================================
// FALLBACK CHANNELS (si el servidor falla)
// ============================================================
const FALLBACK_CHANNELS = [
  {
    id: 1, category: "Noticias", name: "TN", description: "Todo Noticias",
    logo: "", streamUrl: "https://5900.tv/tnok/", color: "#e30613"
  },
  {
    id: 2, category: "Noticias", name: "C5N", description: "Canal 5 Noticias",
    logo: "", streamUrl: "https://5900.tv/c5n-en-vivo/", color: "#005baa"
  },
  {
    id: 3, category: "Noticias", name: "LN+", description: "La Nación Más",
    logo: "", streamUrl: "https://5900.tv/la-nacion-ln-en-vivo-las-24-horas/", color: "#003087"
  },
];

// ============================================================
// START
// ============================================================
init();
