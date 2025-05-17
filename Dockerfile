FROM node:18-alpine

WORKDIR /app

# Paket dosyalarını kopyala
COPY package*.json ./

# Bağımlılıkları yükle (üretim için)
RUN npm ci --only=production

# Uygulama kodunu kopyala
COPY . .

# Cloud Run environment variables için PORT değişkenini ayarla
ENV PORT=8080
EXPOSE 8080

# Sağlık kontrolü için küçük bir bekleme ekle
CMD ["node", "src/index.js"] 