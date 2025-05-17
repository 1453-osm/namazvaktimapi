FROM node:18-alpine

WORKDIR /app

# Paket dosyalarını kopyala
COPY package*.json ./

# Bağımlılıkları yükle (üretim için)
RUN npm ci --only=production

# Kaynak dosyaları kopyala
COPY src/ ./src/

# Ortam değişkenlerini ayarla
ENV PORT=8080
ENV NODE_ENV=production
ENV DEBUG=true

# Port'u görünür hale getir
EXPOSE 8080

# Uygulamayı başlat
CMD ["node", "src/index.js"] 