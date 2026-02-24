const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// API: canales
app.get('/api/channels', (req, res) => {
  res.json(channels);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Argentina TV running on port ${PORT}`);
});

const channels = [
  {
    id: 1,
    category: "Noticias",
    name: "TN",
    description: "Todo Noticias - Canal 24h de noticias",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/TN_Todo_Noticias.svg/200px-TN_Todo_Noticias.svg.png",
    youtubeHandle: "@tnoficial",
    youtubeChannelId: "UCimi4_HyFgJc3pDGGR3oFsg",
    color: "#e30613"
  },
  {
    id: 2,
    category: "Noticias",
    name: "C5N",
    description: "Canal 5 Noticias - Información continua",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/C5N_logo.svg/200px-C5N_logo.svg.png",
    youtubeHandle: "@c5n",
    youtubeChannelId: "UCqbfHvFBe7KH4tFHNYHm5CA",
    color: "#005baa"
  },
  {
    id: 3,
    category: "Noticias",
    name: "LN+",
    description: "La Nación Más - Canal de La Nación",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/LN%2B_logo.svg/200px-LN%2B_logo.svg.png",
    youtubeHandle: "@lnmasnoticias",
    youtubeChannelId: "UCVzLMTBl7wZEFRHaQKHQqNQ",
    color: "#003087"
  },
  {
    id: 4,
    category: "Noticias",
    name: "A24",
    description: "América 24 - Noticias y análisis",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/A24-logo.png/200px-A24-logo.png",
    youtubeHandle: "@a24com",
    youtubeChannelId: "UCHlLDz95bEp6pDlr0hCjijA",
    color: "#e4002b"
  },
  {
    id: 5,
    category: "Noticias",
    name: "Crónica TV",
    description: "El canal de las noticias urgentes",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Cronica_TV_logo.svg/200px-Cronica_TV_logo.svg.png",
    youtubeHandle: "@cronicatv",
    youtubeChannelId: "UC_Zq5y4kEZGiNvJSTtl-6Ag",
    color: "#cc0000"
  },
  {
    id: 6,
    category: "Noticias",
    name: "Canal 26",
    description: "Noticias argentinas en vivo",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Canal_26_logo.svg/200px-Canal_26_logo.svg.png",
    youtubeHandle: "@canal26arg",
    youtubeChannelId: "UCUfMNyL4CXbEBmKPVDqkfGg",
    color: "#0066cc"
  },
  {
    id: 7,
    category: "Entretenimiento",
    name: "TV Pública",
    description: "Canal 7 - Televisión Pública Argentina",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/TV_P%C3%BAblica_Argentina.svg/200px-TV_P%C3%BAblica_Argentina.svg.png",
    youtubeHandle: "@tvpublicaargentina",
    youtubeChannelId: "UCiiDo8t4BEoBTW0RRq1mcRw",
    color: "#006633"
  },
  {
    id: 8,
    category: "Entretenimiento",
    name: "América TV",
    description: "Canal 2 - Entretenimiento y noticias",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Am%C3%A9rica_TV_Argentina_logo.svg/200px-Am%C3%A9rica_TV_Argentina_logo.svg.png",
    youtubeHandle: "@americatvarg",
    youtubeChannelId: "UC2S2nxlnM0eJEv3L72mJX8A",
    color: "#ff6600"
  },
  {
    id: 9,
    category: "Entretenimiento",
    name: "Telefe",
    description: "Telefe - El canal líder en audiencia",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Telefe_logo.svg/200px-Telefe_logo.svg.png",
    youtubeHandle: "@telefe",
    youtubeChannelId: "UCEqJ_wJXljEPoTRiUJFi6ow",
    color: "#009fe3"
  },
  {
    id: 10,
    category: "Deportes",
    name: "TyC Sports",
    description: "Deportes 24h - Fútbol y más",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/TyC_Sports_logo.svg/200px-TyC_Sports_logo.svg.png",
    youtubeHandle: "@tycsports",
    youtubeChannelId: "UCc2MmkyxYYfFBH1Gw_u-b6g",
    color: "#00a651"
  },
  {
    id: 11,
    category: "Deportes",
    name: "ESPN Argentina",
    description: "ESPN - Todo el deporte",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/ESPN_wordmark.svg/200px-ESPN_wordmark.svg.png",
    youtubeHandle: "@espnargentina",
    youtubeChannelId: "UCa_g67M_bSSF5_4pf0G7-Qw",
    color: "#d40000"
  },
  {
    id: 12,
    category: "Online",
    name: "Luzu TV",
    description: "El canal de streaming más popular",
    logo: "https://yt3.googleusercontent.com/EoBSBTlQV5SWGZ7V1N-F8dKSmqr_SuJVwFq4bABR5JHf4qsXSMEKmpbS0T5_I-L7sO0YhbBJRQ=s900-c-k-c0x00ffffff-no-rj",
    youtubeHandle: "@luzutv",
    youtubeChannelId: "UC6WFhBflWtxrFxhS4A5fERA",
    color: "#ff4500"
  },
  {
    id: 13,
    category: "Online",
    name: "Olga",
    description: "El nuevo canal de streaming",
    logo: "https://yt3.googleusercontent.com/ytc/AIdro_keBEWE7HU0rnp6q6kKBVMkLKQqhZxgpMJaLX4aXg=s900-c-k-c0x00ffffff-no-rj",
    youtubeHandle: "@olgaok",
    youtubeChannelId: "UCPJxMUMqGsRDWJDHs1_1Qew",
    color: "#8b00ff"
  },
  {
    id: 14,
    category: "Online",
    name: "Vorterix",
    description: "Contenido original y streaming",
    logo: "https://yt3.googleusercontent.com/ytc/AIdro_my0nA4PZB2_P6x4ztpL_JcDECB4T5CzBQc_uXiXQ=s900-c-k-c0x00ffffff-no-rj",
    youtubeHandle: "@vorterix",
    youtubeChannelId: "UCbqX-lSVQ8z2SofFJAtGiaw",
    color: "#ff0099"
  },
  {
    id: 15,
    category: "Cultura",
    name: "Encuentro",
    description: "Canal cultural y educativo",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Encuentro_logo.svg/200px-Encuentro_logo.svg.png",
    youtubeHandle: "@canalencuentro",
    youtubeChannelId: "UCFlcBQjfBHeTCW6wPHLb8EA",
    color: "#e67e22"
  }
];
