# ---------- Build Stage ----------
FROM node:18-alpine AS builder

WORKDIR /app

# 1) Copy only package files (better caching)
COPY canteen-app/package*.json ./

# 2) Install only required deps (lighter + faster)
RUN npm ci --omit=dev --no-audit --no-fund

# 3) Copy env file (needed for Vite build)
COPY canteen-app/.env .env

# 4) Copy rest of the app
COPY canteen-app/ .

# 5) Build with LIMITED memory (prevents OOM)
RUN export $(cat .env | xargs) && NODE_OPTIONS="--max-old-space-size=384" npm run build


# ---------- Production Stage ----------
FROM node:18-alpine

WORKDIR /app

# Lightweight static server
RUN npm install -g serve

# Copy only built files (small image)
COPY --from=builder /app/dist ./dist

# Expose app port
EXPOSE 5173

# Run app
CMD ["npx", "serve", "-s", "dist", "-l", "5173"]