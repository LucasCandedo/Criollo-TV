import flet as ft
from config import CHANNEL_SECTIONS
from scraper import (
    obtener_youtube_id_from_page,
    obtener_calidades,
    obtener_stream_desde_canal_youtube,
)
import asyncio

try:
    from flet_video import Video, VideoMedia
    FLET_VIDEO_DISPONIBLE = True
except ImportError:
    FLET_VIDEO_DISPONIBLE = False


async def main(page: ft.Page):
    page.title = "CriolloTV"
    page.window.full_screen = True
    page.bgcolor = "#141414"
    page.padding = 20
    player = None
    calidades_disponibles = {}
    control_timer = None
    controles_container = None
    es_web = page.web

    def calidad_optima():
        width = page.width or 1920
        if width >= 1920 and "1080p" in calidades_disponibles:
            return "1080p"
        if width >= 1280 and "720p" in calidades_disponibles:
            return "720p"
        if "480p" in calidades_disponibles:
            return "480p"
        return list(calidades_disponibles.keys())[0]

    def mostrar_grilla():
        page.controls.clear()
        page.add(construir_grilla())
        page.padding = 20
        page.update()

    def cambiar_calidad(e):
        nonlocal player
        calidad = e.control.value
        url = calidades_disponibles.get(calidad)
        if url and player:
            try:
                player.playlist = [VideoMedia(resource=url)]
                player.update()
            except Exception as error:
                print(f"Error cambiando calidad: {error}")
                try:
                    player.playlist_remove(0)
                    player.playlist_add(VideoMedia(resource=url))
                    player.update()
                except:
                    print("No se pudo cambiar la calidad")

    async def ocultar_controles_despues_delay():
        nonlocal control_timer
        if control_timer:
            control_timer.cancel()
        control_timer = asyncio.create_task(asyncio.sleep(5))
        try:
            await control_timer
            if controles_container:
                controles_container.visible = False
                page.update()
        except asyncio.CancelledError:
            pass

    def mostrar_controles(e=None):
        if controles_container:
            controles_container.visible = True
            page.update()
            asyncio.create_task(ocultar_controles_despues_delay())

    def obtener_video_id_por_metodo(canal: dict) -> str:
        if canal.get("enabled") and canal.get("method"):
            method = canal["method"]
            if method == "youtube_channel":
                channel_id = canal.get("channel_id")
                if channel_id:
                    resultado = obtener_stream_desde_canal_youtube(channel_id)
                    if resultado:
                        return resultado['video_id']
                    return None
            elif method == "direct_url":
                return canal.get("stream_url")
            else:
                return None
        return obtener_youtube_id_from_page(canal["url"])

    def mostrar_pantalla_carga(nombre_canal: str, mensaje: str):
        page.controls.clear()
        page.add(
            ft.Container(
                content=ft.Column(
                    [
                        ft.ProgressRing(width=80, height=80, stroke_width=6, color=ft.Colors.BLUE_400),
                        ft.Text(nombre_canal, size=32, weight=ft.FontWeight.BOLD, color="white", text_align=ft.TextAlign.CENTER),
                        ft.Text(mensaje, size=16, color=ft.Colors.BLUE_200, text_align=ft.TextAlign.CENTER),
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

    def mostrar_error(titulo, subtitulo):
        page.controls.clear()
        page.add(
            ft.Container(
                content=ft.Column(
                    [
                        ft.Icon(ft.Icons.ERROR_OUTLINE, size=64, color="red"),
                        ft.Text(titulo, size=24, weight=ft.FontWeight.BOLD, color="white"),
                        ft.Text(subtitulo, size=16, color="white"),
                        ft.FilledButton(
                            "Volver",
                            on_click=lambda e: mostrar_grilla(),
                            style=ft.ButtonStyle(bgcolor=ft.Colors.BLUE_700, color=ft.Colors.WHITE)
                        )
                    ],
                    alignment=ft.MainAxisAlignment.CENTER,
                    horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                    spacing=20,
                ),
                expand=True, alignment=ft.Alignment(0, 0)
            )
        )
        page.update()

    async def reproducir_canal(nombre_canal: str):
        nonlocal player, calidades_disponibles, controles_container

        mostrar_pantalla_carga(nombre_canal, "Buscando canal...")

        canal = None
        for seccion, canales in CHANNEL_SECTIONS.items():
            if nombre_canal in canales:
                canal = canales[nombre_canal]
                break

        if not canal:
            mostrar_grilla()
            return

        mostrar_pantalla_carga(nombre_canal, "Conectando con el servidor...")
        await asyncio.sleep(0.1)

        video_id = obtener_video_id_por_metodo(canal)

        if not video_id:
            mostrar_error("No se pudo cargar el canal", f"{nombre_canal} no está transmitiendo en vivo")
            return

        mostrar_pantalla_carga(nombre_canal, "Iniciando reproducción...")
        await asyncio.sleep(0.3)

        # WEB: redirigir a player.html
        if es_web:
            import urllib.parse
            nombre_encoded = urllib.parse.quote(nombre_canal)
            def obtener_base_url(page):
                url = page.url
                url = url.replace("ws://", "http://").replace("wss://", "https://")
                return url.split("/app")[0].rstrip("/")

            base_url = obtener_base_url(page)

            player_url = f"{base_url}/assets/player.html?v={video_id}&name={nombre_encoded}&back=/"

            await page.launch_url(player_url, web_popup_window_name="_self")
            return

        # DESKTOP: flet-video con calidades
        mostrar_pantalla_carga(nombre_canal, "Obteniendo calidades...")
        await asyncio.sleep(0.1)

        calidades_disponibles = obtener_calidades(video_id)

        if not calidades_disponibles:
            mostrar_error("No hay calidades disponibles", "El stream no está disponible en este momento")
            return

        calidad_inicial = calidad_optima()

        player = Video(
            expand=True, autoplay=True, show_controls=True,
            playlist=[VideoMedia(resource=calidades_disponibles[calidad_inicial])],
        )

        selector = ft.Dropdown(
            options=[
                ft.dropdown.Option(text=c, key=c)
                for c in sorted(calidades_disponibles.keys(), key=lambda x: int(x.replace('p', '').replace('auto', '0')), reverse=True)
            ],
            value=calidad_inicial,
            width=130, height=45, bgcolor="#1f1f1f", color=ft.Colors.WHITE,
            border_color=ft.Colors.BLUE_400, border_width=2, border_radius=8,
            text_style=ft.TextStyle(color=ft.Colors.WHITE, size=15, weight=ft.FontWeight.BOLD),
            on_change=cambiar_calidad,
        )

        boton_volver = ft.Container(
            content=ft.Row(
                [
                    ft.IconButton(
                        icon=ft.Icons.ARROW_BACK, icon_size=30,
                        on_click=lambda e: mostrar_grilla(),
                        style=ft.ButtonStyle(bgcolor=ft.Colors.BLACK54, color=ft.Colors.WHITE)
                    ),
                    ft.Text(nombre_canal, size=18, color=ft.Colors.WHITE, weight=ft.FontWeight.BOLD)
                ],
                spacing=10,
            )
        )

        controles_container = ft.Container(
            content=ft.Row(
                [
                    boton_volver,
                    ft.Row([ft.Text("Calidad:", size=16, color=ft.Colors.WHITE, weight=ft.FontWeight.BOLD), selector], spacing=10)
                ],
                alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
            ),
            bgcolor=ft.Colors.BLACK54, padding=15, border_radius=10,
            margin=ft.margin.only(left=10, right=10, bottom=10), visible=True,
        )

        video_stack = ft.Stack(
            [
                player,
                ft.Container(content=[], alignment=ft.Alignment.TOP_CENTER, padding=ft.padding.only(top=20)),
                ft.Container(content=controles_container, alignment=ft.Alignment.BOTTOM_CENTER),
            ],
            expand=True,
        )

        page.controls.clear()
        page.add(video_stack)
        page.update()

        page.on_keyboard_event = lambda e: mostrar_controles()
        await ocultar_controles_despues_delay()

    async def abrir_canal(e):
        await reproducir_canal(e.control.data)

    def hover_effect(e):
        e.control.bgcolor = "#2f2f2f" if e.data == "true" else "#1f1f1f"
        e.control.scale = 1.05 if e.data == "true" else 1.0
        e.control.update()

    def tarjeta_canal(nombre, data):
        return ft.Container(
            width=220, height=180, bgcolor="#1f1f1f", border_radius=12, padding=10,
            data=nombre, on_click=abrir_canal, on_hover=hover_effect,
            animate=200, animate_scale=200,
            content=ft.Column(
                [
                    ft.Image(src=data["logo"], height=100, fit=ft.BoxFit.CONTAIN),
                    ft.Text(nombre, color="white", size=16, weight=ft.FontWeight.BOLD, text_align=ft.TextAlign.CENTER),
                ],
                alignment=ft.MainAxisAlignment.CENTER,
                horizontal_alignment=ft.CrossAxisAlignment.CENTER,
            ),
        )

    def construir_grilla():
        controles = []
        for seccion, canales in CHANNEL_SECTIONS.items():
            tarjetas = [tarjeta_canal(nombre, data) for nombre, data in canales.items()]
            controles.append(
                ft.Column(
                    [
                        ft.Text(seccion, size=32, weight=ft.FontWeight.BOLD, color="white"),
                        ft.GridView(expand=True, max_extent=250, spacing=20, run_spacing=20, controls=tarjetas),
                        ft.Divider(height=30, color="#141414"),
                    ],
                    scroll="auto"
                )
            )
        return ft.Column(controles, scroll="auto", expand=True)

    mostrar_grilla()


ft.run(main, assets_dir="assets", view=ft.AppView.WEB_BROWSER, port=8080)
