#!/bin/bash

# Zaman damgası oluştur
TIMESTAMP=$(date "+%Y%m%d%H%M%S")

# Hata durumunda çıkış yap
set -e

echo "🚀 Namaz Vakti API dağıtım işlemi başlatılıyor - $TIMESTAMP"

# Cloud Run bölgesi
REGION=us-central1
SERVICE_NAME=namazvaktimapi
PROJECT_ID=namazvaktimapi-1453

# Docker imajı oluştur ve gönder
echo "🔨 Docker imajı oluşturuluyor..."
docker build -t gcr.io/$PROJECT_ID/$SERVICE_NAME:latest .
docker build -t gcr.io/$PROJECT_ID/$SERVICE_NAME:$TIMESTAMP .

echo "☁️ Docker imajı Google Container Registry'ye gönderiliyor..."
docker push gcr.io/$PROJECT_ID/$SERVICE_NAME:latest
docker push gcr.io/$PROJECT_ID/$SERVICE_NAME:$TIMESTAMP

# Cloud Run servisini güncelle
echo "🔄 Cloud Run servisi güncelleniyor..."
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME:$TIMESTAMP \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=3 \
  --project $PROJECT_ID \
  --port 8080

# Başarılı mesajı
echo "✅ Dağıtım tamamlandı! $TIMESTAMP"

# Servisi kontrol et
gcloud run services describe $SERVICE_NAME --region $REGION --format="value(status.url)" --project $PROJECT_ID 