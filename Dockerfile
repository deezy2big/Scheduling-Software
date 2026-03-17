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
RUN cd server && npm install --production
COPY server/ ./server/
COPY --from=build-frontend /app/client/dist ./client/dist

# Set environment variables
ENV PORT=8080
ENV NODE_ENV=production

# Expose port
EXPOSE 8080

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "server/index.js"]
