# Stage 1: Build client
FROM node:22-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Build server
FROM node:22-alpine AS server-build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

# Stage 3: Runtime
FROM node:22-alpine
WORKDIR /app

# Install production server deps
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# Copy compiled server
COPY --from=server-build /app/server/dist ./server/dist

# Copy built client (server serves this as static files)
COPY --from=client-build /app/client/dist ./client/dist

EXPOSE 3001
ENV NODE_ENV=production

CMD ["node", "server/dist/index.js"]
