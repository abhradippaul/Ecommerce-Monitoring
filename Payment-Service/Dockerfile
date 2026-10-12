FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app

RUN groupadd -r appgroup && useradd -r -g appgroup appuser

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY app ./app
# COPY keys ./keys

RUN mkdir -p logs && chown -R appuser:appgroup /app

USER appuser

EXPOSE 3005 50055

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3005"]
