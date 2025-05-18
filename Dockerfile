FROM node:18-alpine

WORKDIR /app

# Temel paketleri yükle (hata ayıklama için)
RUN apk add --no-cache curl wget

# Paket dosyalarını kopyala
COPY package*.json ./

# Bağımlılıkları yükle
RUN npm ci --only=production

# Kaynak dosyalarını kopyala
COPY src/ ./src/

# Ortam değişkenleri tanımla
ENV PORT=8080
ENV NODE_ENV=production

# Başlangıç gecikmesi nedeniyle Cloud Run için daha uzun timeout kullan
ENV STARTUP_TIMEOUT=60

# Port'u görünür hale getir
EXPOSE 8080

# Cloud Run sağlık kontrolü için uzun başlangıç süresi tanımla
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
  CMD wget -qO- http://localhost:$PORT/ || exit 1

# Hata ayıklama olanağı ekleyen başlangıç betiği
COPY <<EOF /app/start.sh
#!/bin/sh
echo "Başlatılıyor: NODE_ENV=${NODE_ENV}, PORT=${PORT}"
echo "Bellek Bilgisi:"
free -m
echo "İşlemci Bilgisi:"
cat /proc/cpuinfo | grep "model name" | head -1
echo "Uygulama Klasörü İçeriği:"
ls -la /app
echo "Uygulamayı başlatıyorum: node src/index.js"
exec node src/index.js
EOF

RUN chmod +x /app/start.sh

# Başlangıç betiğini çalıştır
CMD ["/app/start.sh"] 