# Build Stage for Frontend
FROM node:20-slim AS build-frontend
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Final Stage for Backend
FROM node:20-slim
WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm install
COPY server/ ./server/
COPY --from=build-frontend /app/client/dist ./client/dist

ENV PORT=8080
EXPOSE 8080

CMD ["node", "server/index.js"]
