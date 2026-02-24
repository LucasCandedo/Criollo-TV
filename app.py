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

    # URL base real del sitio (funciona en Railway)
    base_url = page.url.rstrip("/")

    # -------------------------
    # GRILLA DE CANALES
    # -------------------------
    def mostrar_grilla():
        page.controls.clear()

        secciones = []

        for seccion, canales in CHANNEL_SECTIONS.items():
            tarjetas = []

            for nombre, data in canales.items():
                tarjetas.append(
                    ft.Container(
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
                )

            secciones.append(
                ft.Text(seccion, size=30, weight=ft.FontWeight.BOLD, color="white")
            )

            secciones.append(
                ft.GridView(
                    controls=tarjetas,
                    max_extent=250,
                    spacing=20,
                    run_spacing=20,
                )
            )

        page.add(ft.Column(secciones, scroll="auto", expand=True))
        page.update()

    # -------------------------
    # ABRIR CANAL
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

        # STREAM EN VIVO DESDE CANAL
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

        player_url = f"{base_url}/assets/player.html?v={video_id}&name={nombre_encoded}&back=/"

        await page.launch_url(
            player_url,
            web_popup_window_name="_self",
        )

    mostrar_grilla()


ft.run(
    main,
    assets_dir="assets",
    port=8080,
    view=ft.AppView.WEB_BROWSER,
)