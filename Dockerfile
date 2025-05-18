FROM node:18-alpine

WORKDIR /app

# Hata ayıklama araçları
RUN apk add --no-cache curl

# Paket dosyalarını kopyala
COPY package*.json ./

# Bağımlılıkları yükle
RUN npm ci --only=production

# Tüm kaynak dosyalarını kopyala
COPY . .

# Ortam değişkenleri
ENV PORT=8080
ENV NODE_ENV=production

# Port'u görünür hale getir
EXPOSE 8080

# Sunucuyu başlat
CMD ["node", "src/index.js"] 