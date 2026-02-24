"""
Configuración de canales para CriolloTV
Todos los canales de noticias ahora usan youtube_channel
"""

CHANNEL_SECTIONS = {
    "Noticias en Vivo": {
        "TN": {
            "url": "https://www.youtube.com/@todonoticias/live",
            "logo": "images/tn.webp",
            "enabled": True,
            "method": "youtube_channel",
            "channel_id": "UCj6PcyLvpnIRT_2W_mwa9Aw"
        },
        "C5N": {
            "url": "https://www.youtube.com/@c5n/live",
            "logo": "images/c5n.webp",
            "enabled": True,
            "method": "youtube_channel",
            "channel_id": "UCFgk2Q2mVO1BklRQhSv6p0w"
        },
        "LN+": {
            "url": "https://www.youtube.com/@lanacionmas/live",
            "logo": "images/lnmas.webp",
            "enabled": True,
            "method": "youtube_channel",
            "channel_id": "UCba3hpU7EFBSk817y9qZkiA"
        },
        "A24": {
            "url": "https://www.youtube.com/@A24COM/live",
            "logo": "images/a24.webp",
            "enabled": True,
            "method": "youtube_channel",
            "channel_id": "UCR9120YBAqMfntqgRTKmkjQ"
        },
        "Telefe Noticias": {
            "url": "https://www.youtube.com/@Telefenoticias/live",
            "logo": "images/telefe_noticias.webp",
            "enabled": True,
            "method": "youtube_channel",
            "channel_id": "UChxGASjdNEYHhVKpl667Huw"
        },
        "Cronica TV": {
            "url": "https://www.youtube.com/@cronicatv/live",
            "logo": "images/cronica.webp",
            "enabled": True,
            "method": "youtube_channel",
            "channel_id": "UCT7KFGv6s2a-rh2Jq8ZdM1g"
        },
        "Canal 26": {
            "url": "https://www.youtube.com/@canal26/live",
            "logo": "images/canal26.webp",
            "enabled": True,
            "method": "youtube_channel",
            "channel_id": "UCrpMfcQNog595v5gAS-oUsQ"
        },
        "Canal 9": {
            "url": "https://www.youtube.com/@canal9oficial/live",
            "logo": "images/el_nueve.webp",
            "enabled": True,
            "method": "youtube_channel",
            "channel_id": "UCO2ZvU5_VdSt3F55DF8UZRA"
        },
    },
    
    "Dibujos Animados": {
        "Cartoon Network": {
            "url": "https://www.youtube.com/@CartoonLA/live",
            "logo": "images/cartoon_network.webp",
            "enabled": True,
            "method": "youtube_channel",
            "channel_id": "UCQySZQ6rrgJXRuonMwIIGMA"
        },
    },
}
