import flet as ft
from config import CHANNEL_SECTIONS
from scraper import (
    obtener_youtube_id_from_page,
    obtener_stream_desde_canal_youtube,
)
from urllib.parse import quote


async def main(page: ft.Page):
    page.title = "CriolloTV"
    page.bgcolor = "#141414"
    page.padding = 20

    base_url = page.url.rstrip("/")

    # -------------------------
    # ABRIR PLAYER
    # -------------------------
    async def abrir_player(video_id, nombre):
        nombre_encoded = quote(nombre, safe="")

        url = f"{base_url}/assets/player.html?v={video_id}&name={nombre_encoded}&back={base_url}"

        await page.launch_url(
            url,
            web_popup_window_name="_self",
        )

    # -------------------------
    # REPRODUCIR CANAL
    # -------------------------
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

        await abrir_player(video_id, nombre_canal)

    # -------------------------
    # TARJETA CANAL
    # -------------------------
    def tarjeta_canal(nombre, data):
        return ft.Container(
            width=220,
            height=180,
            bgcolor="#1f1f1f",
            border_radius=12,
            padding=10,
            data=nombre,
            on_click=lambda e: page.run_task(reproducir_canal, e.control.data),
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

    # -------------------------
    # GRILLA
    # -------------------------
    def mostrar_grilla():
        page.controls.clear()

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
            ]

            contenido.append(
                ft.GridView(
                    controls=tarjetas,
                    max_extent=250,
                    spacing=20,
                    run_spacing=20,
                )
            )

        page.add(ft.Column(contenido, scroll="auto", expand=True))
        page.update()

    mostrar_grilla()


ft.run(
    main,
    assets_dir="assets",
    port=8080,
    view=ft.AppView.WEB_BROWSER,
)