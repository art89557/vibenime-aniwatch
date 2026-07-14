FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js ./
# Jangan pin PORT — Render meng-inject PORT sendiri (default 10000); server.js
# baca process.env.PORT. Menanam ENV PORT bisa bentrok dgn routing Render.
ENV ANIWATCH_DOMAIN=hianime.to
EXPOSE 10000
CMD ["node", "server.js"]
