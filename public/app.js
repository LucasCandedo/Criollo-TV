// ============================================================
// CriolloTV - Minimalista optimizado para TV Box
// ============================================================

const state = {
  channels: [],
  currentChannel: null,
  focusedIndex: 0,
  inPlayer: false
};

// ============================================================
// INIT
// ============================================================
async function init() {
  // Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
  }

  await loadChannels();
  renderChannels();
  setupNavigation();
  focusCard(0);
}

// ============================================================
// DATA
// ============================================================
async function loadChannels() {
  try {
    const response = await fetch('/api/channels');
    state.channels = await response.json();
  } catch (error) {
    console.error('Error loading channels:', error);
    // Fallback channels
    state.channels = [
      {
        id: 1,
        name: "TN",
        description: "Todo Noticias",
        logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/TN_Todo_Noticias.svg/200px-TN_Todo_Noticias.svg.png",
        streamUrl: "https://5900.tv/tnok/",
        color: "#e30613"
      },
      {
        id: 2,
        name: "C5N",
        description: "Canal 5 Noticias",
        logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/C5N_logo.svg/200px-C5N_logo.svg.png",
        streamUrl: "https://5900.tv/c5n-en-vivo/",
        color: "#005baa"
      },
      {
        id: 3,
        name: "LN+",
        description: "La Nación Más",
        logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/LN%2B_logo.svg/200px-LN%2B_logo.svg.png",
        streamUrl: "https://5900.tv/la-nacion-ln-en-vivo-las-24-horas/",
        color: "#003087"
      }
    ];
  }
}

// ============================================================
// RENDER
// ============================================================
function renderChannels() {
  const grid = document.getElementById('channels-grid');
  grid.innerHTML = '';

  state.channels.forEach((channel, index) => {
    const card = document.createElement('div');
    card.className = 'channel-card';
    card.tabIndex = 0;
    card.dataset.index = index;

    card.innerHTML = `
      <img class="channel-logo" src="${channel.logo}" alt="${channel.name}" onerror="this.style.display='none'">
      <div class="channel-name">${channel.name}</div>
    `;

    card.addEventListener('click', () => openPlayer(channel));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openPlayer(channel);
      }
    });

    grid.appendChild(card);
  });
}

// ============================================================
// NAVIGATION
// ============================================================
function setupNavigation() {
  document.addEventListener('keydown', handleKeyDown);
  
  // Back button
  document.getElementById('back-btn').addEventListener('click', closePlayer);
  document.getElementById('back-btn').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      closePlayer();
    }
  });
}

function handleKeyDown(e) {
  if (state.inPlayer) {
    // En el player, solo manejar Back
    if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'GoBack') {
      e.preventDefault();
      closePlayer();
    }
    return;
  }

  // Navegación en la grilla
  const cards = document.querySelectorAll('.channel-card');
  const totalCards = cards.length;
  const cols = getGridColumns();
  const rows = Math.ceil(totalCards / cols);

  switch (e.key) {
    case 'ArrowUp':
      e.preventDefault();
      if (state.focusedIndex >= cols) {
        focusCard(state.focusedIndex - cols);
      }
      break;

    case 'ArrowDown':
      e.preventDefault();
      if (state.focusedIndex + cols < totalCards) {
        focusCard(state.focusedIndex + cols);
      }
      break;

    case 'ArrowLeft':
      e.preventDefault();
      if (state.focusedIndex % cols !== 0) {
        focusCard(state.focusedIndex - 1);
      }
      break;

    case 'ArrowRight':
      e.preventDefault();
      if ((state.focusedIndex + 1) % cols !== 0 && state.focusedIndex + 1 < totalCards) {
        focusCard(state.focusedIndex + 1);
      }
      break;

    case 'Enter':
    case ' ':
      e.preventDefault();
      const currentCard = cards[state.focusedIndex];
      if (currentCard) {
        openPlayer(state.channels[state.focusedIndex]);
      }
      break;
  }
}

function getGridColumns() {
  const width = window.innerWidth;
  if (width <= 600) return 1;
  if (width <= 1000) return 2;
  if (width <= 1400) return 3;
  return 4;
}

function focusCard(index) {
  const cards = document.querySelectorAll('.channel-card');
  if (cards[index]) {
    state.focusedIndex = index;
    cards[index].focus();
    cards[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// ============================================================
// PLAYER
// ============================================================
function openPlayer(channel) {
  state.currentChannel = channel;
  state.inPlayer = true;

  const playerView = document.getElementById('player-view');
  const playerFrame = document.getElementById('player-frame');
  
  // Actualizar info
  document.getElementById('player-channel-name').textContent = channel.name;
  
  // Cargar stream
  playerFrame.src = channel.streamUrl;
  
  // Mostrar player
  playerView.classList.remove('hidden');
  
  // Focus en botón back
  setTimeout(() => {
    document.getElementById('back-btn').focus();
  }, 100);
}

function closePlayer() {
  state.inPlayer = false;
  
  const playerView = document.getElementById('player-view');
  const playerFrame = document.getElementById('player-frame');
  
  // Ocultar player
  playerView.classList.add('hidden');
  
  // Detener stream
  playerFrame.src = '';
  
  // Volver a la grilla
  setTimeout(() => {
    focusCard(state.focusedIndex);
  }, 100);
}

// ============================================================
// START
// ============================================================
init();
