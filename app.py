import flet as ft
from config import CHANNEL_SECTIONS
from scraper import (
    obtener_youtube_id_from_page,
    obtener_stream_desde_canal_youtube,
)
from urllib.parse import quote, unquote


async def main(page: ft.Page):
    page.title = "CriolloTV"
    page.bgcolor = "#141414"
    page.padding = 0
    page.spacing = 0
    page.theme_mode = ft.ThemeMode.DARK

    # ==========================================================
    # REPRODUCIR CANAL (OBTENER VIDEO ID)
    # ==========================================================
    async def reproducir_canal(nombre_canal):

        canal = None

        for section in CHANNEL_SECTIONS.values():
            if nombre_canal in section:
                canal = section[nombre_canal]
                break

        if not canal:
            print("Canal no encontrado")
            return

        method = canal.get("method")

        if method == "youtube_channel":
            data = obtener_stream_desde_canal_youtube(
                canal.get("channel_id") or canal.get("url")
            )

            if not data:
                print("No hay stream en vivo")
                return

            video_id = data["video_id"]

        else:
            video_id = obtener_youtube_id_from_page(canal["url"])

            if not video_id:
                print("No se pudo obtener video ID")
                return

        print("✓ Video en vivo encontrado:", video_id)

        nombre_encoded = quote(nombre_canal, safe="")

        page.go(f"/player/{nombre_encoded}/{video_id}")

    # ==========================================================
    # TARJETA CANAL
    # ==========================================================
    def tarjeta_canal(nombre, data):
        return ft.Container(
            width=220,
            height=180,
            bgcolor="#1f1f1f",
            border_radius=12,
            padding=10,
            data=nombre,
            on_click=lambda e: page.run_task(
                reproducir_canal, e.control.data
            ),
            content=ft.Column(
                [
                    ft.Image(src=data["logo"], height=100),
                    ft.Text(
                        nombre,
                        color="white",
                        size=16,
                        text_align=ft.TextAlign.CENTER,
                    ),
                ],
                alignment=ft.MainAxisAlignment.CENTER,
                horizontal_alignment=ft.CrossAxisAlignment.CENTER,
            ),
        )

    # ==========================================================
    # VISTA HOME
    # ==========================================================
    def vista_home():

        contenido = []

        for seccion, canales in CHANNEL_SECTIONS.items():

            contenido.append(
                ft.Text(
                    seccion,
                    size=32,
                    weight=ft.FontWeight.BOLD,
                    color="white",
                )
            )

            tarjetas = [
                tarjeta_canal(nombre, data)
                for nombre, data in canales.items()
                if data.get("enabled", True)
            ]

            contenido.append(
                ft.GridView(
                    controls=tarjetas,
                    max_extent=250,
                    spacing=20,
                    run_spacing=20,
                )
            )

        return ft.View(
            "/",
            [
                ft.Container(
                    content=ft.Column(
                        contenido,
                        scroll="auto",
                        expand=True,
                    ),
                    padding=20,
                )
            ],
        )

    # ==========================================================
    # VISTA PLAYER
    # ==========================================================
    def vista_player(route_parts):

        if len(route_parts) < 4:
            return vista_home()

        nombre = unquote(route_parts[2])
        video_id = route_parts[3]

        youtube_embed = (
            f"https://www.youtube.com/embed/"
            f"{video_id}"
            f"?autoplay=1&mute=1&playsinline=1&rel=0"
        )

        return ft.View(
            f"/player/{route_parts[2]}/{video_id}",
            [
                ft.Stack(
                    [
                        ft.WebView(
                            url=youtube_embed,
                            expand=True,
                        ),
                        ft.Container(
                            content=ft.Row(
                                [
                                    ft.IconButton(
                                        icon=ft.Icons.ARROW_BACK,
                                        icon_color="white",
                                        on_click=lambda _: page.go("/"),
                                    ),
                                    ft.Text(
                                        nombre,
                                        color="white",
                                        size=20,
                                        weight=ft.FontWeight.BOLD,
                                    ),
                                ],
                                vertical_alignment=ft.CrossAxisAlignment.CENTER,
                            ),
                            bgcolor="#000000aa",
                            padding=20,
                        ),
                    ],
                    expand=True,
                )
            ],
            padding=0,
        )

    # ==========================================================
    # ROUTING
    # ==========================================================
    def route_change(e: ft.RouteChangeEvent):

        page.views.clear()

        route_parts = page.route.split("/")

        if page.route == "/":
            page.views.append(vista_home())

        elif page.route.startswith("/player"):
            page.views.append(vista_home())  # base
            page.views.append(vista_player(route_parts))

        else:
            page.views.append(vista_home())

        page.update()

    page.on_route_change = route_change
    page.go(page.route)


ft.app(
    target=main,
    assets_dir="assets",
    port=8080,
    view=ft.AppView.WEB_BROWSER,
)