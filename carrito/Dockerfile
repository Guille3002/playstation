# Dockerfile del microservicio CARRITO. Mismo patrón que catalogo y biblioteca.
FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 4004
# Docker pregunta cada 5 s si el servicio responde; compose usa esto en depends_on.
HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=5 \
  CMD wget -qO- http://127.0.0.1:4004/salud || exit 1
CMD ["node", "src/server.js"]
