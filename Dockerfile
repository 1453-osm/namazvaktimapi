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
ENV TURSO_DATABASE_URL="libsql://namazvaktimdb-1453-osm.aws-us-east-1.turso.io"
ENV TURSO_AUTH_TOKEN="eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NDY4ODg0NjQsImlkIjoiMzg3MDQ0OTktMjcwZS00M2U1LWFiMTEtNjQ1ZDhmNDEzMWQwIiwicmlkIjoiZjUyYzNiYTQtMDUxZS00MDlmLThkOGUtODdkY2Q2NjdlYWI1In0.oKUkQ9I0kIz4dMWa94aqZy9ksNGIKRXYjGEx6medoi8zJ-Vu26-kozApR-8rrtH1RVDPzva3YC4-qzklVkAsAw"

# Port'u görünür hale getir
EXPOSE 8080

# Uygulamayı başlat
CMD ["node", "src/index.js"] 