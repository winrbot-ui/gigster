# Fallback when Railway service Root Directory is repo root (not apps/backend).
# Prefer: @gigster/backend → Settings → Root Directory = apps/backend
FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

COPY apps/backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY apps/backend/app ./app

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
