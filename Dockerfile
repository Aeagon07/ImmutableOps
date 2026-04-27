# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY canteen-app/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY canteen-app/ .

# Build the app
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install serve to run the production build
RUN npm install -g serve

# Copy package files
COPY canteen-app/package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built app from builder stage
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 5173

# Start the app
CMD ["serve", "-s", "dist", "-l", "5173"]
