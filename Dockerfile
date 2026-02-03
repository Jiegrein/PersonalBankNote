# Multi-stage Dockerfile for Next.js application

# Stage 1: Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies for node-gyp
RUN apk add --no-cache python3 make g++

# Copy package files for better layer caching
COPY package.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Copy built assets and dependencies from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public

# Expose port
EXPOSE 3000

# Start production server
CMD ["npm", "start"]

# Stage 3: Development stage (for hot reload)
FROM node:22-alpine AS development

WORKDIR /app

# Install dependencies for node-gyp and OpenSSL for Prisma
RUN apk add --no-cache python3 make g++ openssl

# Copy package files
COPY package.json ./

# Install all dependencies
RUN npm install

# Copy prisma schema for generation
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Don't copy source code - it will be mounted via docker-compose volumes
# This prevents file timestamp conflicts that cause restart loops

# Expose port
EXPOSE 3000

# Start development server with host binding
CMD ["npm", "run", "dev"]
