FROM node:18-slim

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Uygulama port dinlemesi için 8080'i ekspoze ediyoruz (Cloud Run için standart)
EXPOSE 8080

# HTTP sunucusunu çalıştır
CMD ["node", "wrapper/server.js"] 