FROM node:18-alpine

WORKDIR /app

# Express ve CORS modüllerini kur
RUN npm install express cors

# Sadece index.js dosyasını kopyala
COPY src/index.js ./index.js

# Ortam değişkenlerini ayarla
ENV PORT=8080
ENV NODE_ENV=production

# Port'u görünür hale getir
EXPOSE 8080

# Uygulamayı başlat
CMD ["node", "index.js"] 