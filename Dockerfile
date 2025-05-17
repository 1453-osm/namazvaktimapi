FROM node:18-alpine

WORKDIR /app

# Paket dosyalarını kopyala
COPY package*.json ./

# Bağımlılıkları yükle (üretim için)
RUN npm ci --only=production

# Sadece gerekli dosyaları kopyala
COPY src/ ./src/
COPY .env.example ./.env

# Cloud Run environment variables için PORT değişkenini ayarla
ENV PORT=8080
ENV NODE_ENV=production

# Konteyner durumunu kontrol et (healthcheck'i yorumladık)
# HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

# PORT'u görünür hale getir
EXPOSE 8080

# Uygulamayı başlat
CMD ["node", "src/index.js"] 