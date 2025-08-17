# Imagen base ligera con Python 3.10
FROM python:3.10-slim

# Evita que Python guarde pyc y buffers
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Establecer directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema necesarias para psycopg2
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements y luego instalarlos
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el resto del proyecto
COPY . .

# Puerto que usará la app en Cloud Run
ENV PORT=8080

# Comando de inicio (Gunicorn en modo producción)
CMD exec gunicorn --bind :$PORT --workers 2 --threads 4 --timeout 0 app:app
