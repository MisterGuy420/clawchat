# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package.json and install deps
COPY package*.json ./
COPY server/server.js ./server/
RUN npm install

# Copy frontend and build it
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy server dependencies
COPY package*.json ./
RUN npm install --production

# Copy server code
COPY server/ ./server/

# Copy built frontend
COPY --from=builder /app/frontend/dist ./frontend/dist

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server/server.js"]
