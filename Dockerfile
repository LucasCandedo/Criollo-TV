FROM python:3.11-slim

# Dependencias del sistema para flet-video y multimedia
RUN apt-get update && apt-get install -y \
    libgstreamer1.0-0 \
    gstreamer1.0-plugins-base \
    gstreamer1.0-plugins-good \
    libmpv-dev \
    mpv \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8080

CMD ["flet", "run", "--web", "--port", "8080", "app.py"]
```

**3. `.dockerignore`** — para no subir archivos innecesarios:
```
__pycache__/
*.pyc
.env
.venv
venv/
.git/