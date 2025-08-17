# Imagen base oficial de Python
FROM python:3.10-slim

# Crear directorio de la app
WORKDIR /app

# Instalar dependencias del sistema necesarias para psycopg2
RUN apt-get update && apt-get install -y \
    libpq-dev gcc && \
    rm -rf /var/lib/apt/lists/*

# Copiar e instalar dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el resto de la aplicación
COPY . .

# Exponer puerto (Cloud Run ignora este EXPOSE, pero es buena práctica)
EXPOSE 8080

# Usar Gunicorn en lugar de Flask dev server
CMD exec gunicorn --bind :8080 --workers 2 --threads 8 --timeout 0 app:app
