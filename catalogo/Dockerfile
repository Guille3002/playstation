# Dockerfile del microservicio CATÁLOGO. Igual que el de la Clase 21.
FROM node:22-alpine
WORKDIR /app

# 1) Solo los manifiestos primero (aprovecha la caché de capas).
COPY package*.json ./
RUN npm install

# 2) El resto del código.
COPY . .

EXPOSE 4001
# Docker pregunta cada 5 s si el servicio responde; compose usa esto en depends_on.
HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=5 \
  CMD wget -qO- http://127.0.0.1:4001/salud || exit 1
CMD ["node", "src/server.js"]
