import flet as ft
from flet_video import Video, VideoMedia
from config import CHANNEL_SECTIONS
from scraper import (
    obtener_youtube_id_from_page,
    obtener_calidades,
    obtener_stream_desde_canal_youtube,
)
import asyncio


async def main(page: ft.Page):
    page.title = "CriolloTV"
    page.window_full_screen = True
    page.bgcolor = "#141414"
    page.padding = 20
    player = None
    calidades_disponibles = {}
    control_timer = None
    controles_container = None

    # -------------------------
    # DETECTAR RESOLUCIÓN ÓPTIMA
    # -------------------------
    def calidad_optima():
        width = page.width or 1920

        if width >= 1920 and "1080p" in calidades_disponibles:
            return "1080p"
        if width >= 1280 and "720p" in calidades_disponibles:
            return "720p"
        if "480p" in calidades_disponibles:
            return "480p"

        return list(calidades_disponibles.keys())[0]

    # -------------------------
    # VOLVER
    # -------------------------
    def mostrar_grilla():
        page.controls.clear()
        page.add(construir_grilla())
        page.padding = 20
        page.update()

    # -------------------------
    # CAMBIAR CALIDAD
    # -------------------------
    def cambiar_calidad(e):
        nonlocal player
        calidad = e.control.value
        url = calidades_disponibles.get(calidad)

        if url and player:
            print(f"Cambiando a calidad: {calidad}")
            print(f"URL: {url[:80]}...")
            
            try:
                # Actualizar el playlist del reproductor
                player.playlist = [VideoMedia(resource=url)]
                player.update()
                print(f"✓ Calidad cambiada a {calidad}")
            except Exception as error:
                print(f"Error cambiando calidad: {error}")
                # Intentar reconstruir el reproductor
                try:
                    player.playlist_remove(0)
                    player.playlist_add(VideoMedia(resource=url))
                    player.update()
                except:
                    print("No se pudo cambiar la calidad")

    # -------------------------
    # CONTROLES AUTO-HIDE
    # -------------------------
    async def ocultar_controles_despues_delay():
        """Oculta los controles después de 5 segundos"""
        nonlocal control_timer
        
        # Cancelar timer anterior si existe
        if control_timer:
            control_timer.cancel()
        
        # Crear nuevo timer
        control_timer = asyncio.create_task(asyncio.sleep(5))
        
        try:
            await control_timer
            # Después de 5 segundos, ocultar controles
            if controles_container:
                controles_container.visible = False
                page.update()
        except asyncio.CancelledError:
            pass

    def mostrar_controles(e=None):
        """Muestra los controles y reinicia el timer"""
        if controles_container:
            controles_container.visible = True
            page.update()
            asyncio.create_task(ocultar_controles_despues_delay())

    # -------------------------
    # OBTENER VIDEO ID SEGÚN MÉTODO
    # -------------------------
    def obtener_video_id_por_metodo(canal: dict) -> str:
        """
        Obtiene el video ID usando el método especificado en la configuración
        """
        # Verificar si tiene método personalizado habilitado
        if canal.get("enabled") and canal.get("method"):
            method = canal["method"]
            
            if method == "youtube_channel":
                # Método: Canal de YouTube directo
                channel_id = canal.get("channel_id")
                if channel_id:
                    print(f"Usando método: youtube_channel con ID: {channel_id}")
                    resultado = obtener_stream_desde_canal_youtube(channel_id)
                    if resultado:
                        return resultado['video_id']
                    return None
            
            elif method == "custom_scraper":
                # Método: Scraper personalizado (futuro)
                custom_function = canal.get("custom_function")
                print(f"Usando método: custom_scraper - {custom_function}")
                return None
            
            elif method == "direct_url":
                # Método: URL directa del stream (futuro)
                stream_url = canal.get("stream_url")
                print(f"Usando método: direct_url - {stream_url}")
                return None
            
            else:
                print(f"Método desconocido: {method}")
                return None
        
        # Método por defecto: scraping automático
        print(f"Usando método: scraping automático desde {canal['url']}")
        return obtener_youtube_id_from_page(canal["url"])

    # -------------------------
    # PANTALLA DE CARGA
    # -------------------------
    def mostrar_pantalla_carga(nombre_canal: str, mensaje: str):
        """Muestra una pantalla de carga animada con mensaje"""
        page.controls.clear()
        page.add(
            ft.Container(
                content=ft.Column(
                    [
                        ft.ProgressRing(
                            width=80,
                            height=80,
                            stroke_width=6,
                            color=ft.Colors.BLUE_400,
                        ),
                        ft.Text(
                            nombre_canal,
                            size=32,
                            weight=ft.FontWeight.BOLD,
                            color="white",
                            text_align=ft.TextAlign.CENTER,
                        ),
                        ft.Text(
                            mensaje,
                            size=16,
                            color=ft.Colors.BLUE_200,
                            text_align=ft.TextAlign.CENTER,
                        ),
                    ],
                    alignment=ft.MainAxisAlignment.CENTER,
                    horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                    spacing=20,
                ),
                expand=True,
                alignment=ft.Alignment(0, 0)
            )
        )
        page.padding = 0
        page.margin = 0
        page.update()

    # -------------------------
    # REPRODUCIR
    # -------------------------
    async def reproducir_canal(nombre_canal: str):
        nonlocal player, calidades_disponibles, controles_container

        # Paso 1: Buscando canal
        mostrar_pantalla_carga(nombre_canal, "Buscando canal...")

        # Buscar canal en todas las secciones
        canal = None
        for seccion, canales in CHANNEL_SECTIONS.items():
            if nombre_canal in canales:
                canal = canales[nombre_canal]
                break

        if not canal:
            mostrar_grilla()
            return

        # Paso 2: Obteniendo stream
        mostrar_pantalla_carga(nombre_canal, "Conectando con el servidor...")
        await asyncio.sleep(0.1)  # Dar tiempo para actualizar UI

        # Obtener video ID usando el método configurado
        video_id = obtener_video_id_por_metodo(canal)
        
        if not video_id:
            # Mostrar mensaje de error
            page.controls.clear()
            page.add(
                ft.Container(
                    content=ft.Column(
                        [
                            ft.Icon(ft.Icons.ERROR_OUTLINE, size=64, color="red"),
                            ft.Text(
                                "No se pudo cargar el canal",
                                size=24,
                                weight=ft.FontWeight.BOLD,
                                color="white"
                            ),
                            ft.Text(
                                f"{nombre_canal} no está transmitiendo en vivo",
                                size=16,
                                color="white"
                            ),
                            ft.FilledButton(
                                "Volver",
                                on_click=lambda e: mostrar_grilla(),
                                style=ft.ButtonStyle(
                                    bgcolor=ft.Colors.BLUE_700,
                                    color=ft.Colors.WHITE,
                                )
                            )
                        ],
                        alignment=ft.MainAxisAlignment.CENTER,
                        horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                        spacing=20,
                    ),
                    expand=True,
                    alignment=ft.Alignment(0, 0)
                )
            )
            page.update()
            return

        # Paso 3: Obteniendo calidades
        mostrar_pantalla_carga(nombre_canal, "Cargando calidades de video...")
        await asyncio.sleep(0.1)

        calidades_disponibles = obtener_calidades(video_id)
        if not calidades_disponibles:
            # Mostrar mensaje si no hay calidades
            page.controls.clear()
            page.add(
                ft.Container(
                    content=ft.Column(
                        [
                            ft.Icon(ft.Icons.WARNING_AMBER, size=64, color="orange"),
                            ft.Text(
                                "No hay calidades disponibles",
                                size=24,
                                weight=ft.FontWeight.BOLD,
                                color="white"
                            ),
                            ft.Text(
                                "El stream no está disponible en este momento",
                                size=16,
                                color="white"
                            ),
                            ft.FilledButton(
                                "Volver",
                                on_click=lambda e: mostrar_grilla(),
                                style=ft.ButtonStyle(
                                    bgcolor=ft.Colors.BLUE_700,
                                    color=ft.Colors.WHITE,
                                )
                            )
                        ],
                        alignment=ft.MainAxisAlignment.CENTER,
                        horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                        spacing=20,
                    ),
                    expand=True,
                    alignment=ft.Alignment(0, 0)
                )
            )
            page.update()
            return

        # Paso 4: Iniciando reproducción
        mostrar_pantalla_carga(nombre_canal, "Iniciando reproducción...")
        await asyncio.sleep(0.3)

        calidad_inicial = calidad_optima()

        player = Video(
            expand=True,
            autoplay=True,
            show_controls=True,
            playlist=[
                VideoMedia(resource=calidades_disponibles[calidad_inicial])
            ],
        )

        selector = ft.Dropdown(
            options=[
                ft.dropdown.Option(
                    text=c,
                    key=c,
                ) for c in sorted(calidades_disponibles.keys(), key=lambda x: int(x.replace('p', '').replace('auto', '0')), reverse=True)
            ],
            value=calidad_inicial,
            width=130,
            height=45,
            bgcolor="#1f1f1f",
            color=ft.Colors.WHITE,
            border_color=ft.Colors.BLUE_400,
            border_width=2,
            border_radius=8,
            text_style=ft.TextStyle(
                color=ft.Colors.WHITE,
                size=15,
                weight=ft.FontWeight.BOLD,
            ),
        )

        selector.on_change = cambiar_calidad

        boton_volver = ft.Container(
            content=ft.Row(
                [ft.IconButton(
            icon=ft.Icons.ARROW_BACK,
            icon_size=30,
            on_click=lambda e: mostrar_grilla(),
            style=ft.ButtonStyle(
                bgcolor=ft.Colors.BLACK54,
                color=ft.Colors.WHITE,
            )
        ), ft.Text(nombre_canal, size=18, color=ft.Colors.WHITE, weight=ft.FontWeight.BOLD)],
            spacing=10,
        ))
        
        # Controles (auto-hide abajo)
        controles_container = ft.Container(
            content=ft.Row(
                [
                    boton_volver,
                    ft.Row(
                        [
                            ft.Text(
                                "Calidad:",
                                size=16,
                                color=ft.Colors.WHITE,
                                weight=ft.FontWeight.BOLD,
                            ),
                            selector,
                        ],
                        spacing=10,
                    )
                ],
                alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
            ),
            bgcolor=ft.Colors.BLACK54,
            padding=15,
            border_radius=10,
            margin=ft.margin.only(left=10, right=10, bottom=10),
            visible=True,  # Inicialmente visible
        )

        # Stack con video y overlays
        video_stack = ft.Stack(
            [
                player,
                # Nombre del canal (arriba)
                ft.Container(
                    content=[],
                    alignment=ft.Alignment.TOP_CENTER,
                    padding=ft.padding.only(top=20),
                ),
                # Controles (abajo)
                ft.Container(
                    content=controles_container,
                    alignment=ft.Alignment.BOTTOM_CENTER,
                ),
            ],
            expand=True,
        )

        page.controls.clear()
        page.add(video_stack)
        page.update()

        # Configurar eventos para mostrar controles con teclado
        def on_keyboard(e):
            mostrar_controles()
        
        page.on_keyboard_event = on_keyboard
        
        # Iniciar timer para ocultar controles
        await ocultar_controles_despues_delay()

    async def abrir_canal(e):
        await reproducir_canal(e.control.data)

    # -------------------------
    # TARJETA CON HOVER MEJORADO
    # -------------------------
    def hover_effect(e):
        # Cambiar color de fondo en hover: #1f1f1f -> #2f2f2f
        if e.data == "true":
            e.control.bgcolor = "#2f2f2f"
            e.control.scale = 1.05
        else:
            e.control.bgcolor = "#1f1f1f"
            e.control.scale = 1.0
        e.control.update()

    def tarjeta_canal(nombre, data):
        return ft.Container(
            width=220,
            height=180,
            bgcolor="#1f1f1f",
            border_radius=12,
            padding=10,
            data=nombre,
            on_click=abrir_canal,
            on_hover=hover_effect,
            animate=200,  # Duración de animación en ms
            animate_scale=200,  # Duración de animación de escala
            content=ft.Column(
                [
                    ft.Image(
                        src=data["logo"],
                        height=100,
                        fit=ft.BoxFit.CONTAIN,
                    ),
                    ft.Text(
                        nombre,
                        color="white",
                        size=16,
                        weight=ft.FontWeight.BOLD,
                        text_align=ft.TextAlign.CENTER,
                    ),
                ],
                alignment=ft.MainAxisAlignment.CENTER,
                horizontal_alignment=ft.CrossAxisAlignment.CENTER,
            ),
        )

    # -------------------------
    # CONSTRUIR GRILLA CON SECCIONES
    # -------------------------
    def construir_grilla():
        controles = []

        for seccion, canales in CHANNEL_SECTIONS.items():
            tarjetas = [
                tarjeta_canal(nombre, data)
                for nombre, data in canales.items()
            ]

            controles.append(
                ft.Column(
                    [
                        ft.Text(
                            seccion,
                            size=32,
                            weight=ft.FontWeight.BOLD,
                            color="white",
                        ),
                        ft.GridView(
                            expand=True,
                            max_extent=250,
                            spacing=20,
                            run_spacing=20,
                            controls=tarjetas,
                        ),
                        ft.Divider(height=30, color="#141414"),
                    ],
                    scroll="auto"
                )
            )

        # Column principal con scroll vertical
        return ft.Column(
            controles,
            scroll="auto",
            expand=True
        )

    mostrar_grilla()


ft.app(main, assets_dir="assets",)