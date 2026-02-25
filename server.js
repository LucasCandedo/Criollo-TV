const express = require('express');
const cors = require('cors');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// API: canales
app.get('/api/channels', (req, res) => {
  res.json(channels);
});

// API: obtener stream URL de YouTube
app.get('/api/stream/:channelId', async (req, res) => {
  const { channelId } = req.params;
  
  try {
    // Usar yt-dlp para obtener el stream m3u8
    const ytUrl = `https://www.youtube.com/channel/${channelId}/live`;
    
    // Comando yt-dlp para obtener la mejor URL de stream
    const { stdout } = await execPromise(
      `yt-dlp -f "best[ext=mp4]" -g "${ytUrl}"`,
      { timeout: 10000 }
    );
    
    const streamUrl = stdout.trim();
    
    if (streamUrl) {
      res.json({ success: true, streamUrl });
    } else {
      res.json({ success: false, error: 'No stream available' });
    }
  } catch (error) {
    console.error('Error getting stream:', error);
    res.json({ success: false, error: error.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`CriolloTV running on port ${PORT}`);
});

const channels = [
  {
    id: 1,
    category: "Noticias",
    name: "TN",
    description: "Todo Noticias",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/TN_Todo_Noticias.svg/200px-TN_Todo_Noticias.svg.png",
    youtubeChannelId: "UCimi4_HyFgJc3pDGGR3oFsg",
    streamUrl: "https://5900.tv/tnok/",
    color: "#e30613"
  },
  {
    id: 2,
    category: "Noticias",
    name: "LN+",
    description: "La Nación Más",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/LN%2B_logo.svg/200px-LN%2B_logo.svg.png",
    youtubeChannelId: "UCVzLMTBl7wZEFRHaQKHQqNQ",
    streamUrl: "https://5900.tv/la-nacion-ln-en-vivo-las-24-horas/",
    color: "#003087"
  },
  {
    id: 3,
    category: "Noticias",
    name: "C5N",
    description: "Canal 5 Noticias",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/C5N_logo.svg/200px-C5N_logo.svg.png",
    youtubeChannelId: "UCqbfHvFBe7KH4tFHNYHm5CA",
    streamUrl: "https://5900.tv/c5n-en-vivo/",
    color: "#005baa"
  },
  {
    id: 4,
    category: "Noticias",
    name: "A24",
    description: "América 24",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/A24-logo.png/200px-A24-logo.png",
    youtubeChannelId: "UCHlLDz95bEp6pDlr0hCjijA",
    streamUrl: "https://5900.tv/a24/",
    color: "#e4002b"
  },
  {
    id: 5,
    category: "Noticias",
    name: "Crónica TV",
    description: "Noticias urgentes",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Cronica_TV_logo.svg/200px-Cronica_TV_logo.svg.png",
    youtubeChannelId: "UC_Zq5y4kEZGiNvJSTtl-6Ag",
    streamUrl: "https://5900.tv/cronica-tv/",
    color: "#cc0000"
  },
  {
    id: 6,
    category: "Noticias",
    name: "Canal 26",
    description: "Noticias argentinas",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Canal_26_logo.svg/200px-Canal_26_logo.svg.png",
    youtubeChannelId: "UCUfMNyL4CXbEBmKPVDqkfGg",
    streamUrl: "https://5900.tv/canal-26/",
    color: "#0066cc"
  },
  {
    id: 7,
    category: "Noticias",
    name: "Telefe",
    description: "Telefe en vivo",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Telefe_logo.svg/200px-Telefe_logo.svg.png",
    youtubeChannelId: "UCEqJ_wJXljEPoTRiUJFi6ow",
    streamUrl: "https://5900.tv/telefe/",
    color: "#009fe3"
  },
  {
    id: 8,
    category: "Noticias",
    name: "Canal 9",
    description: "Canal 9 en vivo",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Canal_9_Argentina_logo.svg/200px-Canal_9_Argentina_logo.svg.png",
    youtubeChannelId: "UCqbfHvFBe7KH4tFHNYHm5CA",
    streamUrl: "https://5900.tv/canal-9-en-vivo/",
    color: "#ff9900"
  }
];
