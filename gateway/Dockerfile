# Dockerfile del GATEWAY. Igual que el de la Clase 21.
FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8080
# Node resuelve nombres (catalogo, carrito...) con un pool de 4 hilos. Si hay servicios
# apagados, esas búsquedas tardan ~5 s y bloquean a las demás: le damos más hilos.
ENV UV_THREADPOOL_SIZE=64
# Docker pregunta cada 5 s si el servicio responde; compose usa esto en depends_on.
HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=5 \
  CMD wget -qO- http://127.0.0.1:8080/salud || exit 1
CMD ["node", "src/server.js"]
