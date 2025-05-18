FROM node:18-alpine

WORKDIR /app

# Hata ayıklama araçları
RUN apk add --no-cache curl

# Paket dosyalarını kopyala
COPY package*.json ./

# Bağımlılıkları yükle
RUN npm ci --only=production

# .env dosyası dışındaki tüm dosyaları kopyala
# Not: .dockerignore dosyasını kullanarak .env dosyasını otomatik olarak hariç tutabiliriz
COPY . .

# Cloud Run için doğru port değerini zorla
ENV PORT=8080
ENV NODE_ENV=production

# Port'u görünür hale getir
EXPOSE 8080

# Bilgilendirme ekle
RUN echo "PORT çevre değişkeni: $PORT"

# Sunucuyu başlat
CMD ["node", "src/index.js"] 