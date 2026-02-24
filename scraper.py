"""
Scraper Universal para CriolloTV
Soporta: 5900.tv, TDTChannels y otros sitios de streaming
"""
import requests
from bs4 import BeautifulSoup
from yt_dlp import YoutubeDL
import re
import json
from typing import Optional, Dict
from urllib.parse import urlparse


class StreamingScraper:
    """Scraper universal que detecta automáticamente el método apropiado"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
    
    def obtener_youtube_id(self, url: str) -> Optional[str]:
        """
        Método principal que intenta todas las estrategias
        para obtener el ID de YouTube
        """
        # Estrategia 1: Meta tags og:video (funciona en 5900.tv)
        video_id = self._extraer_desde_meta_tags(url)
        if video_id:
            return video_id
        
        # Estrategia 2: Iframes de YouTube
        video_id = self._extraer_desde_iframe(url)
        if video_id:
            return video_id
        
        # Estrategia 3: Buscar en todo el HTML
        video_id = self._extraer_desde_html(url)
        if video_id:
            return video_id
        
        # Estrategia 4: JSON APIs (para TDTChannels)
        domain = urlparse(url).netloc
        if 'tdtchannels' in domain:
            video_id = self._extraer_desde_tdtchannels(url)
            if video_id:
                return video_id
        
        return None
    
    def _extraer_desde_meta_tags(self, url: str) -> Optional[str]:
        """Extrae desde meta tags og:video (5900.tv)"""
        try:
            response = self.session.get(url, timeout=10)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Buscar meta tag og:video
            meta = soup.find('meta', property='og:video')
            if not meta:
                meta = soup.find('meta', attrs={'property': 'og:video:url'})
            if not meta:
                meta = soup.find('meta', attrs={'property': 'og:video:secure_url'})
            
            if meta:
                youtube_url = meta.get('content')
                if youtube_url:
                    return self._extraer_id_de_url(youtube_url)
            
            return None
            
        except Exception as e:
            print(f"Error en meta tags: {e}")
            return None
    
    def _extraer_desde_iframe(self, url: str) -> Optional[str]:
        """Extrae desde iframes de YouTube"""
        try:
            response = self.session.get(url, timeout=10)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Buscar todos los iframes
            iframes = soup.find_all('iframe')
            
            for iframe in iframes:
                src = iframe.get('src', '')
                if 'youtube.com' in src or 'youtu.be' in src:
                    video_id = self._extraer_id_de_url(src)
                    if video_id:
                        return video_id
            
            return None
            
        except Exception as e:
            print(f"Error en iframes: {e}")
            return None
    
    def _extraer_desde_html(self, url: str) -> Optional[str]:
        """Busca URLs de YouTube en todo el HTML"""
        try:
            response = self.session.get(url, timeout=10)
            
            patterns = [
                r'youtube\.com/embed/([a-zA-Z0-9_-]{11})',
                r'youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})',
                r'youtu\.be/([a-zA-Z0-9_-]{11})',
                r'videoId["\']?\s*[:=]\s*["\']([a-zA-Z0-9_-]{11})',
            ]
            
            for pattern in patterns:
                matches = re.findall(pattern, response.text)
                if matches:
                    return matches[0]
            
            return None
            
        except Exception as e:
            print(f"Error en HTML: {e}")
            return None
    
    def _extraer_desde_tdtchannels(self, url: str) -> Optional[str]:
        """Método específico para TDTChannels usando múltiples APIs"""
        try:
            # Extraer nombre del canal de la URL
            path_parts = urlparse(url).path.split('/')
            channel_name = path_parts[-1] if path_parts else None
            
            if not channel_name:
                return None
            
            channel_name = channel_name.strip('/')
            
            # Hardcoded channel IDs para canales conocidos
            # Puedes agregar más canales aquí con su Channel ID o handle
            KNOWN_CHANNELS = {
            }
            
            # Verificar si es un canal conocido
            if channel_name in KNOWN_CHANNELS:
                channel_id = KNOWN_CHANNELS[channel_name]
                print(f"Canal conocido detectado: {channel_name}")
                video_id = self._obtener_video_en_vivo_de_canal(channel_id)
                if video_id:
                    return video_id
            
            # Estrategia 1: API oficial de TDTChannels
            try:
                json_url = "https://www.tdtchannels.com/lists/tv.json"
                response = self.session.get(json_url, timeout=15)
                data = response.json()
                
                # Buscar en la lista de canales
                for channel in data.get("channels", []):
                    channel_name_clean = channel.get("name", "").replace(" ", "").lower()
                    url_name_clean = channel_name.replace(" ", "").lower()
                    
                    if channel_name_clean == url_name_clean:
                        # Buscar URLs de YouTube en las opciones
                        for option in channel.get("options", []):
                            stream_url = option.get("url", "")
                            video_id = self._extraer_id_de_url(stream_url)
                            if video_id:
                                return video_id
            except Exception as e:
                print(f"Estrategia 1 (API oficial) falló: {e}")
            
            # Estrategia 2: JSON de GitHub
            try:
                json_url = "https://raw.githubusercontent.com/LaQuay/TDTChannels/master/TELEVISION.json"
                response = self.session.get(json_url, timeout=15)
                text = response.text.strip()
                
                # Encontrar el inicio del JSON válido
                json_start = text.find('{')
                if json_start == -1:
                    json_start = text.find('[')
                
                if json_start != -1:
                    text = text[json_start:]
                
                data = json.loads(text)
                
                # Buscar el canal en diferentes estructuras
                channels_list = []
                
                if isinstance(data, dict):
                    if "countries" in data:
                        for country in data.get("countries", []):
                            for ambit in country.get("ambits", []):
                                channels_list.extend(ambit.get("channels", []))
                    elif "channels" in data:
                        channels_list = data.get("channels", [])
                elif isinstance(data, list):
                    channels_list = data
                
                # Buscar el canal específico
                for channel in channels_list:
                    channel_name_clean = channel.get("name", "").replace(" ", "").lower()
                    url_name_clean = channel_name.replace(" ", "").lower()
                    
                    if channel_name_clean == url_name_clean:
                        options = channel.get("options", [])
                        if not options:
                            options = channel.get("web", [])
                        
                        for option in options:
                            if isinstance(option, dict):
                                stream_url = option.get("url", "")
                            else:
                                stream_url = str(option)
                            
                            if stream_url:
                                video_id = self._extraer_id_de_url(stream_url)
                                if video_id:
                                    return video_id
                
            except Exception as e:
                print(f"Estrategia 2 (GitHub JSON) falló: {e}")
            
            return None
            
        except Exception as e:
            print(f"Error en TDTChannels: {e}")
            return None
    
    def _extraer_id_de_url(self, url: str) -> Optional[str]:
        """Extrae el ID de YouTube de diferentes formatos de URL"""
        if not url:
            return None
            
        patterns = [
            # Video IDs directo
            r'youtube\.com/embed/([a-zA-Z0-9_-]{11})',
            r'youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})',
            r'youtube\.com/v/([a-zA-Z0-9_-]{11})',
            r'youtu\.be/([a-zA-Z0-9_-]{11})',
            r'/live_stream/([a-zA-Z0-9_-]{11})',
            # Channel IDs (para streams en vivo)
            r'youtube\.com/channel/([a-zA-Z0-9_-]+)/live',
            r'youtube\.com/channel/([a-zA-Z0-9_-]+)/?$',
            r'youtube\.com/@([^/\?]+)/live',
            r'youtube\.com/@([^/\?]+)/?$',
            r'youtube\.com/c/([^/\?]+)/live',
            r'youtube\.com/c/([^/\?]+)/?$',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                video_or_channel_id = match.group(1)
                
                # Si parece un channel ID (más de 11 caracteres o empieza con UC)
                # intentar obtener el video en vivo actual
                if len(video_or_channel_id) > 11 or video_or_channel_id.startswith('UC'):
                    live_video_id = self._obtener_video_en_vivo_de_canal(video_or_channel_id)
                    if live_video_id:
                        return live_video_id
                
                return video_or_channel_id
        
        return None
    
    def _obtener_video_en_vivo_de_canal(self, channel_id: str) -> Optional[str]:
        """
        Intenta obtener el video en vivo actual de un canal de YouTube
        Soporta múltiples formatos de channel ID
        """
        try:
            # Si es un handle (@username), convertirlo
            if not channel_id.startswith('UC'):
                # Intentar con el handle directamente
                live_url = f"https://www.youtube.com/@{channel_id}/live"
            else:
                # Es un channel ID tradicional
                live_url = f"https://www.youtube.com/channel/{channel_id}/live"
            
            print(f"   Intentando obtener stream en vivo de: {live_url}")
            response = self.session.get(live_url, timeout=10)
            
            # Buscar el video ID en la página
            patterns = [
                r'"videoId":"([a-zA-Z0-9_-]{11})"',
                r'watch\?v=([a-zA-Z0-9_-]{11})',
                r'/live/([a-zA-Z0-9_-]{11})',
                r'embed/([a-zA-Z0-9_-]{11})',
            ]
            
            for pattern in patterns:
                matches = re.findall(pattern, response.text)
                if matches:
                    # Tomar el primer video ID encontrado
                    video_id = matches[0]
                    print(f"   ✓ Video en vivo encontrado: {video_id}")
                    return video_id
            
            print(f"   ✗ No se encontró stream en vivo activo")
            return None
            
        except Exception as e:
            print(f"   ✗ Error obteniendo video en vivo: {e}")
            return None


# ============================================
# INSTANCIA GLOBAL DEL SCRAPER
# ============================================
_scraper = StreamingScraper()


# ============================================
# FUNCIONES COMPATIBLES CON TU APP
# ============================================

def obtener_youtube_id_from_page(url: str) -> Optional[str]:
    """
    Obtiene el ID de YouTube de una página
    Compatible con tu código existente
    """
    return _scraper.obtener_youtube_id(url)


def obtener_calidades(video_id: str) -> Dict[str, str]:
    """
    Obtiene las calidades disponibles de un video de YouTube
    Compatible con tu código existente
    """
    url = f"https://www.youtube.com/watch?v={video_id}"
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
    }
    
    calidades = {}
    try:
        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            # Extraer formatos
            for formato in info.get('formats', []):
                height = formato.get('height')
                protocol = formato.get('protocol', '')
                
                # Filtrar por calidades específicas y protocolos de streaming
                if height and height >= 360:
                    if 'm3u8' in protocol or 'https' in protocol:
                        key = f"{height}p"
                        if key not in calidades:  # Primera URL de cada calidad
                            calidades[key] = formato.get('url')
        
        return calidades
            
    except Exception as e:
        print(f"Error extrayendo calidades: {e}")
        return {}


def obtener_stream_desde_canal_youtube(canal_url_o_id: str) -> Optional[Dict]:
    """
    NUEVA FUNCIÓN: Obtiene el stream en vivo directamente desde un canal de YouTube
    
    Parámetros:
        canal_url_o_id: URL del canal o Channel ID
        Ejemplos:
            - "UCQySZQ6rrgJXRuonMwIIGMA"
            - "https://www.youtube.com/@CartoonNetworkLA"
            - "https://www.youtube.com/channel/UCQySZQ6rrgJXRuonMwIIGMA"
    
    Retorna:
        Dict con video_id y calidades, o None si no hay stream activo
    """
    scraper = StreamingScraper()
    
    # Extraer el channel ID si es una URL
    if 'youtube.com' in canal_url_o_id:
        # Extraer de la URL
        match = re.search(r'channel/([a-zA-Z0-9_-]+)', canal_url_o_id)
        if match:
            channel_id = match.group(1)
        else:
            # Puede ser un handle @username
            match = re.search(r'@([a-zA-Z0-9_-]+)', canal_url_o_id)
            if match:
                channel_id = match.group(1)
            else:
                return None
    else:
        channel_id = canal_url_o_id
    
    # Obtener el video en vivo
    video_id = scraper._obtener_video_en_vivo_de_canal(channel_id)
    
    if not video_id:
        return None
    
    # Obtener las calidades
    calidades = obtener_calidades(video_id)
    
    return {
        'video_id': video_id,
        'calidades': calidades,
        'url_youtube': f"https://www.youtube.com/watch?v={video_id}"
    }
