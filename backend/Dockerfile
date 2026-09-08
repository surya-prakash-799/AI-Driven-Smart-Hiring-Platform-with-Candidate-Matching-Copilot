FROM python:3.12-slim

WORKDIR /app

# Install system dependencies for psycopg2-binary and spaCy
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download spaCy English model
RUN python -m spacy download en_core_web_sm

# Copy application code
COPY . .

# Create required directories
RUN mkdir -p app/uploads app/extracted_data app/logs

EXPOSE 8000

CMD ["python", "run.py"]
